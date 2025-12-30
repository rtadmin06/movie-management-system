<template>
  <div class="recommendations-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <h2>电影推荐</h2>
          <el-button type="primary" @click="refreshRecommendations">
            <el-icon><Refresh /></el-icon>
            刷新推荐
          </el-button>
        </div>
      </template>

      <el-alert
        v-if="recommendations.length === 0 && !loading"
        title="暂无推荐"
        type="info"
        :closable="false"
        style="margin-bottom: 20px;"
      >
        <p>系统根据您的收藏为您推荐电影</p>
        <p>快去收藏一些电影吧！收藏越多，推荐越精准</p>
      </el-alert>

      <!-- 推荐说明 -->
      <el-card v-if="favoriteStats" shadow="never" style="margin-bottom: 24px;">
        <template #header>
          <h3>推荐依据</h3>
        </template>
        <el-descriptions :column="3" border>
          <el-descriptions-item label="已收藏电影">
            {{ favoriteStats.totalFavorites }} 部
          </el-descriptions-item>
          <el-descriptions-item label="最喜欢的类型">
            <el-tag v-for="genre in favoriteStats.topGenres" :key="genre" style="margin-right: 5px;">
              {{ genre }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="平均评分偏好">
            {{ favoriteStats.avgRating?.toFixed(1) || 0 }} 分
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <div v-loading="loading" class="recommendations-grid">
        <el-card 
          v-for="movie in recommendations" 
          :key="movie._id" 
          class="movie-card"
          shadow="hover"
        >
          <div class="movie-cover" @click="viewDetail(movie._id)">
            <img :src="getImageUrl(movie)" :alt="movie.title" />
            <div class="rank-badge">TOP {{ movie.rank }}</div>
            <div class="match-badge">
              <el-icon><MagicStick /></el-icon>
              推荐
            </div>
            <div class="overlay">
              <el-button type="primary" circle size="large">
                <el-icon><View /></el-icon>
              </el-button>
            </div>
          </div>
          
          <div class="movie-info">
            <h3 class="movie-title" @click="viewDetail(movie._id)">
              {{ movie.title }}
            </h3>
            <p class="movie-original-title">{{ movie.originalTitle }}</p>
            
            <div class="movie-meta">
              <el-rate 
                v-model="movie.rating" 
                disabled 
                show-score 
                text-color="#ff9900" 
                :max="10"
              />
            </div>
            
            <div class="movie-details">
              <el-tag size="small" type="info">{{ movie.year }}</el-tag>
              <el-tag 
                v-for="genre in movie.genres.slice(0, 3)" 
                :key="genre" 
                size="small"
                style="margin-left: 5px;"
                :type="isMatchingGenre(genre) ? 'success' : ''"
              >
                {{ genre }}
              </el-tag>
            </div>
            
            <p v-if="movie.quote" class="movie-quote">"{{ movie.quote }}"</p>
            
            <div class="movie-directors">
              <el-icon><User /></el-icon>
              <span>{{ movie.directors.join(', ') }}</span>
            </div>
            
            <div class="match-reasons">
              <el-divider content-position="left">
                <el-text size="small" type="info">推荐理由</el-text>
              </el-divider>
              <el-space wrap>
                <el-tag 
                  v-for="reason in getMatchReasons(movie)" 
                  :key="reason"
                  size="small"
                  type="success"
                  effect="plain"
                >
                  {{ reason }}
                </el-tag>
              </el-space>
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
              :type="isFavorited(movie._id) ? 'danger' : 'success'"
              @click="toggleFavorite(movie._id)"
            >
              <el-icon><Star /></el-icon>
              {{ isFavorited(movie._id) ? '取消收藏' : '收藏' }}
            </el-button>
          </div>
        </el-card>
      </div>

      <el-empty 
        v-if="recommendations.length === 0 && !loading" 
        description="暂无推荐，快去收藏电影吧"
        style="padding: 60px 0;"
      />
    </el-card>

    <!-- 推荐算法说明 -->
    <el-card style="margin-top: 24px;">
      <template #header>
        <h3>推荐算法说明</h3>
      </template>
      
      <el-timeline>
        <el-timeline-item timestamp="步骤 1" placement="top">
          <el-card>
            <h4>分析收藏偏好</h4>
            <p>系统会分析您收藏的电影类型、评分、年代等特征，建立您的观影偏好模型</p>
          </el-card>
        </el-timeline-item>
        
        <el-timeline-item timestamp="步骤 2" placement="top">
          <el-card>
            <h4>类型匹配</h4>
            <p>根据您最喜欢的电影类型，从数据库中筛选相同或相似类型的电影</p>
          </el-card>
        </el-timeline-item>
        
        <el-timeline-item timestamp="步骤 3" placement="top">
          <el-card>
            <h4>质量筛选</h4>
            <p>优先推荐高评分（8分以上）且评价人数较多的优质电影</p>
          </el-card>
        </el-timeline-item>
        
        <el-timeline-item timestamp="步骤 4" placement="top">
          <el-card>
            <h4>排除已收藏</h4>
            <p>自动过滤您已经收藏的电影，确保推荐内容都是新发现</p>
          </el-card>
        </el-timeline-item>
      </el-timeline>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { recommendationAPI, favoriteAPI } from '../api';
import type { Movie } from '../types';

const router = useRouter();
const loading = ref(false);
const recommendations = ref<Movie[]>([]);
const favoritedIds = ref<Set<string>>(new Set());
const favoriteStats = ref<{
  totalFavorites: number;
  topGenres: string[];
  avgRating: number;
} | null>(null);

// 获取推荐
const fetchRecommendations = async () => {
  loading.value = true;
  try {
    const { data } = await recommendationAPI.get();
    recommendations.value = data;
    
    // 计算收藏统计
    await calculateFavoriteStats();
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '获取推荐失败');
  } finally {
    loading.value = false;
  }
};

