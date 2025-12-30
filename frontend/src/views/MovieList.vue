<template>
  <div class="movie-list-container">
    <el-card class="search-card">
      <el-row :gutter="20">
        <el-col :span="12">
          <el-input
            v-model="searchQuery"
            placeholder="搜索电影名称、导演、演员..."
            prefix-icon="Search"
            size="large"
            clearable
            @keyup.enter="handleSearch"
          />
        </el-col>
        <el-col :span="6">
          <el-select v-model="selectedGenre" placeholder="选择类型" size="large" clearable @change="handleSearch">
            <el-option label="全部类型" value="" />
            <el-option v-for="genre in genres" :key="genre" :label="genre" :value="genre" />
          </el-select>
        </el-col>
        <el-col :span="3">
          <el-button type="primary" size="large" @click="handleSearch" style="width: 100%">
            搜索
          </el-button>
        </el-col>
        <el-col :span="3">
          <el-button size="large" @click="showAddDialog = true" style="width: 100%">
            <el-icon><Plus /></el-icon>
            添加
          </el-button>
        </el-col>
      </el-row>
      
      <el-row :gutter="20" style="margin-top: 16px;">
        <el-col :span="6">
          <el-button link @click="handleExport('json')">
            <el-icon><Download /></el-icon>
            导出JSON
          </el-button>
        </el-col>
        <el-col :span="6">
          <el-button link @click="handleExport('csv')">
            <el-icon><Download /></el-icon>
            导出CSV
          </el-button>
        </el-col>
      </el-row>
    </el-card>

    <div v-loading="loading" class="movies-grid">
      <el-card 
        v-for="movie in movies" 
        :key="movie._id" 
        class="movie-card"
        shadow="hover"
        @click="viewDetail(movie._id)"
      >
        <div class="movie-cover">
          <img :src="getImageUrl(movie)" :alt="movie.title" />
          <div class="rank-badge">{{ movie.rank }}</div>
        </div>
        <div class="movie-info">
          <h3 class="movie-title">{{ movie.title }}</h3>
          <p class="movie-original-title">{{ movie.originalTitle }}</p>
          <div class="movie-meta">
            <el-rate v-model="movie.rating" disabled show-score text-color="#ff9900" :max="10" />
          </div>
          <div class="movie-details">
            <span>{{ movie.year }}</span>
            <span v-if="movie.genres.length">{{ movie.genres.join(' / ') }}</span>
          </div>
          <p v-if="movie.quote" class="movie-quote">"{{ movie.quote }}"</p>
        </div>
        <div class="movie-actions">
          <el-button size="small" type="primary" @click.stop="viewDetail(movie._id)">查看</el-button>
          <el-button size="small" @click.stop="editMovie(movie)">编辑</el-button>
          <el-button size="small" type="danger" @click.stop="deleteMovie(movie._id)">删除</el-button>
        </div>
      </el-card>
    </div>

    <el-pagination
      v-if="total > 0"
      class="pagination"
      background
      layout="total, prev, pager, next, sizes"
      :total="total"
      :page-size="pageSize"
      :current-page="currentPage"
      :page-sizes="[12, 24, 48, 96]"
      @current-change="handlePageChange"
      @size-change="handleSizeChange"
    />

    <el-dialog 
      v-model="showAddDialog" 
      :title="editingMovie ? '编辑电影' : '添加电影'"
      width="700px"
      destroy-on-close
    >
      <el-form :model="movieForm" label-width="110px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="电影名称" required>
              <el-input v-model="movieForm.title" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="原名" required>
              <el-input v-model="movieForm.originalTitle" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="12">
          <el-col :span="8">
            <el-form-item label="年份" required label-width="70px">
              <el-input-number v-model="movieForm.year" :min="1900" :max="2100" :controls="false" style="width: 100%;" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="评分" required label-width="70px">
              <el-input-number v-model="movieForm.rating" :min="0" :max="10" :step="0.1" :precision="1" :controls="false" style="width: 100%;" />
            </el-form-item>
          </el-col>
          <el-col :span="8" v-if="editingMovie">
            <el-form-item label="排名" label-width="70px">
              <el-input-number v-model="movieForm.rank" :min="1" :controls="false" style="width: 100%;" />
              <el-text size="small" type="info">当前排名：{{ movieForm.rank }}</el-text>
            </el-form-item>
          </el-col>
          <el-col :span="8" v-else>
            <el-form-item label="排名" label-width="70px">
              <el-input value="自动分配" disabled style="width: 100%;" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="评分人数">
              <el-input-number v-model="movieForm.ratingCount" :min="0" :controls="false" style="width: 100%;" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="豆瓣链接">
              <el-input v-model="movieForm.doubanUrl" placeholder="https://movie.douban.com/..." />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="导演">
          <el-input v-model="movieForm.directors" placeholder="多个导演用逗号分隔" />
        </el-form-item>

        <el-form-item label="主演">
          <el-input v-model="movieForm.actors" placeholder="多个演员用逗号分隔" />
        </el-form-item>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="类型">
              <el-input v-model="movieForm.genres" placeholder="多个类型用逗号分隔" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="国家/地区">
              <el-input v-model="movieForm.countries" placeholder="多个国家用逗号分隔" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="语言">
              <el-input v-model="movieForm.language" placeholder="例如：汉语普通话 / 英语" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="上映日期">
              <el-input v-model="movieForm.releaseDate" placeholder="例如：2023-01-01" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="片长">
              <el-input v-model="movieForm.duration" placeholder="例如：142分钟" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="封面图片URL">
              <el-input v-model="movieForm.coverImageUrl" placeholder="在线图片链接或本地相对路径" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="一句话评价">
          <el-input v-model="movieForm.quote" placeholder="电影的经典台词或评价" />
        </el-form-item>

        <el-form-item label="简介">
          <el-input v-model="movieForm.summary" type="textarea" :rows="4" />
        </el-form-item>

        <el-form-item label="本地封面">
          <el-upload
            action="#"
            :auto-upload="false"
            :on-change="handleFileChange"
            :file-list="fileList"
            accept="image/*"
            :limit="1"
          >
            <el-button size="small">选择文件</el-button>
            <template #tip>
              <div class="el-upload__tip">选择本地图片文件，上传后将自动保存路径</div>
            </template>
          </el-upload>
        </el-form-item>

        <el-form-item label="又名">
          <el-input v-model="movieForm.aka" placeholder="多个别名用逗号分隔" />
        </el-form-item>

        <el-form-item label="IMDb">
          <el-input v-model="movieForm.imdbId" placeholder="例如：tt1234567" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="cancelEdit">取消</el-button>
        <el-button type="primary" @click="saveMovie" :loading="saving">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showImagePreview" title="图片预览" width="500px">
      <img v-if="previewImageUrl" :src="previewImageUrl" style="width: 100%;" />
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { movieAPI } from '../api';
import type { Movie } from '../types';

