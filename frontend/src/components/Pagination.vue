<template>
  <div class="pagination-wrapper">
    <el-pagination
      v-model:current-page="currentPage"
      v-model:page-size="pageSize"
      :page-sizes="pageSizes"
      :total="total"
      :background="background"
      :layout="layout"
      @size-change="handleSizeChange"
      @current-change="handleCurrentChange"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

interface Props {
  total: number;
  currentPage?: number;
  pageSize?: number;
  pageSizes?: number[];
  layout?: string;
  background?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  currentPage: 1,
  pageSize: 20,
  pageSizes: () => [10, 20, 50, 100],
  layout: 'total, sizes, prev, pager, next, jumper',
  background: true
});

const emit = defineEmits<{
  'update:currentPage': [page: number];
  'update:pageSize': [size: number];
  'page-change': [page: number];
  'size-change': [size: number];
}>();

const currentPage = ref(props.currentPage);
const pageSize = ref(props.pageSize);

watch(() => props.currentPage, (val) => {
  currentPage.value = val;
});

watch(() => props.pageSize, (val) => {
  pageSize.value = val;
});

const handleCurrentChange = (page: number) => {
  emit('update:currentPage', page);
  emit('page-change', page);
};

const handleSizeChange = (size: number) => {
  emit('update:pageSize', size);
  emit('size-change', size);
};
</script>

<style scoped>
.pagination-wrapper {
  display: flex;
  justify-content: center;
  padding: 20px 0;
}
</style>