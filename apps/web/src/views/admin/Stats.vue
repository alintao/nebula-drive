<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { api, fmtSize, fmtTime } from '../../api';

const stats = ref<any>(null);
const loading = ref(false);

function fmtUptime(sec: number) {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return `${d}天 ${h}时 ${m}分 ${s}秒`;
}

/** 服务启动时间（当前时间 - 运行时长） */
const startedAt = computed(() => {
  if (!stats.value) return '-';
  return fmtTime(new Date(Date.now() - stats.value.uptime * 1000).toISOString());
});

/** 磁盘占用三行数据 + 相对最大值的百分比（用于条形图） */
const diskRows = computed<any[]>(() => {
  if (!stats.value) return [];
  const d = stats.value.disk;
  const rows = [
    { icon: 'Coin', name: '数据库文件', size: d.dbSize },
    { icon: 'Upload', name: '上传暂存区', size: d.uploadSize },
    { icon: 'Delete', name: '回收站', size: d.recycleSize },
  ];
  const max = Math.max(rows[0].size, rows[1].size, rows[2].size, 1);
  return rows.map((r) => ({ ...r, pct: Math.max(2, Math.round((r.size / max) * 100)) }));
});

async function load() {
  loading.value = true;
  try {
    stats.value = await api('/stats');
  } catch (e: any) {
    ElMessage.error(e.message || '加载统计失败');
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="stats-page" v-loading="loading">
    <!-- KPI 卡片 -->
    <div class="kpi-grid">
      <div class="kpi glass-card">
        <div class="kpi-icon"><el-icon :size="24"><User /></el-icon></div>
        <div>
          <div class="kpi-num">{{ stats?.users ?? '-' }}</div>
          <div class="kpi-label">用户数</div>
        </div>
      </div>
      <div class="kpi glass-card">
        <div class="kpi-icon"><el-icon :size="24"><Box /></el-icon></div>
        <div>
          <div class="kpi-num">{{ stats?.storages ?? '-' }}</div>
          <div class="kpi-label">存储后端</div>
        </div>
      </div>
      <div class="kpi glass-card">
        <div class="kpi-icon"><el-icon :size="24"><Share /></el-icon></div>
        <div>
          <div class="kpi-num">{{ stats?.shares ?? '-' }}</div>
          <div class="kpi-label">分享链接</div>
        </div>
      </div>
      <div class="kpi glass-card">
        <div class="kpi-icon"><el-icon :size="24"><List /></el-icon></div>
        <div>
          <div class="kpi-num">{{ stats?.opLogs ?? '-' }}</div>
          <div class="kpi-label">操作日志</div>
        </div>
      </div>
    </div>

    <!-- 服务状态 + 回收站 -->
    <div class="row2">
      <div class="panel glass-card">
        <div class="panel-head">
          <el-icon class="panel-icon"><Timer /></el-icon>
          <span class="panel-title">服务状态</span>
          <span class="status-chip"><i class="pulse" />运行中</span>
        </div>
        <div class="big">{{ stats ? fmtUptime(stats.uptime) : '-' }}</div>
        <div class="sub">启动于 {{ startedAt }}</div>
      </div>
      <div class="panel glass-card">
        <div class="panel-head">
          <el-icon class="panel-icon"><Delete /></el-icon>
          <span class="panel-title">回收站</span>
        </div>
        <div class="big">{{ stats?.recycle ?? '-' }} <span class="unit">条</span></div>
        <div class="sub">磁盘占用 {{ stats ? fmtSize(stats.disk.recycleSize) : '-' }}</div>
      </div>
    </div>

    <!-- 磁盘占用 -->
    <div class="panel glass-card">
      <div class="panel-head">
        <el-icon class="panel-icon"><Cpu /></el-icon>
        <span class="panel-title">磁盘占用</span>
      </div>
      <div class="disk-rows">
        <div v-for="r in diskRows" :key="r.name" class="disk-row">
          <el-icon class="disk-icon"><component :is="r.icon" /></el-icon>
          <span class="disk-name">{{ r.name }}</span>
          <div class="disk-bar">
            <div class="disk-fill" :style="{ width: r.pct + '%' }" />
          </div>
          <span class="disk-size">{{ stats ? fmtSize(r.size) : '-' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stats-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* ---------- KPI 卡片 ---------- */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}
@media (max-width: 1100px) {
  .kpi-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
.kpi {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  border-radius: 18px;
}
.kpi-icon {
  width: 52px;
  height: 52px;
  border-radius: 16px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  color: var(--accent);
  background: linear-gradient(
    135deg,
    var(--accent-soft),
    color-mix(in srgb, var(--accent) 28%, transparent)
  );
  border: 1px solid var(--glass-border);
  box-shadow: inset 0 1px 0 var(--glass-highlight);
}
.kpi-num {
  font-size: 28px;
  font-weight: 700;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}
.kpi-label {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 2px;
}

/* ---------- 面板 ---------- */
.row2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
@media (max-width: 900px) {
  .row2 {
    grid-template-columns: 1fr;
  }
}
.panel {
  border-radius: 18px;
  padding: 20px 22px;
}
/* 大面板不做缩放悬浮，避免溢出压到侧边栏（保留背景/阴影变化） */
.panel:hover {
  transform: none;
}
.panel-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}
.panel-icon {
  color: var(--accent);
  font-size: 18px;
}
.panel-title {
  font-size: 15px;
  font-weight: 600;
}
.status-chip {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #2ea24f;
  background: rgba(46, 162, 79, 0.12);
  border: 1px solid rgba(46, 162, 79, 0.35);
  padding: 3px 11px;
  border-radius: 999px;
}
.pulse {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #2ea24f;
  display: inline-block;
  animation: pulse 1.6s ease-in-out infinite;
}
@keyframes pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(1.3);
  }
}
.big {
  font-size: 24px;
  font-weight: 700;
  line-height: 1.3;
  word-break: break-all;
  font-variant-numeric: tabular-nums;
}
.unit {
  font-size: 14px;
  color: var(--text-secondary);
  font-weight: 400;
}
.sub {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 6px;
}

/* ---------- 磁盘占用 ---------- */
.disk-rows {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.disk-row {
  display: grid;
  grid-template-columns: 22px 110px 1fr 100px;
  align-items: center;
  gap: 12px;
}
@media (max-width: 700px) {
  .disk-row {
    grid-template-columns: 22px 90px 1fr 90px;
  }
}
.disk-icon {
  color: var(--accent);
  font-size: 18px;
}
.disk-name {
  font-size: 13px;
}
.disk-bar {
  height: 8px;
  border-radius: 999px;
  background: var(--surface);
  border: 1px solid var(--glass-border);
  overflow: hidden;
}
.disk-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--accent), color-mix(in srgb, var(--accent) 55%, #ffffff));
}
.disk-size {
  font-size: 13px;
  font-weight: 600;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
</style>
