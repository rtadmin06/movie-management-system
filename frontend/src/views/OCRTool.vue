<template>
  <div class="ocr-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <h2>图片文字识别 (OCR)</h2>
          <el-tag type="success">支持中英文识别</el-tag>
        </div>
      </template>

      <el-alert
        title="使用说明"
        type="info"
        :closable="false"
        style="margin-bottom: 24px;"
      >
        <p>1. 点击下方上传按钮选择图片文件</p>
        <p>2. 支持 JPG、PNG、GIF 等常见图片格式</p>
        <p>3. 为获得最佳识别效果，请上传清晰的图片</p>
        <p>4. 系统支持中文和英文文字识别</p>
      </el-alert>

      <el-row :gutter="20">
        <el-col :span="12">
          <el-card shadow="never" class="upload-card">
            <template #header>
              <h3>上传图片</h3>
            </template>
            
            <el-upload
              ref="uploadRef"
              class="upload-area"
              drag
              :auto-upload="false"
              :on-change="handleFileChange"
              :limit="1"
              :file-list="fileList"
              accept="image/*"
            >
              <el-icon class="el-icon--upload"><Upload /></el-icon>
              <div class="el-upload__text">
                将图片拖到此处，或<em>点击上传</em>
              </div>
              <template #tip>
                <div class="el-upload__tip">
                  支持 jpg/png/gif 文件，且不超过 10MB
                </div>
              </template>
            </el-upload>

            <div v-if="imagePreview" class="image-preview">
              <el-divider>图片预览</el-divider>
              <img :src="imagePreview" alt="预览图片" />
            </div>

            <el-button 
              type="primary" 
              size="large"
              style="width: 100%; margin-top: 16px;"
              :loading="recognizing"
              :disabled="!selectedFile"
              @click="recognizeImage"
            >
              <el-icon v-if="!recognizing"><MagicStick /></el-icon>
              {{ recognizing ? '识别中...' : '开始识别' }}
            </el-button>
          </el-card>
        </el-col>

        <el-col :span="12">
          <el-card shadow="never" class="result-card">
            <template #header>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <h3>识别结果</h3>
                <el-button 
                  v-if="recognizedText" 
                  size="small" 
                  @click="copyText"
                >
                  <el-icon><CopyDocument /></el-icon>
                  复制文本
                </el-button>
              </div>
            </template>

            <div v-if="!recognizedText && !recognizing" class="empty-result">
              <el-empty description="暂无识别结果，请上传图片并开始识别" />
            </div>

            <div v-if="recognizing" class="recognizing-status">
              <el-icon class="is-loading" :size="40"><Loading /></el-icon>
              <p style="margin-top: 16px; color: #666;">正在识别图片中的文字...</p>
              <el-progress 
                :percentage="recognitionProgress" 
                :indeterminate="true"
                style="margin-top: 12px;"
              />
            </div>

            <div v-if="recognizedText && !recognizing" class="result-text">
              <el-input
                v-model="recognizedText"
                type="textarea"
                :rows="15"
                placeholder="识别结果将显示在这里"
              />
              
              <div class="result-stats">
                <el-divider />
                <el-row :gutter="20">
                  <el-col :span="8">
                    <el-statistic title="字符数" :value="recognizedText.length" />
                  </el-col>
                  <el-col :span="8">
                    <el-statistic title="行数" :value="recognizedText.split('\n').length" />
                  </el-col>
                  <el-col :span="8">
                    <el-statistic title="单词数" :value="countWords(recognizedText)" />
                  </el-col>
                </el-row>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </el-card>

    <!-- 历史记录 -->
    <el-card v-if="history.length > 0" style="margin-top: 24px;">
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h3>识别历史</h3>
          <el-button size="small" type="danger" @click="clearHistory">
            <el-icon><Delete /></el-icon>
            清空历史
          </el-button>
        </div>
      </template>

      <el-timeline>
        <el-timeline-item
          v-for="(item, index) in history"
          :key="index"
          :timestamp="item.timestamp"
          placement="top"
        >
          <el-card>
            <div class="history-item">
              <img :src="item.imageUrl" alt="历史图片" class="history-image" />
              <div class="history-text">
                <p>{{ truncateText(item.text, 100) }}</p>
                <el-button 
                  size="small" 
                  text 
                  @click="viewHistoryItem(item)"
                >
                  查看完整内容
                </el-button>
              </div>
            </div>
          </el-card>
        </el-timeline-item>
      </el-timeline>
    </el-card>

    <!-- 查看历史详情对话框 -->
    <el-dialog
      v-model="showHistoryDialog"
      title="识别详情"
      width="60%"
    >
      <div v-if="currentHistoryItem">
        <el-row :gutter="20">
          <el-col :span="12">
            <img :src="currentHistoryItem.imageUrl" style="width: 100%;" />
          </el-col>
          <el-col :span="12">
            <el-input
              :model-value="currentHistoryItem.text"
              type="textarea"
              :rows="15"
              readonly
            />
          </el-col>
        </el-row>
      </div>
      <template #footer>
        <el-button @click="showHistoryDialog = false">关闭</el-button>
        <el-button type="primary" @click="copyHistoryText">复制文本</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { ocrAPI } from '../api';

