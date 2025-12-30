<template>
  <el-card>
    <template #header><h2>高级搜索</h2></template>
    <el-form :model="searchForm" label-width="100px">
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="标题">
            <el-input v-model="searchForm.title" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="类型">
            <el-select v-model="searchForm.genre" clearable>
              <el-option v-for="g in genres" :key="g" :value="g" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="年份">
            <el-input-number v-model="searchForm.year" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="评分范围">
            <el-col :span="11">
              <el-input-number v-model="searchForm.minRating" :max="10" />
            </el-col>
            <el-col :span="2" style="text-align: center;">-</el-col>
            <el-col :span="11">
              <el-input-number v-model="searchForm.maxRating" :max="10" />
            </el-col>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="导演">
            <el-input v-model="searchForm.director" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="演员">
            <el-input v-model="searchForm.actor" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-form-item>
        <el-button type="primary" @click="search">搜索</el-button>
        <el-button @click="reset">重置</el-button>
      </el-form-item>
    </el-form>
    
    <div v-loading="loading" class="results">
      <el-card v-for="movie in results" :key="movie._id" @click="$router.push(`/movies/${movie._id}`)">
        <el-row :gutter="20">
          <el-col :span="4">
            <img :src="movie.localCoverPath || movie.coverImageUrl" style="width: 100%;" />
          </el-col>
          <el-col :span="20">
            <h3>{{ movie.title }}</h3>
            <el-rate v-model="movie.rating" disabled :max="10" />
            <p>{{ movie.year }} / {{ movie.genres.join(', ') }}</p>
          </el-col>
        </el-row>
      </el-card>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { movieAPI } from '../api';
import { ElMessage } from 'element-plus';

const loading = ref(false);
const results = ref<any[]>([]);
const genres = ref(['剧情', '喜剧', '动作', '爱情', '科幻', '动画', '悬疑']);
const searchForm = ref({
  title: '', genre: '', year: null, minRating: null, maxRating: null, director: '', actor: ''
});

const search = async () => {
  loading.value = true;
  try {
    const params = Object.fromEntries(Object.entries(searchForm.value).filter(([_, v]) => v !== '' && v !== null));
    const { data } = await movieAPI.advancedSearch(params);
    results.value = data.movies;
    ElMessage.success(`找到 ${data.total} 部电影`);
  } catch (error) {
    ElMessage.error('搜索失败');
  } finally {
    loading.value = false;
  }
};

const reset = () => {
  searchForm.value = { title: '', genre: '', year: null, minRating: null, maxRating: null, director: '', actor: '' };
  results.value = [];
};
</script>

<style scoped>
.results { margin-top: 24px; display: flex; flex-direction: column; gap: 16px; }
</style>