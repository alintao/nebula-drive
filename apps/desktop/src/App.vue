<template>
  <el-container class="layout">
    <el-header class="header">
      <div class="brand">
        <el-icon :size="22"><Cloudy /></el-icon>
        <span>NebulaDrive 星云网盘 · 桌面端</span>
      </div>
      <el-button
        size="small"
        :type="watching ? 'danger' : 'primary'"
        :loading="watchBusy"
        @click="watching ? doStopWatch() : doStartWatch()"
      >
        {{ watching ? '停止监听' : '启动监听' }}
      </el-button>
    </el-header>

    <el-main>
      <el-tabs v-model="activeTab">
        <el-tab-pane label="登录" name="login">
          <el-form :model="loginForm" label-width="110px" class="form-narrow">
            <el-form-item label="服务器地址">
              <el-input v-model="loginForm.url" placeholder="http://127.0.0.1:8080" />
            </el-form-item>
            <el-form-item label="用户名">
              <el-input v-model="loginForm.username" />
            </el-form-item>
            <el-form-item label="密码">
              <el-input v-model="loginForm.password" type="password" show-password />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="loginBusy" @click="doLogin">
                登录并保存令牌
              </el-button>
            </el-form-item>
          </el-form>
          <el-alert
            v-if="loginResult"
            type="success"
            :title="loginResult"
            :closable="false"
            class="login-result"
          />
        </el-tab-pane>

        <el-tab-pane label="同步任务" name="pairs">
          <el-form :model="pairForm" inline class="pair-form">
            <el-form-item label="存储 ID">
              <el-input v-model="pairForm.storageId" style="width: 90px" />
            </el-form-item>
            <el-form-item label="远端目录">
              <el-input v-model="pairForm.remotePath" placeholder="/sync" style="width: 150px" />
            </el-form-item>
            <el-form-item label="模式">
              <el-select v-model="pairForm.mode" style="width: 130px">
                <el-option label="双向 two-way" value="two-way" />
                <el-option label="推送 push" value="push" />
                <el-option label="拉取 pull" value="pull" />
              </el-select>
            </el-form-item>
            <el-form-item label="名称">
              <el-input v-model="pairForm.name" placeholder="可选" style="width: 130px" />
            </el-form-item>
            <el-form-item label="本地目录">
              <el-input
                v-model="pairForm.localPath"
                placeholder="留空 = 用户目录\NebulaDrive"
                style="width: 220px"
              />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="doCreatePair">创建同步对</el-button>
            </el-form-item>
          </el-form>

          <el-table :data="pairs" border stripe>
            <el-table-column prop="id" label="ID" width="60" />
            <el-table-column prop="name" label="名称" min-width="140" />
            <el-table-column prop="url" label="服务器" min-width="160" />
            <el-table-column prop="localDir" label="本地目录" min-width="200" />
            <el-table-column prop="mode" label="模式" width="90" />
            <el-table-column label="操作" width="200">
              <template #default="{ row }">
                <el-button size="small" @click="doSyncOnce(row.id)">同步一次</el-button>
                <el-button size="small" type="danger" @click="doRemove(row.id)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="同步状态" name="status">
          <el-table :data="statusRows" border stripe>
            <el-table-column prop="pairId" label="任务 ID" width="80" />
            <el-table-column prop="name" label="名称" min-width="140" />
            <el-table-column prop="lastSyncAt" label="最近同步" width="200" />
            <el-table-column prop="lastStatus" label="状态" width="90" />
            <el-table-column prop="lastStats" label="统计" min-width="160" />
            <el-table-column prop="lastError" label="错误" min-width="140" />
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="实时日志" name="log">
          <pre class="log">{{ logs.join('\n') || '（暂无日志）' }}</pre>
        </el-tab-pane>
      </el-tabs>
    </el-main>
  </el-container>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { Cloudy } from '@element-plus/icons-vue';
import { api } from './tauri';

interface Pair {
  id: number;
  name: string;
  url: string;
  token: string;
  localDir: string;
  mode: string;
  enabled: number;
  createdAt: string;
}

interface StatusRow {
  pairId: number;
  name: string;
  lastSyncAt: string | null;
  lastStatus: string | null;
  lastError: string | null;
  lastStats: string | null;
}