// 计算收藏统计
const calculateFavoriteStats = async () => {
  try {
    const { data: favorites } = await favoriteAPI.getList();
    
    // 统计类型
    const genreCount: Record<string, number> = {};
    favorites.forEach((movie: Movie) => {
      movie.genres.forEach(genre => {
        genreCount[genre] = (genreCount[genre] || 0) + 1;
      });
    });
    
    // 获取前3个最喜欢的类型
    const topGenres = Object.entries(genreCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([genre]) => genre);
    
    // 计算平均评分
    const avgRating = favorites.length > 0
      ? favorites.reduce((sum: number, m: Movie) => sum + m.rating, 0) / favorites.length
      : 0;
    
    favoriteStats.value = {
      totalFavorites: favorites.length,
      topGenres,
      avgRating
    };
    
    // 保存已收藏的ID
    favoritedIds.value = new Set(favorites.map((m: Movie) => m._id));
  } catch (error) {
    console.error('计算收藏统计失败', error);
  }
};

// 刷新推荐
const refreshRecommendations = () => {
  fetchRecommendations();
  ElMessage.success('正在为您刷新推荐...');
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

// 判断是否是匹配的类型
const isMatchingGenre = (genre: string) => {
  return favoriteStats.value?.topGenres.includes(genre) || false;
};

// 获取推荐理由
const getMatchReasons = (movie: Movie) => {
  const reasons: string[] = [];
  
  // 类型匹配
  const matchingGenres = movie.genres.filter(g => 
    favoriteStats.value?.topGenres.includes(g)
  );
  if (matchingGenres.length > 0) {
    reasons.push(`类型匹配: ${matchingGenres.join('、')}`);
  }
  
  // 高评分
  if (movie.rating >= 9.0) {
    reasons.push('高分佳作');
  } else if (movie.rating >= 8.5) {
    reasons.push('评分优秀');
  }
  
  // 热门
  if (movie.ratingCount > 500000) {
    reasons.push('口碑热门');
  }
  
  // 经典
  if (movie.year < 2000) {
    reasons.push('经典作品');
  } else if (movie.year > 2015) {
    reasons.push('近年佳作');
  }
  
  return reasons.length > 0 ? reasons : ['为您推荐'];
};

// 判断是否已收藏
const isFavorited = (movieId: string) => {
  return favoritedIds.value.has(movieId);
};

// 切换收藏状态
const toggleFavorite = async (movieId: string) => {
  try {
    if (isFavorited(movieId)) {
      await favoriteAPI.remove(movieId);
      favoritedIds.value.delete(movieId);
      ElMessage.success('已取消收藏');
    } else {
      await favoriteAPI.add(movieId);
      favoritedIds.value.add(movieId);
      ElMessage.success('收藏成功');
    }
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '操作失败');
  }
};

onMounted(() => {
  fetchRecommendations();
});
</script>

<style scoped>
.recommendations-container {
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

.recommendations-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
  min-height: 200px;
}

.movie-card {
  transition: all 0.3s;
}

.movie-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.movie-cover {
  position: relative;
  width: 100%;
  height: 400px;
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
  transform: scale(1.1);
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

.match-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  background: rgba(103, 194, 58, 0.95);
  color: white;
  font-weight: bold;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 14px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  gap: 4px;
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

.movie-directors {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #666;
  margin-bottom: 12px;
}

.match-reasons {
  margin-top: 16px;
}

.movie-actions {
  display: flex;
  gap: 8px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.movie-actions .el-button {
  flex: 1;
}
</style>