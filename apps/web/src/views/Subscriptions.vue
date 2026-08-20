<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '../api';
import { ElMessage } from 'element-plus';

const loading = ref(false);
const subscriptions = ref<any[]>([]);
const transferHistory = ref<any[]>([]);
const activeTab = ref('subscriptions');

onMounted(async () => {
  await load();
});

async function load() {
  loading.value = true;
  try {
    const [subs, transfers] = await Promise.all([
      api('/subscriptions'),
      api('/transfers'),
    ]);
    subscriptions.value = subs.subscriptions;
    transferHistory.value = transfers.transfers;
  } catch (e: any) {
    ElMessage.error(e.message || '加载失败');
  } finally {
    loading.value = false;
  }
}

async function doTransfer() {
  try {
    const url = window.prompt('请输入分享链接：');
    if (!url) return;
    const r = await api('/transfers', {
      method: 'POST',
      body: JSON.stringify({ shareUrl: url }),
    });
    ElMessage.success(`转存成功：${r.transferred} 个文件`);
    await load();
  } catch (e: any) {
    ElMessage.error(e.message || '转存失败');
  }
}

function fmtTime(ts: string) {
  return new Date(ts).toLocaleString('zh-CN');
}
</script>

<template>
  <div class="subs-page">
    <div class="page-header glass">
      <h2>转存和订阅</h2>
      <el-button type="primary" @click="doTransfer">
        <el-icon><Download /></el-icon>&nbsp;转存分享
      </el-button>
    </div>

    <el-tabs v-model="activeTab">
      <el-tab-pane label="我的订阅" name="subscriptions">
        <div class="subs-list" v-loading="loading">
          <div v-for="sub in subscriptions" :key="sub.id" class="sub-item glass-card">
            <el-icon :size="28" color="#409eff"><Share /></el-icon>
            <div class="sub-info">
              <div class="sub-title">{{ sub.title }}</div>
              <div class="sub-meta">
                <span>分享者：{{ sub.sharer }}</span>
                <span>· 创建于 {{ fmtTime(sub.createdAt) }}</span>
              </div>
            </div>
            <el-tag v-if="sub.autoRefresh" type="success" size="small">自动刷新</el-tag>
          </div>
          <div v-if="!loading && !subscriptions.length" class="empty">暂无订阅</div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="转存记录" name="transfers">
        <div class="transfer-list" v-loading="loading">
          <div v-for="t in transferHistory" :key="t.id" class="transfer-item glass-card">
            <el-icon :size="28" color="#16a34a"><Download /></el-icon>
            <div class="transfer-info">
              <div class="transfer-title">{{ t.title }}</div>
              <div class="transfer-meta">
                <span>转存了 {{ t.fileCount }} 个文件</span>
                <span>· {{ fmtTime(t.createdAt) }}</span>
              </div>
            </div>
          </div>
          <div v-if="!loading && !transferHistory.length" class="empty">暂无转存记录</div>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<style scoped>
.subs-page { padding: 20px; }
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  margin-bottom: 20px;
}
.page-header h2 { margin: 0; font-size: 20px; }
.subs-list, .transfer-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.sub-item, .transfer-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
}
.sub-info, .transfer-info { flex: 1; min-width: 0; }
.sub-title, .transfer-title {
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sub-meta, .transfer-meta { font-size: 12px; color: var(--text-secondary); margin-top: 4px; }
.empty { text-align: center; padding: 60px; color: var(--text-secondary); }
</style>
