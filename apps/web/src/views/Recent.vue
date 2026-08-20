<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../api';
import { ElMessage } from 'element-plus';

const router = useRouter();
const loading = ref(false);
const entries = ref<any[]>([]);
const storageId = ref<number | null>(null);
const storages = ref<any[]>([]);
const filterType = ref<'all' | 'files' | 'folders'>('all');

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
    const r = await api(`/files/recent?storageId=${storageId.value}&limit=100`);
    entries.value = r.entries;
  } catch (e: any) {
    ElMessage.error(e.message || '加载最近文件失败');
  } finally {
    loading.value = false;
  }
}

/** 过滤后的条目 */
const filteredEntries = computed(() => {
  if (filterType.value === 'all') return entries.value;
  if (filterType.value === 'folders') return entries.value.filter(e => e.isDir);
  return entries.value.filter(e => !e.isDir);
});

/** 统计信息 */
const stats = computed(() => {
  const files = entries.value.filter(e => !e.isDir);
  const folders = entries.value.filter(e => e.isDir);
  return { total: entries.value.length, files: files.length, folders: folders.length };
});

/** 获取文件类型图标和颜色 */
function getFileType(row: any) {
  const name = row.name.toLowerCase();
  if (row.isDir) return { icon: 'Folder', color: '#409eff', label: '文件夹' };
  if (/\.(jpg|jpeg|png|gif|webp|bmp|svg|ico)$/i.test(name)) return { icon: 'Picture', color: '#67c23a', label: '图片' };
  if (/\.(mp4|mkv|mov|webm|avi|flv|wmv|m4v|ts)$/i.test(name)) return { icon: 'VideoCamera', color: '#e6a23c', label: '视频' };
  if (/\.(mp3|wav|flac|ogg|aac|m4a)$/i.test(name)) return { icon: 'Headset', color: '#f56c6c', label: '音频' };
  if (/\.pdf$/i.test(name)) return { icon: 'Document', color: '#909399', label: 'PDF' };
  if (/\.(txt|md|doc|docx|xls|xlsx|ppt|pptx)$/i.test(name)) return { icon: 'Document', color: '#409eff', label: '文档' };
  if (/\.(zip|rar|7z|tar|gz)$/i.test(name)) return { icon: 'Files', color: '#b37feb', label: '压缩包' };
  return { icon: 'Document', color: '#909399', label: '文件' };
}

/** 点击文件夹：跳转到文件页 */
function openFolder(row: any) {
  router.push({ path: '/files', query: { storageId: storageId.value, path: row.path } });
}

/** 点击文件：打开预览 */
function openFile(row: any) {
  const isImage = /\.(jpg|jpeg|png|gif|webp|bmp|svg|ico)$/i.test(row.name);
  const isVideo = /\.(mp4|mkv|mov|webm|avi|flv|wmv|m4v|ts)$/i.test(row.name);
  const isAudio = /\.(mp3|wav|flac|ogg|aac|m4a)$/i.test(row.name);
  const isPdf = /\.pdf$/i.test(row.name);
  
  if (isImage || isVideo || isAudio || isPdf) {
    const token = localStorage.getItem('nebula_token') || '';
    const base = `/api/v1/files/preview?storageId=${storageId.value}&path=${encodeURIComponent(row.path)}`;
    const url = `${base}&token=${encodeURIComponent(token)}`;
    window.open(url, '_blank');
  } else {
    const token = localStorage.getItem('nebula_token') || '';
    const base = `/api/v1/files/download?storageId=${storageId.value}&path=${encodeURIComponent(row.path)}`;
    const url = `${base}&token=${encodeURIComponent(token)}`;
    window.open(url, '_blank');
  }
}

function fmtSize(bytes: number) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + units[i];
}

function fmtTime(ts: string) {
  return new Date(ts).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}
</script>

