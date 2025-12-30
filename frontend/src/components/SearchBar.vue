<template>
  <div class="search-bar">
    <el-input
      v-model="searchQuery"
      :placeholder="placeholder"
      :prefix-icon="Search"
      size="large"
      clearable
      @keyup.enter="handleSearch"
      @clear="handleClear"
    >
      <template #append>
        <el-button :icon="Search" @click="handleSearch" />
      </template>
    </el-input>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { Search } from '@element-plus/icons-vue';

interface Props {
  modelValue?: string;
  placeholder?: string;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  placeholder: '搜索...'
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
  search: [query: string];
}>();

const searchQuery = ref(props.modelValue);

watch(() => props.modelValue, (val) => {
  searchQuery.value = val;
});

watch(searchQuery, (val) => {
  emit('update:modelValue', val);
});

const handleSearch = () => {
  emit('search', searchQuery.value);
};

const handleClear = () => {
  searchQuery.value = '';
  emit('search', '');
};
</script>

<style scoped>
.search-bar {
  width: 100%;
}
</style>