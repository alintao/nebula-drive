<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { api } from '../api';
import { ElMessage } from 'element-plus';

const loading = ref(false);
const entries = ref<any[]>([]);
const storageId = ref<number | null>(null);
const storages = ref<any[]>([]);
const mediaType = ref<'video' | 'document'>('video');

const VIDEO_EXTS = ['mp4', 'avi', 'mkv', 'mov', 'flv', 'wmv', 'webm'];
const DOC_EXTS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'ppt', 'pptx', 'txt', 'md'];

const pageTitle = computed(() => mediaType.value === 'video' ? '视频' : '文档');

onMounted(async () => {
  try {
    const r = await api('/storages');
    storages.value = r.storages;
    if (r.storages.length) storageId.value = r.storages[0].id;
    await load();
  } catch (e: any) {
    ElMessage.error(e.message || '加载失败');
  }
});

async function load() {
  if (!storageId.value) return;
  loading.value = true;
  try {
    const type = mediaType.value === 'video' ? 'video' : 'document';
    const r = await api(`/files/by-type?storageId=${storageId.value}&type=${type}`);
    entries.value = r.entries;
  } catch (e: any) {
    ElMessage.error(e.message || '加载失败');
  } finally {
    loading.value = false;
  }
}

function switchType(type: 'video' | 'document') {
  mediaType.value = type;
  load();
}

function fmtSize(bytes: number) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + units[i];
}

function fmtTime(ts: string) {
  return new Date(ts).toLocaleString('zh-CN');
}
</script>

<template>
  <div class="media-page">
    <div class="page-header glass">
      <h2>{{ pageTitle }}</h2>
      <div class="header-controls">
        <el-radio-group v-model="mediaType" @change="(v) => switchType(v as 'video' | 'document')">
          <el-radio-button value="video">视频</el-radio-button>
          <el-radio-button value="document">文档</el-radio-button>
        </el-radio-group>
        <el-select v-model="storageId" size="small" @change="load" style="width: 180px">
          <el-option v-for="s in storages" :key="s.id" :label="s.name" :value="s.id" />
        </el-select>
      </div>
    </div>

    <div class="media-grid" v-loading="loading">
      <div v-for="row in entries" :key="row.path" class="media-item glass-card">
        <el-icon :size="42" :color="mediaType === 'video' ? '#ef4444' : '#2563eb'">
          <VideoPlay v-if="mediaType === 'video'" />
          <Document v-else />
        </el-icon>
        <div class="media-name">{{ row.name }}</div>
        <div class="media-meta">{{ row.isDir ? '文件夹' : fmtSize(row.size) }}</div>
      </div>
      <div v-if="!loading && !entries.length" class="empty">暂无{{ pageTitle }}文件</div>
    </div>
  </div>
</template>

<style scoped>
.media-page { padding: 20px; }
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  margin-bottom: 20px;
}
.page-header h2 { margin: 0; font-size: 20px; }
.header-controls { display: flex; gap: 12px; align-items: center; }
.media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 14px;
}
.media-item {
  border-radius: 18px;
  padding: 18px 14px;
  cursor: pointer;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.media-item:hover { transform: translateY(-2px); }
.media-name {
  font-size: 14px;
  font-weight: 500;
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.media-meta { font-size: 12px; color: var(--text-secondary); }
.empty { grid-column: 1 / -1; text-align: center; padding: 60px; color: var(--text-secondary); }
</style>