<template>
  <div class="recent-page">
    <!-- 头部 -->
    <div class="page-header glass">
      <div class="header-left">
        <h2>
          <el-icon :size="24" class="header-icon"><Clock /></el-icon>
          最近全部
        </h2>
        <div class="stats-badges">
          <span class="stat-badge" :class="{ active: filterType === 'all' }" @click="filterType = 'all'">
            <el-icon :size="14"><Files /></el-icon>
            全部 {{ stats.total }}
          </span>
          <span class="stat-badge" :class="{ active: filterType === 'files' }" @click="filterType = 'files'">
            <el-icon :size="14"><Document /></el-icon>
            文件 {{ stats.files }}
          </span>
          <span class="stat-badge" :class="{ active: filterType === 'folders' }" @click="filterType = 'folders'">
            <el-icon :size="14"><Folder /></el-icon>
            文件夹 {{ stats.folders }}
          </span>
        </div>
      </div>
      <el-select v-model="storageId" size="small" @change="load" style="width: 160px">
        <el-option v-for="s in storages" :key="s.id" :label="s.name" :value="s.id" />
      </el-select>
    </div>

    <!-- 文件网格 -->
    <div class="recent-grid" v-loading="loading">
      <div 
        v-for="row in filteredEntries" 
        :key="row.path" 
        class="recent-card glass-card"
        @click="row.isDir ? openFolder(row) : openFile(row)"
      >
        <div class="card-icon" :style="{ background: getFileType(row).color + '15' }">
          <el-icon :size="28" :color="getFileType(row).color">
            <Folder v-if="row.isDir" />
            <Picture v-else-if="getFileType(row).label === '图片'" />
            <VideoCamera v-else-if="getFileType(row).label === '视频'" />
            <Headset v-else-if="getFileType(row).label === '音频'" />
            <Files v-else-if="getFileType(row).label === '压缩包'" />
            <Document v-else />
          </el-icon>
        </div>
        <div class="card-body">
          <div class="card-name" :title="row.name">{{ row.name }}</div>
          <div class="card-meta">
            <span class="meta-type" :style="{ color: getFileType(row).color }">{{ getFileType(row).label }}</span>
            <span v-if="!row.isDir" class="meta-size">{{ fmtSize(row.size) }}</span>
            <span class="meta-time">{{ fmtTime(row.mtime) }}</span>
          </div>
        </div>
        <div class="card-action">
          <el-icon :size="16" class="action-icon">
            <ArrowRight />
          </el-icon>
        </div>
      </div>
      
      <!-- 空状态 -->
      <div v-if="!loading && !filteredEntries.length" class="empty-state">
        <el-icon :size="64" class="empty-icon"><Clock /></el-icon>
        <h3>暂无最近访问记录</h3>
        <p>浏览文件后，这里会显示最近访问的文件和文件夹</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.recent-page { padding: 24px; }

/* 头部 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  margin-bottom: 24px;
  border-radius: 16px;
}
.header-left {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.page-header h2 {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 10px;
}
.header-icon { color: var(--accent); }
.stats-badges {
  display: flex;
  gap: 8px;
}
.stat-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 13px;
  color: var(--text-secondary);
  background: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: all 0.2s;
}
.stat-badge:hover {
  background: rgba(255, 255, 255, 0.8);
}
.stat-badge.active {
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 500;
}

/* 文件网格 */
.recent-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}
.recent-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}
.recent-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%);
  opacity: 0;
  transition: opacity 0.25s;
}
.recent-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.12);
}
.recent-card:hover::before {
  opacity: 1;
}

/* 图标区域 */
.card-icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

/* 内容区域 */
.card-body {
  flex: 1;
  min-width: 0;
}
.card-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 6px;
}
.card-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}
.meta-type {
  font-weight: 500;
}
.meta-size {
  color: var(--text-secondary);
}
.meta-time {
  color: var(--text-secondary);
  margin-left: auto;
}

/* 操作图标 */
.card-action {
  flex-shrink: 0;
  opacity: 0;
  transform: translateX(-8px);
  transition: all 0.25s;
}
.recent-card:hover .card-action {
  opacity: 1;
  transform: translateX(0);
}
.action-icon {
  color: var(--text-secondary);
}

/* 空状态 */
.empty-state {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
}
.empty-icon {
  color: var(--text-secondary);
  opacity: 0.4;
  margin-bottom: 16px;
}
.empty-state h3 {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 500;
  color: var(--text);
}
.empty-state p {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary);
}
</style>