interface HistoryItem {
  imageUrl: string;
  text: string;
  timestamp: string;
}

const uploadRef = ref();
const fileList = ref<any[]>([]);
const selectedFile = ref<File | null>(null);
const imagePreview = ref('');
const recognizing = ref(false);
const recognitionProgress = ref(0);
const recognizedText = ref('');
const history = ref<HistoryItem[]>([]);
const showHistoryDialog = ref(false);
const currentHistoryItem = ref<HistoryItem | null>(null);

// 处理文件选择
const handleFileChange = (file: any) => {
  selectedFile.value = file.raw;
  fileList.value = [file];
  
  // 生成预览
  const reader = new FileReader();
  reader.onload = (e) => {
    imagePreview.value = e.target?.result as string;
  };
  reader.readAsDataURL(file.raw);
};

// 识别图片
const recognizeImage = async () => {
  if (!selectedFile.value) {
    ElMessage.warning('请先选择图片');
    return;
  }

  recognizing.value = true;
  recognitionProgress.value = 0;

  // 模拟进度
  const progressInterval = setInterval(() => {
    if (recognitionProgress.value < 90) {
      recognitionProgress.value += 10;
    }
  }, 300);

  try {
    const { data } = await ocrAPI.recognize(selectedFile.value);
    
    clearInterval(progressInterval);
    recognitionProgress.value = 100;
    
    recognizedText.value = data.text || '未识别到文字内容';
    
    // 添加到历史记录
    if (data.text) {
      history.value.unshift({
        imageUrl: imagePreview.value,
        text: data.text,
        timestamp: new Date().toLocaleString()
      });
      
      // 限制历史记录数量
      if (history.value.length > 10) {
        history.value = history.value.slice(0, 10);
      }
    }
    
    ElMessage.success('识别完成');
  } catch (error: any) {
    clearInterval(progressInterval);
    ElMessage.error(error.response?.data?.message || '识别失败，请重试');
    recognizedText.value = '';
  } finally {
    recognizing.value = false;
    recognitionProgress.value = 0;
  }
};

// 复制文本
const copyText = async () => {
  try {
    await navigator.clipboard.writeText(recognizedText.value);
    ElMessage.success('已复制到剪贴板');
  } catch (error) {
    ElMessage.error('复制失败');
  }
};

// 复制历史文本
const copyHistoryText = async () => {
  if (!currentHistoryItem.value) return;
  
  try {
    await navigator.clipboard.writeText(currentHistoryItem.value.text);
    ElMessage.success('已复制到剪贴板');
  } catch (error) {
    ElMessage.error('复制失败');
  }
};

// 统计单词数
const countWords = (text: string) => {
  const words = text.trim().split(/\s+/);
  return words.filter(word => word.length > 0).length;
};

// 截断文本
const truncateText = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// 查看历史项
const viewHistoryItem = (item: HistoryItem) => {
  currentHistoryItem.value = item;
  showHistoryDialog.value = true;
};

// 清空历史
const clearHistory = () => {
  history.value = [];
  ElMessage.success('历史记录已清空');
};
</script>

<style scoped>
.ocr-container {
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

.upload-card,
.result-card {
  min-height: 500px;
}

.upload-card h3,
.result-card h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.upload-area {
  width: 100%;
}

.upload-area :deep(.el-upload-dragger) {
  width: 100%;
  height: 200px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.el-icon--upload {
  font-size: 67px;
  color: #409eff;
  margin-bottom: 16px;
}

.image-preview {
  margin-top: 24px;
}

.image-preview img {
  width: 100%;
  max-height: 300px;
  object-fit: contain;
  border-radius: 8px;
  border: 1px solid #dcdfe6;
}

.empty-result {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

.recognizing-status {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  padding: 40px;
}

.result-text {
  animation: fadeIn 0.5s;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.result-stats {
  margin-top: 20px;
}

.history-item {
  display: flex;
  gap: 16px;
}

.history-image {
  width: 120px;
  height: 80px;
  object-fit: cover;
  border-radius: 4px;
  flex-shrink: 0;
}

.history-text {
  flex: 1;
}

.history-text p {
  margin: 0 0 8px 0;
  color: #666;
  line-height: 1.6;
}
</style>