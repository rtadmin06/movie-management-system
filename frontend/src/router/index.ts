import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue')
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../views/Register.vue')
  },
  {
    path: '/',
    component: () => import('../views/Dashboard.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/movies'
      },
      {
        path: 'movies',
        name: 'MovieList',
        component: () => import('../views/MovieList.vue')
      },
      {
        path: 'movies/:id',
        name: 'MovieDetail',
        component: () => import('../views/MovieDetail.vue')
      },
      {
        path: 'statistics',
        name: 'Statistics',
        component: () => import('../views/Statistics.vue')
      },
      {
        path: 'search',
        name: 'AdvancedSearch',
        component: () => import('../views/AdvancedSearch.vue')
      },
      {
        path: 'favorites',
        name: 'Favorites',
        component: () => import('../views/Favorites.vue')
      },
      {
        path: 'ocr',
        name: 'OCRTool',
        component: () => import('../views/OCRTool.vue')
      },
      {
        path: 'recommendations',
        name: 'Recommendations',
        component: () => import('../views/Recommendations.vue')
      }
    ]
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// 路由守卫
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token');
  
  if (to.meta.requiresAuth && !token) {
    next('/login');
  } else if ((to.path === '/login' || to.path === '/register') && token) {
    next('/');
  } else {
    next();
  }
});

export default router;