const router = useRouter();
const loading = ref(false);
const saving = ref(false);
const movies = ref<Movie[]>([]);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(24);
const searchQuery = ref('');
const selectedGenre = ref('');
const showAddDialog = ref(false);
const editingMovie = ref<Movie | null>(null);
const fileList = ref<any[]>([]);
const uploadFile = ref<File | null>(null);
const showImagePreview = ref(false);
const previewImageUrl = ref('');

const genres = ref(['剧情', '喜剧', '动作', '爱情', '科幻', '动画', '悬疑', '惊悚', '恐怖', '犯罪', '冒险', '战争', '历史', '音乐', '传记', '家庭', '奇幻', '武侠', '古装', '西部']);

const movieForm = ref({
  title: '',
  originalTitle: '',
  year: new Date().getFullYear(),
  rating: 0,
  ratingCount: 0,
  directors: '',
  actors: '',
  genres: '',
  countries: '',
  duration: '',
  summary: '',
  coverImageUrl: '',
  doubanUrl: '',
  rank: 0,
  quote: '',
  language: '',
  releaseDate: '',
  localCoverPath: '',
  aka: '',
  imdbId: ''
});

const fetchMovies = async () => {
  loading.value = true;
  try {
    const { data } = await movieAPI.getList({
      page: currentPage.value,
      limit: pageSize.value,
      search: searchQuery.value,
      genre: selectedGenre.value
    });
    movies.value = data.movies;
    total.value = data.total;
  } catch (error) {
    ElMessage.error('获取电影列表失败');
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  currentPage.value = 1;
  fetchMovies();
};

const handlePageChange = (page: number) => {
  currentPage.value = page;
  fetchMovies();
};

const handleSizeChange = (size: number) => {
  pageSize.value = size;
  currentPage.value = 1;
  fetchMovies();
};

const getImageUrl = (movie: Movie) => {
  if (movie.localCoverPath) {
    let path = movie.localCoverPath;
    
    if (path.startsWith('./images/')) {
      path = path.replace('./', '/');
    } else if (path.startsWith('./uploads/')) {
      path = path.replace('./', '/');
    }
    
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    
    return path;
  }
  
  return movie.coverImageUrl || '/placeholder.png';
};

const viewDetail = (id: string) => {
  router.push(`/movies/${id}`);
};

const editMovie = (movie: Movie) => {
  editingMovie.value = movie;
  
  let displayPath = '';
  if (movie.localCoverPath) {
    displayPath = movie.localCoverPath;
    if (displayPath && !displayPath.startsWith('./') && !displayPath.startsWith('http')) {
      if (displayPath.startsWith('/uploads/')) {
        displayPath = '.' + displayPath;
      } else if (displayPath.startsWith('/images/')) {
        displayPath = '.' + displayPath;
      }
    }
  } else if (movie.coverImageUrl) {
    displayPath = movie.coverImageUrl;
  }
  
  movieForm.value = {
    title: movie.title,
    originalTitle: movie.originalTitle,
    year: movie.year,
    rating: movie.rating,
    ratingCount: movie.ratingCount || 0,
    directors: movie.directors.join(', '),
    actors: movie.actors.join(', '),
    genres: movie.genres.join(', '),
    countries: movie.countries.join(', '),
    duration: movie.duration,
    summary: movie.summary,
    coverImageUrl: displayPath,
    doubanUrl: movie.doubanUrl || '',
    rank: movie.rank,
    quote: movie.quote || '',
    language: movie.language || '',
    releaseDate: movie.releaseDate || '',
    localCoverPath: movie.localCoverPath || '',
    aka: movie.aka?.join(', ') || '',
    imdbId: movie.imdbId || ''
  };
  fileList.value = [];
  uploadFile.value = null;
  showAddDialog.value = true;
};

const handleFileChange = (file: any) => {
  uploadFile.value = file.raw;
  fileList.value = [file];
  movieForm.value.coverImageUrl = './uploads/[文件已选择，保存后自动生成路径]';
};

const previewImage = () => {
  if (movieForm.value.localCoverPath) {
    let path = movieForm.value.localCoverPath;
    if (path.startsWith('./images/')) {
      path = path.replace('./', '/');
    } else if (path.startsWith('./uploads/')) {
      path = path.replace('./', '/');
    }
    previewImageUrl.value = path;
    showImagePreview.value = true;
  }
};

const saveMovie = async () => {
  if (!movieForm.value.title || !movieForm.value.originalTitle) {
    ElMessage.warning('请填写必填字段：电影名称和原名');
    return;
  }

  saving.value = true;
  try {
    const formData = new FormData();
    Object.entries(movieForm.value).forEach(([key, value]) => {
      if (editingMovie.value) {
        if (key !== 'localCoverPath') {
          formData.append(key, String(value));
        }
      } else {
        if (key !== 'localCoverPath' && key !== 'rank') {
          formData.append(key, String(value));
        }
      }
    });
    
    if (uploadFile.value) {
      formData.append('image', uploadFile.value);
    }

    if (editingMovie.value) {
      await movieAPI.update(editingMovie.value._id, formData);
      ElMessage.success('更新成功');
    } else {
      await movieAPI.create(formData);
      ElMessage.success('添加成功');
    }
    
    showAddDialog.value = false;
    fetchMovies();
    resetForm();
  } catch (error: any) {
    const errorMsg = error.response?.data?.message || error.response?.data?.error || '保存失败';
    ElMessage.error(errorMsg);
    console.error('保存电影错误:', error.response?.data);
  } finally {
    saving.value = false;
  }
};

const deleteMovie = async (id: string) => {
  try {
    await ElMessageBox.confirm('确定要删除这部电影吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    });
    
    await movieAPI.delete(id);
    ElMessage.success('删除成功');
    fetchMovies();
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败');
    }
  }
};

const handleExport = async (format: string) => {
  try {
    const { data } = await movieAPI.export(format);
    const url = window.URL.createObjectURL(new Blob([data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `movies.${format}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    ElMessage.success('导出成功');
  } catch (error) {
    ElMessage.error('导出失败');
  }
};

const cancelEdit = () => {
  showAddDialog.value = false;
  resetForm();
};

const resetForm = () => {
  editingMovie.value = null;
  movieForm.value = {
    title: '',
    originalTitle: '',
    year: new Date().getFullYear(),
    rating: 0,
    ratingCount: 0,
    directors: '',
    actors: '',
    genres: '',
    countries: '',
    duration: '',
    summary: '',
    coverImageUrl: '',
    doubanUrl: '',
    rank: 0,
    quote: '',
    language: '',
    releaseDate: '',
    localCoverPath: '',
    aka: '',
    imdbId: ''
  };
  fileList.value = [];
  uploadFile.value = null;
};

onMounted(() => {
  fetchMovies();
});
</script>

<style scoped>
.movie-list-container {
  max-width: 1400px;
  margin: 0 auto;
}

.search-card {
  margin-bottom: 24px;
}

.movies-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.movie-card {
  cursor: pointer;
  transition: transform 0.3s;
}

.movie-card:hover {
  transform: translateY(-4px);
}

.movie-cover {
  position: relative;
  width: 100%;
  height: 360px;
  overflow: hidden;
  border-radius: 8px;
}

.movie-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.rank-badge {
  position: absolute;
  top: 12px;
  left: 12px;
  background: rgba(255, 152, 0, 0.9);
  color: white;
  font-weight: bold;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 14px;
}

.movie-info {
  padding: 16px 0;
}

.movie-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 6px 0;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.movie-original-title {
  font-size: 14px;
  color: #999;
  margin: 0 0 12px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.movie-meta {
  margin-bottom: 8px;
}

.movie-details {
  display: flex;
  gap: 12px;
  font-size: 13px;
  color: #666;
  margin-bottom: 8px;
}

.movie-quote {
  font-size: 13px;
  color: #666;
  font-style: italic;
  margin: 8px 0 0 0;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.movie-actions {
  display: flex;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}

.pagination {
  display: flex;
  justify-content: center;
  margin-top: 24px;
}
</style>