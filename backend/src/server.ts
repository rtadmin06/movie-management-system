import express, { Application, Request, Response } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import { createWorker } from 'tesseract.js';

import Movie from './models/Movie';
import User from './models/User';
import { Comment } from './models/Comment';
import { Favorite } from './models/Favorite';
import { authenticateToken, AuthRequest } from './middleware/auth';

dotenv.config();
const app: Application = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/movie_management';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/images', express.static(path.join(__dirname, '../../crawler/data/images')));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

const connectDB = async () => {
  const maxRetries = 3;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      console.log(`正在连接 MongoDB... (尝试 ${retries + 1}/${maxRetries})`);
      
      await mongoose.connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 10000,
        maxPoolSize: 10,
        minPoolSize: 2,
      });
      
      console.log('✓ MongoDB connected successfully');
      return;
    } catch (error: any) {
      retries++;
      console.error(`✗ MongoDB 连接失败 (尝试 ${retries}/${maxRetries})`);
      console.error(`错误: ${error.message}`);
      
      if (retries < maxRetries) {
        console.log(`等待 3 秒后重试...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      } else {
        console.error('✗ MongoDB 连接失败，已达到最大重试次数');
        console.error('提示：请确保 MongoDB 正在运行: mongod --dbpath "C:\\data\\db"');
      }
    }
  }
};

connectDB();

app.post('/api/auth/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password, email } = req.body;

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      res.status(400).json({ message: '用户名已存在' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      username,
      password: hashedPassword,
      email
    });

    await user.save();
    res.status(201).json({ message: '注册成功', userId: user._id });
  } catch (error: any) {
    res.status(500).json({ message: '注册失败', error: error.message });
  }
});

app.post('/api/auth/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) {
      res.status(401).json({ message: '用户名或密码错误' });
      return;
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      res.status(401).json({ message: '用户名或密码错误' });
      return;
    }

    const token = jwt.sign(
      { id: user._id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: '登录成功',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: '登录失败', error: error.message });
  }
});

app.get('/api/movies', async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string || '';
    const genre = req.query.genre as string || '';
    const sortBy = req.query.sortBy as string || 'rank';
    const order = req.query.order as string || 'asc';

    let query: any = {};

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { originalTitle: { $regex: search, $options: 'i' } },
        { directors: { $regex: search, $options: 'i' } },
        { actors: { $regex: search, $options: 'i' } }
      ];
    }

    if (genre) {
      query.genres = genre;
    }

    const sortOptions: any = {};
    sortOptions[sortBy] = order === 'asc' ? 1 : -1;

    const total = await Movie.countDocuments(query);
    const movies = await Movie.find(query)
      .sort(sortOptions)
      .skip((page - 1) * limit)
      .limit(limit);
    
    res.json({
      movies,
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (error: any) {
    res.status(500).json({ message: '获取电影列表失败', error: error.message });
  }
});

app.get('/api/movies/fulltext-search', async (req: Request, res: Response): Promise<void> => {
  try {
    const query = req.query.q as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    if (!query) {
      res.status(400).json({ message: '请提供搜索关键词' });
      return;
    }

    const movies = await Movie.find(
      { $text: { $search: query } },
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' } })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Movie.countDocuments({ $text: { $search: query } });

    res.json({
      movies,
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (error: any) {
    res.status(500).json({ message: '全文检索失败', error: error.message });
  }
});

app.get('/api/movies/advanced-search', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      title,
      genre,
      year,
      minRating,
      maxRating,
      country,
      director,
      actor,
      page = '1',
      limit = '20'
    } = req.query;

    let query: any = {};

    if (title) query.title = { $regex: title, $options: 'i' };
    if (genre) query.genres = genre;
    if (year) query.year = parseInt(year as string);
    if (minRating || maxRating) {
      query.rating = {};
      if (minRating) query.rating.$gte = parseFloat(minRating as string);
      if (maxRating) query.rating.$lte = parseFloat(maxRating as string);
    }
    if (country) query.countries = { $regex: country, $options: 'i' };
    if (director) query.directors = { $regex: director, $options: 'i' };
    if (actor) query.actors = { $regex: actor, $options: 'i' };

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const total = await Movie.countDocuments(query);
    const movies = await Movie.find(query)
      .sort({ rank: 1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);
    
    res.json({
      movies,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum)
    });
  } catch (error: any) {
    res.status(500).json({ message: '高级搜索失败', error: error.message });
  }
});

app.get('/api/movies/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) {
      res.status(404).json({ message: '电影不存在' });
      return;
    }
    res.json(movie);
  } catch (error: any) {
    res.status(500).json({ message: '获取电影详情失败', error: error.message });
  }
});

app.post('/api/movies', authenticateToken, upload.single('image'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const movieData = req.body;
    
    if (req.file) {
      movieData.localCoverPath = `./uploads/${req.file.filename}`;
    }

    ['directors', 'actors', 'genres', 'countries', 'aka'].forEach(field => {
      if (typeof movieData[field] === 'string') {
        movieData[field] = movieData[field].split(',').map((s: string) => s.trim());
      }
    });

    if (!movieData.rank || movieData.rank <= 0) {
      const maxRankMovie = await Movie.findOne().sort({ rank: -1 }).limit(1);
      movieData.rank = maxRankMovie ? maxRankMovie.rank + 1 : 1;
      console.log(`自动分配rank: ${movieData.rank}`);
    } else {
      const existingMovie = await Movie.findOne({ rank: movieData.rank });
      if (existingMovie) {
        res.status(400).json({ 
          message: `排名 ${movieData.rank} 已被电影《${existingMovie.title}》占用，请使用其他排名或留空自动分配` 
        });
        return;
      }
    }

    const movie = new Movie(movieData);
    await movie.save();

    res.status(201).json({ message: '电影添加成功', movie });
  } catch (error: any) {
    console.error('添加电影错误:', error);
    res.status(500).json({ message: '添加电影失败', error: error.message });
  }
});

app.put('/api/movies/:id', authenticateToken, upload.single('image'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const updateData = req.body;
    
    if (req.file) {
      updateData.localCoverPath = `./uploads/${req.file.filename}`;
    }

    ['directors', 'actors', 'genres', 'countries', 'aka'].forEach(field => {
      if (typeof updateData[field] === 'string') {
        updateData[field] = updateData[field].split(',').map((s: string) => s.trim());
      }
    });

    if (updateData.rank) {
      const existingMovie = await Movie.findOne({ 
        rank: updateData.rank, 
        _id: { $ne: req.params.id } 
      });
      if (existingMovie) {
        res.status(400).json({ 
          message: `排名 ${updateData.rank} 已被电影《${existingMovie.title}》占用，请使用其他排名` 
        });
        return;
      }
    }

    const movie = await Movie.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!movie) {
      res.status(404).json({ message: '电影不存在' });
      return;
    }

    res.json({ message: '电影更新成功', movie });
  } catch (error: any) {
    res.status(500).json({ message: '更新电影失败', error: error.message });
  }
});

app.delete('/api/movies/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const movie = await Movie.findByIdAndDelete(req.params.id);
    if (!movie) {
      res.status(404).json({ message: '电影不存在' });
      return;
    }

    await Comment.deleteMany({ movieId: req.params.id });
    await Favorite.deleteMany({ movieId: req.params.id });

    res.json({ message: '电影删除成功' });
  } catch (error: any) {
    res.status(500).json({ message: '删除电影失败', error: error.message });
  }
});

app.get('/api/movies/export/data', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const format = req.query.format as string || 'json';
    const movies = await Movie.find({}).sort({ rank: 1 });

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=movies.json');
      res.send(JSON.stringify(movies, null, 2));
    } else if (format === 'csv') {
      let csv = 'Rank,Title,Year,Rating,Directors,Genres\n';
      movies.forEach(movie => {
        csv += `${movie.rank},"${movie.title}",${movie.year},${movie.rating},"${movie.directors.join(', ')}","${movie.genres.join(', ')}"\n`;
      });
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=movies.csv');
      res.send(csv);
    } else {
      res.status(400).json({ message: '不支持的导出格式' });
    }
  } catch (error: any) {
    res.status(500).json({ message: '导出数据失败', error: error.message });
  }
});

app.get('/api/stats/overview', async (req: Request, res: Response): Promise<void> => {
  try {
    const totalMovies = await Movie.countDocuments();
    const avgRating = await Movie.aggregate([
      { $group: { _id: null, avg: { $avg: '$rating' } } }
    ]);

    const genreStats = await Movie.aggregate([
      { $unwind: '$genres' },
      { $group: { _id: '$genres', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      totalMovies,
      avgRating: avgRating[0]?.avg || 0,
      topGenres: genreStats
    });
  } catch (error: any) {
    res.status(500).json({ message: '获取统计概览失败', error: error.message });
  }
});

app.get('/api/stats/rating-distribution', async (req: Request, res: Response): Promise<void> => {
  try {
    const distribution = await Movie.aggregate([
      {
        $bucket: {
          groupBy: '$rating',
          boundaries: [0, 5, 6, 7, 8, 9, 10],
          default: 'Other',
          output: { count: { $sum: 1 } }
        }
      }
    ]);

    const boundaries = [0, 5, 6, 7, 8, 9];
    const resultMap = new Map<number, number>();
    distribution.forEach((item: any) => {
      if (typeof item._id === 'number') {
        resultMap.set(item._id, item.count);
      }
    });

    const result = boundaries.map(boundary => ({
      boundary: boundary,
      label: boundary === 9 ? '9-10' : `${boundary}-${boundary + 1}`,
      count: resultMap.get(boundary) || 0
    }));

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: '获取评分分布失败', error: error.message });
  }
});

app.get('/api/stats/year-distribution', async (req: Request, res: Response): Promise<void> => {
  try {
    const distribution = await Movie.aggregate([
      { $group: { _id: '$year', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    res.json(distribution);
  } catch (error: any) {
    res.status(500).json({ message: '获取年份分布失败', error: error.message });
  }
});

app.get('/api/comments/:movieId', async (req: Request, res: Response): Promise<void> => {
  try {
    const comments = await Comment.find({ movieId: req.params.movieId })
      .sort({ createdAt: -1 });
    res.json(comments);
  } catch (error: any) {
    res.status(500).json({ message: '获取评论失败', error: error.message });
  }
});

app.post('/api/comments/:movieId', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { content, rating } = req.body;
    
    const comment = new Comment({
      movieId: req.params.movieId,
      userId: req.user!.id,
      username: req.user!.username,
      content,
      rating
    });

    await comment.save();
    res.status(201).json({ message: '评论添加成功', comment });
  } catch (error: any) {
    res.status(500).json({ message: '添加评论失败', error: error.message });
  }
});

app.delete('/api/comments/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const comment = await Comment.findById(req.params.id);
    
    if (!comment) {
      res.status(404).json({ message: '评论不存在' });
      return;
    }

    if (comment.userId.toString() !== req.user!.id) {
      res.status(403).json({ message: '无权删除此评论' });
      return;
    }

    await Comment.findByIdAndDelete(req.params.id);
    res.json({ message: '评论删除成功' });
  } catch (error: any) {
    res.status(500).json({ message: '删除评论失败', error: error.message });
  }
});

app.get('/api/favorites', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const favorites = await Favorite.find({ userId: req.user!.id })
      .populate('movieId');
    
    const movies = favorites.map((fav: any) => fav.movieId);
    res.json(movies);
  } catch (error: any) {
    res.status(500).json({ message: '获取收藏列表失败', error: error.message });
  }
});

app.post('/api/favorites/:movieId', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const existing = await Favorite.findOne({
      userId: req.user!.id,
      movieId: req.params.movieId
    });

    if (existing) {
      res.status(400).json({ message: '已经收藏过了' });
      return;
    }

    const favorite = new Favorite({
      userId: req.user!.id,
      movieId: req.params.movieId
    });

    await favorite.save();
    res.status(201).json({ message: '收藏成功' });
  } catch (error: any) {
    res.status(500).json({ message: '收藏失败', error: error.message });
  }
});

app.delete('/api/favorites/:movieId', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await Favorite.findOneAndDelete({
      userId: req.user!.id,
      movieId: req.params.movieId
    });

    res.json({ message: '取消收藏成功' });
  } catch (error: any) {
    res.status(500).json({ message: '取消收藏失败', error: error.message });
  }
});

app.get('/api/favorites/check/:movieId', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const favorite = await Favorite.findOne({
      userId: req.user!.id,
      movieId: req.params.movieId
    });

    res.json({ isFavorited: !!favorite });
  } catch (error: any) {
    res.status(500).json({ message: '检查收藏状态失败', error: error.message });
  }
});

app.get('/api/recommendations', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const favorites = await Favorite.find({ userId: req.user!.id }).populate('movieId');
    
    if (favorites.length === 0) {
      const movies = await Movie.find({}).sort({ rating: -1 }).limit(10);
      res.json(movies);
      return;
    }

    const genres: string[] = [];
    favorites.forEach((fav: any) => {
      if (fav.movieId && fav.movieId.genres) {
        genres.push(...fav.movieId.genres);
      }
    });

    const genreCount: { [key: string]: number } = {};
    genres.forEach(genre => {
      genreCount[genre] = (genreCount[genre] || 0) + 1;
    });

    const topGenres = Object.keys(genreCount)
      .sort((a, b) => genreCount[b] - genreCount[a])
      .slice(0, 3);

    const favoritedIds = favorites.map((fav: any) => fav.movieId._id);
    
    const recommendations = await Movie.find({
      genres: { $in: topGenres },
      _id: { $nin: favoritedIds }
    })
      .sort({ rating: -1 })
      .limit(10);
    
    res.json(recommendations);
  } catch (error: any) {
    res.status(500).json({ message: '获取推荐失败', error: error.message });
  }
});

app.post('/api/ocr', upload.single('image'), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: '请上传图片' });
      return;
    }

    const imagePath = req.file.path;
    const worker = await createWorker('chi_sim+eng');
    
    const { data: { text } } = await worker.recognize(imagePath);
    await worker.terminate();

    res.json({ text });
  } catch (error: any) {
    res.status(500).json({ message: 'OCR识别失败', error: error.message });
  }
});

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;