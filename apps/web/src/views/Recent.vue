<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '../api';
import { ElMessage } from 'element-plus';

const loading = ref(false);
const entries = ref<any[]>([]);
const storageId = ref<number | null>(null);
const storages = ref<any[]>([]);

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
    const r = await api(`/files/recent?storageId=${storageId.value}&limit=50`);
    entries.value = r.entries;
  } catch (e: any) {
    ElMessage.error(e.message || '加载最近文件失败');
  } finally {
    loading.value = false;
  }
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
  <div class="recent-page">
    <div class="page-header glass">
      <h2>最近全部</h2>
      <el-select v-model="storageId" size="small" @change="load" style="width: 180px">
        <el-option v-for="s in storages" :key="s.id" :label="s.name" :value="s.id" />
      </el-select>
    </div>

    <div class="recent-grid" v-loading="loading">
      <div v-for="row in entries" :key="row.path" class="recent-item glass-card">
        <el-icon :size="32" :color="row.isDir ? '#409eff' : '#909399'">
          <Folder v-if="row.isDir" />
          <Document v-else />
        </el-icon>
        <div class="recent-info">
          <div class="recent-name">{{ row.name }}</div>
          <div class="recent-meta">{{ row.isDir ? '文件夹' : fmtSize(row.size) }} · {{ fmtTime(row.mtime) }}</div>
        </div>
      </div>
      <div v-if="!loading && !entries.length" class="empty">暂无最近访问记录</div>
    </div>
  </div>
</template>

<style scoped>
.recent-page { padding: 20px; }
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  margin-bottom: 20px;
}
.page-header h2 { margin: 0; font-size: 20px; }
.recent-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}
.recent-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  cursor: pointer;
}
.recent-item:hover { transform: translateY(-2px); }
.recent-info { flex: 1; min-width: 0; }
.recent-name {
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.recent-meta { font-size: 12px; color: var(--text-secondary); margin-top: 4px; }
.empty { grid-column: 1 / -1; text-align: center; padding: 60px; color: var(--text-secondary); }
</style>
