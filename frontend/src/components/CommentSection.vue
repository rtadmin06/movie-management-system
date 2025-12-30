<template>
  <div class="comment-section">
    <div class="comment-header">
      <h3>评论 ({{ comments.length }})</h3>
    </div>

    <!-- 发表评论 -->
    <div v-if="canComment" class="comment-form">
      <el-input
        v-model="newComment"
        type="textarea"
        :rows="3"
        placeholder="写下你的评论..."
        maxlength="500"
        show-word-limit
      />
      <div class="comment-form-actions">
        <el-rate v-model="newRating" :max="10" />
        <el-button type="primary" @click="submitComment" :loading="submitting">
          发表评论
        </el-button>
      </div>
    </div>

    <!-- 评论列表 -->
    <div class="comment-list">
      <div v-for="comment in comments" :key="comment._id" class="comment-item">
        <div class="comment-avatar">
          <el-avatar :size="40">{{ comment.username[0] }}</el-avatar>
        </div>
        <div class="comment-content">
          <div class="comment-header-info">
            <span class="comment-username">{{ comment.username }}</span>
            <el-rate 
              v-if="comment.rating" 
              :model-value="comment.rating" 
              disabled 
              size="small"
              :max="10"
            />
          </div>
          <p class="comment-text">{{ comment.content }}</p>
          <div class="comment-footer">
            <span class="comment-time">{{ formatTime(comment.createdAt) }}</span>
            <el-button 
              v-if="canDelete(comment)" 
              type="danger" 
              text 
              size="small"
              @click="deleteComment(comment._id)"
            >
              删除
            </el-button>
          </div>
        </div>
      </div>

      <el-empty v-if="comments.length === 0" description="暂无评论" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import type { Comment } from '../types';

interface Props {
  comments: Comment[];
  canComment?: boolean;
  currentUserId?: string;
}

const props = withDefaults(defineProps<Props>(), {
  canComment: true
});

const emit = defineEmits<{
  submit: [data: { content: string; rating?: number }];
  delete: [commentId: string];
}>();

const newComment = ref('');
const newRating = ref(0);
const submitting = ref(false);

const submitComment = async () => {
  if (!newComment.value.trim()) {
    ElMessage.warning('请输入评论内容');
    return;
  }

  submitting.value = true;
  try {
    emit('submit', {
      content: newComment.value,
      rating: newRating.value || undefined
    });
    newComment.value = '';
    newRating.value = 0;
  } finally {
    submitting.value = false;
  }
};

const deleteComment = (commentId: string) => {
  emit('delete', commentId);
};

const canDelete = (comment: Comment) => {
  return props.currentUserId && comment.userId === props.currentUserId;
};

const formatTime = (time: string) => {
  const date = new Date(time);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  
  return date.toLocaleDateString();
};
</script>

<style scoped>
.comment-section {
  margin-top: 24px;
}

.comment-header h3 {
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 600;
}

.comment-form {
  margin-bottom: 24px;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
}

.comment-form-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
}

.comment-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.comment-item {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: white;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
}

.comment-avatar {
  flex-shrink: 0;
}

.comment-content {
  flex: 1;
  min-width: 0;
}

.comment-header-info {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.comment-username {
  font-weight: 600;
  color: #333;
}

.comment-text {
  margin: 0 0 8px 0;
  color: #666;
  line-height: 1.6;
  word-break: break-word;
}

.comment-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.comment-time {
  font-size: 12px;
  color: #999;
}
</style>