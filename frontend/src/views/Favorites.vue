<template>
  <div class="favorites-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <h2>我的收藏</h2>
          <el-tag type="info" size="large">共 {{ favoriteMovies.length }} 部电影</el-tag>
        </div>
      </template>

      <el-alert
        v-if="favoriteMovies.length === 0"
        title="还没有收藏电影"
        type="info"
        description="快去收藏你喜欢的电影吧！"
        :closable="false"
        show-icon
        style="margin-bottom: 20px;"
      />

      <div v-loading="loading" class="favorites-grid">
        <el-card 
          v-for="movie in favoriteMovies" 
          :key="movie._id" 
          class="movie-card"
          shadow="hover"
        >
          <div class="movie-cover" @click="viewDetail(movie._id)">
            <img :src="getImageUrl(movie)" :alt="movie.title" />
            <div class="rank-badge">{{ movie.rank }}</div>
            <div class="overlay">
              <el-button type="primary" circle size="large">
                <el-icon><View /></el-icon>
              </el-button>
            </div>
          </div>
          
          <div class="movie-info">
            <h3 class="movie-title" @click="viewDetail(movie._id)">{{ movie.title }}</h3>
            <p class="movie-original-title">{{ movie.originalTitle }}</p>
            
            <div class="movie-meta">
              <el-rate 
                v-model="movie.rating" 
                disabled 
                show-score 
                text-color="#ff9900" 
                :max="10"
                :score-template="`${movie.rating}分`"
              />
            </div>
            
            <div class="movie-details">
              <el-tag size="small" type="info">{{ movie.year }}</el-tag>
              <el-tag 
                v-for="genre in movie.genres.slice(0, 3)" 
                :key="genre" 
                size="small"
                style="margin-left: 5px;"
              >
                {{ genre }}
              </el-tag>
            </div>
            
            <p v-if="movie.quote" class="movie-quote">"{{ movie.quote }}"</p>
            
            <div class="movie-summary">
              <p>{{ truncateSummary(movie.summary) }}</p>
            </div>
          </div>
          
          <div class="movie-actions">
            <el-button 
              size="small" 
              type="primary" 
              @click="viewDetail(movie._id)"
            >
              <el-icon><View /></el-icon>
              查看详情
            </el-button>
            <el-button 
              size="small" 
              type="danger" 
              @click="removeFavorite(movie._id)"
            >
              <el-icon><Delete /></el-icon>
              取消收藏
            </el-button>
          </div>
        </el-card>
      </div>
    </el-card>

    <!-- 统计信息 -->
    <el-row :gutter="20" style="margin-top: 24px;">
      <el-col :span="8">
        <el-card>
          <el-statistic title="收藏总数" :value="favoriteMovies.length">
            <template #prefix>
              <el-icon><Star /></el-icon>
            </template>
          </el-statistic>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card>
          <el-statistic 
            title="平均评分" 
            :value="averageRating" 
            :precision="2"
          >
            <template #prefix>
              <el-icon><TrophyBase /></el-icon>
            </template>
          </el-statistic>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card>
          <el-statistic title="最喜欢的类型" :value="favoriteGenre">
            <template #prefix>
              <el-icon><Film /></el-icon>
            </template>
          </el-statistic>
        </el-card>
      </el-col>
    </el-row>

    <!-- 类型分布 -->
    <el-card style="margin-top: 24px;">
      <template #header>
        <h3>收藏电影类型分布</h3>
      </template>
      <div class="genre-tags">
        <el-tag 
          v-for="(count, genre) in genreDistribution" 
          :key="genre"
          size="large"
          style="margin: 5px;"
        >
          {{ genre }}: {{ count }}
        </el-tag>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { favoriteAPI } from '../api';
import type { Movie } from '../types';

const router = useRouter();
const loading = ref(false);
const favoriteMovies = ref<Movie[]>([]);

// 计算平均评分
const averageRating = computed(() => {
  if (favoriteMovies.value.length === 0) return 0;
  const sum = favoriteMovies.value.reduce((acc, movie) => acc + movie.rating, 0);
  return sum / favoriteMovies.value.length;
});

// 计算最喜欢的类型
const favoriteGenre = computed(() => {
  if (favoriteMovies.value.length === 0) return '暂无';
  
  const genreCount: Record<string, number> = {};
  favoriteMovies.value.forEach(movie => {
    movie.genres.forEach(genre => {
      genreCount[genre] = (genreCount[genre] || 0) + 1;
    });
  });
  
  let maxGenre = '';
  let maxCount = 0;
  Object.entries(genreCount).forEach(([genre, count]) => {
    if (count > maxCount) {
      maxCount = count;
      maxGenre = genre;
    }
  });
  
  return maxGenre || '暂无';
});

// 计算类型分布
const genreDistribution = computed(() => {
  const distribution: Record<string, number> = {};
  favoriteMovies.value.forEach(movie => {
    movie.genres.forEach(genre => {
      distribution[genre] = (distribution[genre] || 0) + 1;
    });
  });
  
  // 按数量排序
  return Object.fromEntries(
    Object.entries(distribution).sort((a, b) => b[1] - a[1])
  );
});

// 获取收藏列表
const fetchFavorites = async () => {
  loading.value = true;
  try {
    const { data } = await favoriteAPI.getList();
    favoriteMovies.value = data;
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '获取收藏列表失败');
  } finally {
    loading.value = false;
  }
};

// 取消收藏
const removeFavorite = async (movieId: string) => {
  try {
    await ElMessageBox.confirm('确定要取消收藏这部电影吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    });
    
    await favoriteAPI.remove(movieId);
    ElMessage.success('已取消收藏');
    fetchFavorites();
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('操作失败');
    }
  }
};

// 查看详情
const viewDetail = (id: string) => {
  router.push(`/movies/${id}`);
};

// 获取图片URL
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

// 截断简介
const truncateSummary = (summary: string, maxLength: number = 80) => {
  if (summary.length <= maxLength) return summary;
  return summary.substring(0, maxLength) + '...';
};

onMounted(() => {
  fetchFavorites();
});
</script>

<style scoped>
.favorites-container {
  max-width: 1400px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}

.favorites-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  min-height: 200px;
}

.movie-card {
  transition: all 0.3s;
  cursor: pointer;
}

.movie-card:hover {
  transform: translateY(-4px);
}

.movie-cover {
  position: relative;
  width: 100%;
  height: 380px;
  overflow: hidden;
  border-radius: 8px;
  cursor: pointer;
}

.movie-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s;
}

.movie-cover:hover img {
  transform: scale(1.05);
}

.rank-badge {
  position: absolute;
  top: 12px;
  left: 12px;
  background: rgba(255, 152, 0, 0.95);
  color: white;
  font-weight: bold;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 14px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  opacity: 0;
  transition: opacity 0.3s;
}

.movie-cover:hover .overlay {
  opacity: 1;
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
  cursor: pointer;
  transition: color 0.3s;
}

.movie-title:hover {
  color: #409eff;
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
  margin-bottom: 12px;
}

.movie-details {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}

.movie-quote {
  font-size: 13px;
  color: #666;
  font-style: italic;
  margin: 8px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.movie-summary {
  font-size: 13px;
  color: #666;
  line-height: 1.6;
  margin-top: 8px;
}

.movie-summary p {
  margin: 0;
}

.movie-actions {
  display: flex;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}

.movie-actions .el-button {
  flex: 1;
}

.genre-tags {
  display: flex;
  flex-wrap: wrap;
}
</style>