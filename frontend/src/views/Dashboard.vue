<template>
  <el-container class="dashboard-container">
    <el-aside width="250px" class="sidebar">
      <div class="logo">
        <el-icon :size="32"><Film /></el-icon>
        <span>电影管理系统</span>
      </div>
      
      <el-menu
        :default-active="activeMenu"
        router
        class="sidebar-menu"
        background-color="#2c3e50"
        text-color="#ecf0f1"
        active-text-color="#3498db"
      >
        <el-menu-item index="/movies">
          <el-icon><List /></el-icon>
          <span>电影列表</span>
        </el-menu-item>
        
        <el-menu-item index="/search">
          <el-icon><Search /></el-icon>
          <span>高级搜索</span>
        </el-menu-item>
        
        <el-menu-item index="/favorites">
          <el-icon><Star /></el-icon>
          <span>我的收藏</span>
        </el-menu-item>
        
        <el-menu-item index="/recommendations">
          <el-icon><MagicStick /></el-icon>
          <span>推荐电影</span>
        </el-menu-item>
        
        <el-menu-item index="/statistics">
          <el-icon><DataAnalysis /></el-icon>
          <span>数据统计</span>
        </el-menu-item>
        
        <el-menu-item index="/ocr">
          <el-icon><Picture /></el-icon>
          <span>图片识别</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    
    <el-container>
      <el-header class="header">
        <div class="header-left">
          <h2>{{ currentTitle }}</h2>
        </div>
        
        <div class="header-right">
          <el-dropdown @command="handleCommand">
            <div class="user-info">
              <el-icon><User /></el-icon>
              <span>{{ username }}</span>
              <el-icon><ArrowDown /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="logout">
                  <el-icon><SwitchButton /></el-icon>
                  退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      
      <el-main class="main-content">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';

const router = useRouter();
const route = useRoute();

const username = ref('');
const activeMenu = computed(() => route.path);

const titles: Record<string, string> = {
  '/movies': '电影列表',
  '/search': '高级搜索',
  '/favorites': '我的收藏',
  '/recommendations': '推荐电影',
  '/statistics': '数据统计',
  '/ocr': '图片文字识别'
};

const currentTitle = computed(() => {
  const path = route.path.split('/')[1] ? `/${route.path.split('/')[1]}` : '/movies';
  return titles[path] || '电影管理系统';
});

onMounted(() => {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    const user = JSON.parse(userStr);
    username.value = user.username;
  }
});

const handleCommand = async (command: string) => {
  if (command === 'logout') {
    try {
      await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      });
      
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      ElMessage.success('已退出登录');
      router.push('/login');
    } catch {
      // 取消退出
    }
  }
};
</script>

<style scoped>
.dashboard-container {
  height: 100vh;
  overflow: hidden;
}

.sidebar {
  background-color: #2c3e50;
  color: #ecf0f1;
  overflow-y: auto;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 24px 20px;
  font-size: 20px;
  font-weight: 600;
  color: #ecf0f1;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.sidebar-menu {
  border: none;
}

.sidebar-menu .el-menu-item {
  border-radius: 0;
  margin: 0;
}

.sidebar-menu .el-menu-item:hover {
  background-color: rgba(52, 152, 219, 0.1) !important;
}

.sidebar-menu .el-menu-item.is-active {
  background-color: rgba(52, 152, 219, 0.2) !important;
  border-left: 3px solid #3498db;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  padding: 0 30px;
}

.header-left h2 {
  font-size: 24px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 20px;
  background: #f5f7fa;
  cursor: pointer;
  transition: all 0.3s;
}

.user-info:hover {
  background: #e8ecf0;
}

.main-content {
  background: #f5f7fa;
  padding: 24px;
  overflow-y: auto;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>