import puppeteer, { Browser, Page } from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { Movie, ScraperConfig } from './types';

const config: ScraperConfig = {
  baseUrl: 'https://movie.douban.com/top250',
  totalPages: 10,
  itemsPerPage: 25,
  outputDir: path.join(__dirname, '../data'),
  imagesDir: path.join(__dirname, '../data/images'),
  delayBetweenRequests: 2000
};

// 创建必要的目录
function ensureDirectoryExists(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
}

// 下载图片
function downloadImage(url: string, filepath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {});
      reject(err);
    });
  });
}

// 延迟函数
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 提取电影详细信息
async function scrapeMovieDetails(page: Page, movieUrl: string): Promise<Partial<Movie>> {
  try {
    await page.goto(movieUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(1000);

    const details = await page.evaluate(() => {
      const info: any = {};
      
      // 获取基本信息
      const infoDiv = document.querySelector('#info');
      if (infoDiv) {
        const text = infoDiv.textContent || '';
        
        // 导演
        const directorMatch = text.match(/导演:(.*?)(?:编剧|主演|类型|$)/s);
        if (directorMatch) {
          info.directors = directorMatch[1].trim().split('/').map((d: string) => d.trim()).filter((d: string) => d);
        }
        
        // 主演
        const actorMatch = text.match(/主演:(.*?)(?:类型|制片国家|$)/s);
        if (actorMatch) {
          info.actors = actorMatch[1].trim().split('/').map((a: string) => a.trim()).filter((a: string) => a).slice(0, 5);
        }
        
        // 类型
        const genreMatch = text.match(/类型:(.*?)(?:制片国家|语言|$)/s);
        if (genreMatch) {
          info.genres = genreMatch[1].trim().split('/').map((g: string) => g.trim()).filter((g: string) => g);
        }
        
        // 国家
        const countryMatch = text.match(/制片国家\/地区:(.*?)(?:语言|上映日期|$)/s);
        if (countryMatch) {
          info.countries = countryMatch[1].trim().split('/').map((c: string) => c.trim()).filter((c: string) => c);
        }
        
        // 语言
        const languageMatch = text.match(/语言:(.*?)(?:上映日期|片长|$)/s);
        if (languageMatch) {
          info.language = languageMatch[1].trim();
        }
        
        // 上映日期
        const dateMatch = text.match(/上映日期:(.*?)(?:片长|又名|$)/s);
        if (dateMatch) {
          info.releaseDate = dateMatch[1].trim().split('/')[0].trim();
        }
        
        // 片长
        const durationMatch = text.match(/片长:(.*?)(?:又名|IMDb|$)/s);
        if (durationMatch) {
          info.duration = durationMatch[1].trim();
        }
        
        // 又名
        const akaMatch = text.match(/又名:(.*?)$/s);
        if (akaMatch) {
          info.aka = akaMatch[1].trim().split('/').map((a: string) => a.trim()).filter((a: string) => a);
        }
        
        // IMDb
        const imdbMatch = text.match(/IMDb:(.*?)$/s);
        if (imdbMatch) {
          info.imdbId = imdbMatch[1].trim();
        }
      }
      
      // 获取简介
      const summarySpan = document.querySelector('span[property="v:summary"]');
      if (summarySpan) {
        info.summary = summarySpan.textContent?.trim() || '';
      }
      
      return info;
    });

    return details;
  } catch (error) {
    console.error(`Error scraping details for ${movieUrl}:`, error);
    return {};
  }
}

// 爬取单页电影列表
async function scrapePage(browser: Browser, pageNum: number): Promise<Movie[]> {
  const page = await browser.newPage();
  const url = `${config.baseUrl}?start=${pageNum * config.itemsPerPage}`;
  
  console.log(`Scraping page ${pageNum + 1}...`);
  console.log(`URL: ${url}`);
  
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await delay(1000);

    const movies = await page.evaluate((startRank) => {
      const items = document.querySelectorAll('.grid_view li');
      const movieList: any[] = [];
      
      items.forEach((item, index) => {
        const titleElement = item.querySelector('.title');
        const title = titleElement?.textContent?.trim() || '';
        
        const otherElement = item.querySelector('.other');
        const originalTitle = otherElement?.textContent?.trim().replace(/\s*\/\s*/, '') || title;
        
        const bdElement = item.querySelector('.bd p');
        const bdText = bdElement?.textContent || '';
        
        const yearMatch = bdText.match(/(\d{4})/);
        const year = yearMatch ? parseInt(yearMatch[1]) : 0;
        
        const ratingElement = item.querySelector('.rating_num');
        const rating = parseFloat(ratingElement?.textContent?.trim() || '0');
        
        const ratingCountElement = item.querySelector('.star span:last-child');
        const ratingCountText = ratingCountElement?.textContent?.trim() || '0';
        const ratingCount = parseInt(ratingCountText.replace(/[^\d]/g, '')) || 0;
        
        const imgElement = item.querySelector('img');
        const coverImageUrl = imgElement?.getAttribute('src') || '';
        
        const linkElement = item.querySelector('.hd a');
        const doubanUrl = linkElement?.getAttribute('href') || '';
        
        const quoteElement = item.querySelector('.inq');
        const quote = quoteElement?.textContent?.trim() || '';
        
        movieList.push({
          title,
          originalTitle,
          year,
          rating,
          ratingCount,
          coverImageUrl,
          doubanUrl,
          quote,
          rank: startRank + index + 1
        });
      });
      
      return movieList;
    }, pageNum * config.itemsPerPage);

    // 为每部电影获取详细信息
    const detailedMovies: Movie[] = [];
    for (let i = 0; i < movies.length; i++) {
      const movie = movies[i];
      console.log(`  Processing movie ${i + 1}/${movies.length}: ${movie.title}`);
      
      // 获取详细信息
      const details = await scrapeMovieDetails(page, movie.doubanUrl);
      
      // 下载封面图片
      const imageFileName = `movie_${movie.rank}.jpg`;
      const localImagePath = path.join(config.imagesDir, imageFileName);
      const relativeImagePath = `./images/${imageFileName}`;
      
      try {
        await downloadImage(movie.coverImageUrl, localImagePath);
        console.log(`    Downloaded image: ${imageFileName}`);
      } catch (error) {
        console.error(`    Failed to download image: ${error}`);
      }
      
      detailedMovies.push({
        ...movie,
        ...details,
        localCoverPath: relativeImagePath,
        directors: details.directors || [],
        actors: details.actors || [],
        genres: details.genres || [],
        countries: details.countries || [],
        duration: details.duration || '',
        summary: details.summary || '',
        releaseDate: details.releaseDate || '',
        language: details.language || '',
        aka: details.aka || []
      });
      
      await delay(config.delayBetweenRequests);
    }
    
    await page.close();
    return detailedMovies;
  } catch (error) {
    console.error(`Error scraping page ${pageNum}:`, error);
    await page.close();
    return [];
  }
}

// 主函数
async function main(): Promise<void> {
  console.log('Starting Douban Top 250 Movies Crawler...');
  console.log('===========================================');
  
  ensureDirectoryExists(config.outputDir);
  ensureDirectoryExists(config.imagesDir);
  
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1280, height: 800 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  let allMovies: Movie[] = [];
  
  try {
    for (let i = 0; i < config.totalPages; i++) {
      const movies = await scrapePage(browser, i);
      allMovies = allMovies.concat(movies);
      console.log(`Completed page ${i + 1}/${config.totalPages} - Total movies: ${allMovies.length}`);
      await delay(config.delayBetweenRequests);
    }
    
    const outputPath = path.join(config.outputDir, 'movies.json');
    fs.writeFileSync(outputPath, JSON.stringify(allMovies, null, 2), 'utf-8');
    console.log('===========================================');
    console.log(`Successfully scraped ${allMovies.length} movies!`);
    console.log(`Data saved to: ${outputPath}`);
    console.log(`Images saved to: ${config.imagesDir}`);
  } catch (error) {
    console.error('Error during scraping:', error);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);