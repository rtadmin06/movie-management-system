<template>
  <div class="movie-detail-container">
    <el-card v-loading="loading">
      <div v-if="movie" class="movie-detail">
        <el-row :gutter="30">
          <el-col :span="8">
            <div class="movie-poster">
              <img :src="getImageUrl(movie)" :alt="movie.title" />
              <div class="rank-badge">TOP {{ movie.rank }}</div>
            </div>
            
            <div class="action-buttons">
              <el-button 
                type="primary" 
                size="large" 
                style="width: 100%; margin-bottom: 12px;"
                @click="toggleFavorite"
              >
                <el-icon><Star /></el-icon>
                {{ isFavorited ? '取消收藏' : '收藏电影' }}
              </el-button>
              
              <el-button 
                size="large" 
                style="width: 100%;"
                @click="openDouban"
              >
                <el-icon><Link /></el-icon>
                豆瓣链接
              </el-button>
            </div>
          </el-col>
          
          <el-col :span="16">
            <div class="movie-info">
              <h1 class="movie-title">{{ movie.title }}</h1>
              <p class="movie-original-title">{{ movie.originalTitle }}</p>
              
              <div class="movie-rating">
                <el-rate 
                  v-model="movie.rating" 
                  disabled 
                  show-score 
                  :max="10"
                  text-color="#ff9900"
                  :score-template="`${movie.rating}分`"
                />
                <span class="rating-count">{{ movie.ratingCount }} 人评价</span>
              </div>
              
              <el-divider />
              
              <el-descriptions :column="1" border>
                <el-descriptions-item label="导演">
                  {{ movie.directors.join(' / ') }}
                </el-descriptions-item>
                <el-descriptions-item label="主演">
                  {{ movie.actors.join(' / ') }}
                </el-descriptions-item>
                <el-descriptions-item label="类型">
                  <el-tag 
                    v-for="genre in movie.genres" 
                    :key="genre" 
                    style="margin-right: 5px;"
                  >
                    {{ genre }}
                  </el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="制片国家/地区">
                  {{ movie.countries.join(' / ') }}
                </el-descriptions-item>
                <el-descriptions-item label="语言">
                  {{ movie.language }}
                </el-descriptions-item>
                <el-descriptions-item label="上映日期">
                  {{ movie.releaseDate }}
                </el-descriptions-item>
                <el-descriptions-item label="片长">
                  {{ movie.duration }}
                </el-descriptions-item>
                <el-descriptions-item label="年份">
                  {{ movie.year }}
                </el-descriptions-item>
                <el-descriptions-item v-if="movie.imdbId" label="IMDb">
                  {{ movie.imdbId }}
                </el-descriptions-item>
                <el-descriptions-item v-if="movie.aka && movie.aka.length" label="又名">
                  {{ movie.aka.join(' / ') }}
                </el-descriptions-item>
              </el-descriptions>
              
              <el-divider />
              
              <div v-if="movie.quote" class="movie-quote">
                <el-icon><ChatDotRound /></el-icon>
                <span>"{{ movie.quote }}"</span>
              </div>
              
              <div class="movie-summary">
                <h3>剧情简介</h3>
                <p>{{ movie.summary }}</p>
              </div>
            </div>
          </el-col>
        </el-row>
      </div>
    </el-card>
    
    <el-card style="margin-top: 24px;">
      <comment-section
        :comments="comments"
        :can-comment="isLoggedIn"
        :current-user-id="currentUserId"
        @submit="handleCommentSubmit"
        @delete="handleCommentDelete"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { movieAPI, commentAPI, favoriteAPI } from '../api';
import CommentSection from '../components/CommentSection.vue';
import type { Movie, Comment } from '../types';

const route = useRoute();
const router = useRouter();
const loading = ref(false);
const movie = ref<Movie | null>(null);
const comments = ref<Comment[]>([]);
const isFavorited = ref(false);

const isLoggedIn = computed(() => !!localStorage.getItem('token'));
const currentUserId = computed(() => {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    const user = JSON.parse(userStr);
    return user.id;
  }
  return null;
});

const fetchMovie = async () => {
  loading.value = true;
  try {
    const { data } = await movieAPI.getDetail(route.params.id as string);
    movie.value = data;
    await checkFavoriteStatus();
    await fetchComments();
  } catch (error: any) {
    ElMessage.error('获取电影详情失败');
    router.push('/movies');
  } finally {
    loading.value = false;
  }
};

const checkFavoriteStatus = async () => {
  if (!isLoggedIn.value || !movie.value) return;
  
  try {
    const { data } = await favoriteAPI.check(movie.value._id);
    isFavorited.value = data.isFavorited;
  } catch (error) {
    console.error('检查收藏状态失败', error);
  }
};

const fetchComments = async () => {
  if (!movie.value) return;
  
  try {
    const { data } = await commentAPI.getList(movie.value._id);
    comments.value = data;
  } catch (error) {
    console.error('获取评论失败', error);
  }
};

const toggleFavorite = async () => {
  if (!isLoggedIn.value) {
    ElMessage.warning('请先登录');
    router.push('/login');
    return;
  }
  
  if (!movie.value) return;
  
  try {
    if (isFavorited.value) {
      await favoriteAPI.remove(movie.value._id);
      isFavorited.value = false;
      ElMessage.success('已取消收藏');
    } else {
      await favoriteAPI.add(movie.value._id);
      isFavorited.value = true;
      ElMessage.success('收藏成功');
    }
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '操作失败');
  }
};

const handleCommentSubmit = async (data: { content: string; rating?: number }) => {
  if (!movie.value) return;
  
  try {
    await commentAPI.create(movie.value._id, data);
    ElMessage.success('评论发表成功');
    await fetchComments();
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '发表评论失败');
  }
};

const handleCommentDelete = async (commentId: string) => {
  try {
    await ElMessageBox.confirm('确定要删除这条评论吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    });
    
    await commentAPI.delete(commentId);
    ElMessage.success('评论已删除');
    await fetchComments();
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('删除评论失败');
    }
  }
};

const openDouban = () => {
  if (movie.value && movie.value.doubanUrl) {
    window.open(movie.value.doubanUrl, '_blank');
  }
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

onMounted(() => {
  fetchMovie();
});
</script>

<style scoped>
.movie-detail-container {
  max-width: 1400px;
  margin: 0 auto;
}

.movie-detail {
  padding: 20px;
}

.movie-poster {
  position: relative;
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  margin-bottom: 20px;
}

.movie-poster img {
  width: 100%;
  display: block;
}

.rank-badge {
  position: absolute;
  top: 16px;
  left: 16px;
  background: rgba(255, 152, 0, 0.95);
  color: white;
  font-weight: bold;
  padding: 8px 16px;
  border-radius: 24px;
  font-size: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.action-buttons {
  margin-top: 20px;
}

.movie-info {
  padding: 0;
}

.movie-title {
  font-size: 32px;
  font-weight: 700;
  color: #333;
  margin: 0 0 12px 0;
}

.movie-original-title {
  font-size: 18px;
  color: #666;
  margin: 0 0 20px 0;
}

.movie-rating {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
}

.rating-count {
  color: #999;
  font-size: 14px;
}

.movie-quote {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
  margin-bottom: 24px;
  font-size: 16px;
  color: #666;
  font-style: italic;
}

.movie-quote .el-icon {
  font-size: 24px;
  color: #409eff;
}

.movie-summary {
  margin-top: 24px;
}

.movie-summary h3 {
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin: 0 0 16px 0;
}

.movie-summary p {
  font-size: 15px;
  line-height: 1.8;
  color: #666;
  text-align: justify;
}
</style>