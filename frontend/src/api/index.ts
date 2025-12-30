import axios from 'axios';
import type { Movie, User, Comment, LoginData, RegisterData } from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000
});

// 请求拦截器：添加token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器：处理错误
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// 认证API
export const authAPI = {
  login: (data: LoginData) => api.post('/auth/login', data),
  register: (data: RegisterData) => api.post('/auth/register', data)
};

// 电影API
export const movieAPI = {
  getList: (params?: any) => api.get('/movies', { params }),
  getDetail: (id: string) => api.get(`/movies/${id}`),
  create: (data: FormData) => api.post('/movies', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  update: (id: string, data: FormData) => api.put(`/movies/${id}`, data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  delete: (id: string) => api.delete(`/movies/${id}`),
  fullTextSearch: (params: any) => api.get('/movies/fulltext-search', { params }),
  advancedSearch: (params: any) => api.get('/movies/advanced-search', { params }),
  export: (format: string) => api.get(`/movies/export/data?format=${format}`, {
    responseType: 'blob'
  })
};

// 统计API
export const statsAPI = {
  getOverview: () => api.get('/stats/overview'),
  getRatingDistribution: () => api.get('/stats/rating-distribution'),
  getYearDistribution: () => api.get('/stats/year-distribution')
};

// 评论API
export const commentAPI = {
  getList: (movieId: string) => api.get(`/comments/${movieId}`),
  create: (movieId: string, data: { content: string; rating?: number }) =>
    api.post(`/comments/${movieId}`, data),
  delete: (id: string) => api.delete(`/comments/${id}`)
};

// 收藏API
export const favoriteAPI = {
  getList: () => api.get('/favorites'),
  add: (movieId: string) => api.post(`/favorites/${movieId}`),
  remove: (movieId: string) => api.delete(`/favorites/${movieId}`),
  check: (movieId: string) => api.get(`/favorites/check/${movieId}`)
};

// 推荐API
export const recommendationAPI = {
  get: () => api.get('/recommendations')
};

// OCR API
export const ocrAPI = {
  recognize: (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post('/ocr', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
};

export default api;