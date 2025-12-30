<template>
  <el-card class="movie-card" shadow="hover" @click="handleClick">
    <div class="movie-cover">
      <img :src="imageUrl" :alt="movie.title" />
      <div class="rank-badge">{{ movie.rank }}</div>
    </div>
    
    <div class="movie-info">
      <h3 class="movie-title">{{ movie.title }}</h3>
      <p class="movie-subtitle">{{ movie.originalTitle }}</p>
      
      <div class="movie-rating">
        <el-rate :model-value="movie.rating" disabled :max="10" />
        <span class="rating-text">{{ movie.rating }}</span>
      </div>
      
      <div class="movie-meta">
        <el-tag size="small">{{ movie.year }}</el-tag>
        <el-tag v-for="genre in movie.genres.slice(0, 2)" :key="genre" size="small" type="info">
          {{ genre }}
        </el-tag>
      </div>
    </div>
    
    <div class="movie-actions" @click.stop>
      <slot name="actions"></slot>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Movie } from '../types';

interface Props {
  movie: Movie;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  click: [id: string];
}>();

const imageUrl = computed(() => {
  return props.movie.localCoverPath || props.movie.coverImageUrl || '/placeholder.png';
});

const handleClick = () => {
  emit('click', props.movie._id);
};
</script>

<style scoped>
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
  height: 300px;
  overflow: hidden;
  border-radius: 8px;
  margin-bottom: 12px;
}

.movie-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.rank-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  background: rgba(255, 152, 0, 0.9);
  color: white;
  padding: 4px 10px;
  border-radius: 12px;
  font-weight: bold;
  font-size: 12px;
}

.movie-info {
  padding: 8px 0;
}

.movie-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 4px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.movie-subtitle {
  font-size: 12px;
  color: #999;
  margin: 0 0 8px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.movie-rating {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.rating-text {
  font-weight: 600;
  color: #ff9900;
}

.movie-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.movie-actions {
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
  margin-top: 12px;
}
</style>