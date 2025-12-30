<template>
  <div class="statistics">
    <el-row :gutter="20">
      <el-col :span="8">
        <el-card>
          <el-statistic title="电影总数" :value="stats.totalMovies" />
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card>
          <el-statistic title="平均评分" :value="stats.avgRating" :precision="2" />
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card>
          <el-statistic title="类型数量" :value="stats.topGenres?.length || 0" />
        </el-card>
      </el-col>
    </el-row>
    
    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="12">
        <el-card>
          <template #header><h3>评分分布</h3></template>
          <div ref="ratingChart" style="height: 400px;"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header><h3>年份分布</h3></template>
          <div ref="yearChart" style="height: 400px;"></div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';
import * as echarts from 'echarts';
import { statsAPI } from '../api';
import { ElMessage } from 'element-plus';

const stats = ref<any>({});
const ratingChart = ref();
const yearChart = ref();

const fetchStats = async () => {
  try {
    const { data } = await statsAPI.getOverview();
    stats.value = data;
  } catch (error) {
    ElMessage.error('获取统计数据失败');
  }
};

const initCharts = async () => {
  await nextTick();
  
  try {
    const { data: ratingData } = await statsAPI.getRatingDistribution();
    const ratingChartInstance = echarts.init(ratingChart.value);
    
    const labels = ratingData.map((item: any) => item.label);
    const counts = ratingData.map((item: any) => item.count);
    
    ratingChartInstance.setOption({
      tooltip: { 
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        },
        formatter: (params: any) => {
          const param = params[0];
          return `${param.name}<br/>电影数量: ${param.value}`;
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: { 
        type: 'category', 
        data: labels,
        name: '评分区间',
        axisLabel: {
          interval: 0,
          rotate: 0
        }
      },
      yAxis: { 
        type: 'value',
        name: '电影数量'
      },
      series: [{ 
        data: counts, 
        type: 'bar', 
        itemStyle: { 
          color: '#5470c6',
          borderRadius: [4, 4, 0, 0]
        },
        label: {
          show: true,
          position: 'top',
          formatter: '{c}'
        },
        barWidth: '60%'
      }]
    });
  } catch (error) {
    ElMessage.error('加载评分分布图表失败');
    console.error('Rating chart error:', error);
  }
  
  try {
    const { data: yearData } = await statsAPI.getYearDistribution();
    const yearChartInstance = echarts.init(yearChart.value);
    
    const years = yearData.map((d: any) => d._id).sort((a: number, b: number) => a - b);
    const counts = years.map((y: number) => yearData.find((d: any) => d._id === y)?.count || 0);
    
    yearChartInstance.setOption({
      tooltip: { 
        trigger: 'axis',
        axisPointer: {
          type: 'cross'
        },
        formatter: (params: any) => {
          const param = params[0];
          return `${param.name}年<br/>电影数量: ${param.value}`;
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: { 
        type: 'category', 
        data: years,
        name: '年份',
        boundaryGap: false
      },
      yAxis: { 
        type: 'value',
        name: '电影数量'
      },
      series: [{ 
        data: counts, 
        type: 'line', 
        smooth: true, 
        itemStyle: { color: '#91cc75' },
        areaStyle: {
          color: 'rgba(145, 204, 117, 0.3)'
        },
        lineStyle: {
          width: 3
        }
      }]
    });
  } catch (error) {
    ElMessage.error('加载年份分布图表失败');
    console.error('Year chart error:', error);
  }
};

onMounted(() => {
  fetchStats();
  initCharts();
});
</script>

<style scoped>
.statistics { 
  max-width: 1400px; 
  margin: 0 auto; 
}
</style>