const activeTab = ref('login');
const loginForm = ref({ url: 'http://127.0.0.1:8080', username: 'admin', password: '' });
const loginBusy = ref(false);
const loginResult = ref('');
const pairForm = ref({
  storageId: '1',
  remotePath: '/sync',
  mode: 'two-way',
  name: '',
  localPath: '',
});
const pairs = ref<Pair[]>([]);
const statusRows = ref<StatusRow[]>([]);
const logs = ref<string[]>([]);
const watching = ref(false);
const watchBusy = ref(false);
let unlisten: (() => void) | null = null;

function pushLog(line: string) {
  logs.value = [...logs.value, line].slice(-500);
}

async function refresh() {
  try {
    const r: any = await api.listPairs();
    pairs.value = r.pairs ?? [];
  } catch (e: any) {
    ElMessage.error(`加载任务列表失败: ${e}`);
  }
  try {
    const s: any = await api.status();
    statusRows.value = s.results ?? [];
  } catch (e: any) {
    ElMessage.error(`加载同步状态失败: ${e}`);
  }
}

async function doLogin() {
  loginBusy.value = true;
  try {
    loginResult.value = await api.login(
      loginForm.value.url,
      loginForm.value.username,
      loginForm.value.password,
    );
    ElMessage.success('登录成功，令牌已保存');
  } catch (e: any) {
    ElMessage.error(String(e));
  } finally {
    loginBusy.value = false;
  }
}

async function doCreatePair() {
  try {
    const r: any = await api.createPair({
      storageId: Number(pairForm.value.storageId),
      remotePath: pairForm.value.remotePath,
      mode: pairForm.value.mode,
      name: pairForm.value.name || undefined,
      localPath: pairForm.value.localPath || undefined,
      url: loginForm.value.url,
    });
    const pair = r.pair;
    const dir =
      pairForm.value.localPath ||
      (await api.defaultLocalDir(pairForm.value.name || `sync-${pair.id}`));
    await api.addPair({
      name: pairForm.value.name || `sync-${pair.id}`,
      token: pair.token,
      dir,
      mode: pairForm.value.mode,
      url: loginForm.value.url,
    });
    ElMessage.success(`同步对 #${pair.id} 已创建，本地目录: ${dir}`);
    await refresh();
  } catch (e: any) {
    ElMessage.error(String(e));
  }
}

async function doRemove(id: number) {
  try {
    await api.removePair(id);
    ElMessage.success('已删除同步任务');
    await refresh();
  } catch (e: any) {
    ElMessage.error(String(e));
  }
}

async function doSyncOnce(id: number) {
  pushLog(`> 手动同步任务 #${id} …`);
  try {
    const out = await api.runSync(String(id));
    pushLog(out.trim() || '（无输出）');
    await refresh();
  } catch (e: any) {
    pushLog(`同步失败: ${e}`);
    ElMessage.error(String(e));
  }
}

async function doStartWatch() {
  watchBusy.value = true;
  try {
    await api.startWatch();
    watching.value = true;
    pushLog('> 已启动同步监听（chokidar + 轮询）');
  } catch (e: any) {
    ElMessage.error(String(e));
  } finally {
    watchBusy.value = false;
  }
}

async function doStopWatch() {
  watchBusy.value = true;
  try {
    await api.stopWatch();
    watching.value = false;
    pushLog('> 已停止同步监听');
  } catch (e: any) {
    ElMessage.error(String(e));
  } finally {
    watchBusy.value = false;
  }
}

onMounted(async () => {
  await refresh();
  unlisten = await api.onSyncLog(pushLog);
});

onUnmounted(() => {
  unlisten?.();
});
</script>

<style scoped>
.layout {
  height: 100vh;
}
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--el-border-color);
}
.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
}
.form-narrow {
  max-width: 560px;
}
.login-result {
  max-width: 560px;
  margin-top: 12px;
}
.pair-form {
  margin-bottom: 12px;
}
.log {
  background: #111827;
  color: #d1d5db;
  padding: 12px;
  border-radius: 6px;
  min-height: 320px;
  white-space: pre-wrap;
  word-break: break-all;
  font-size: 12px;
}
</style>
