<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { api, fmtSize, fmtTime } from '../../api';

const users = ref<any[]>([]);
const loading = ref(false);
const filter = ref('');
// 角色 -> 权限键列表（用于展示用户有效权限）
const rolePerms = ref<Record<string, string[]>>({});

async function load() {
  loading.value = true;
  try {
    const [r, roles] = await Promise.all([api('/users'), api('/roles')]);
    users.value = r.users;
    const map: Record<string, string[]> = {};
    for (const role of roles.roles) map[role.key] = role.permissions;
    rolePerms.value = map;
  } catch (e: any) {
    ElMessage.error(e.message || '加载用户失败');
  } finally {
    loading.value = false;
  }
}

/** 用户的有效权限数（按角色） */
function permCount(row: any): number {
  return (rolePerms.value[row.role] || []).length;
}

const filtered = computed(() => {
  const k = filter.value.trim().toLowerCase();
  if (!k) return users.value;
  return users.value.filter(
    (u) =>
      (u.username || '').toLowerCase().includes(k) ||
      (u.displayName || '').toLowerCase().includes(k)
  );
});

const stats = computed(() => {
  const total = users.value.length;
  const admins = users.value.filter((u) => u.role === 'admin').length;
  const active = users.value.filter((u) => u.status === 'active').length;
  return { total, admins, active };
});

function roleTag(role: string) {
  return role === 'admin' ? 'danger' : 'info';
}
function roleLabel(role: string) {
  return role === 'admin' ? '管理员' : '普通用户';
}
function statusTag(status: string) {
  return status === 'active' ? 'success' : 'info';
}
function statusLabel(status: string) {
  return status === 'active' ? '正常' : '禁用';
}

/* ---------- 创建用户 ---------- */
const createDialog = ref(false);
const createForm = ref({ username: '', password: '', role: 'user', displayName: '', quota: 0 });

async function doCreate() {
  if (!createForm.value.username) return ElMessage.warning('请输入用户名');
  if (!createForm.value.password) return ElMessage.warning('请输入密码');
  try {
    await api('/users', {
      method: 'POST',
      body: JSON.stringify({
        username: createForm.value.username,
        password: createForm.value.password,
        role: createForm.value.role,
        displayName: createForm.value.displayName,
        quota: createForm.value.quota,
      }),
    });
    ElMessage.success('用户已创建');
    createDialog.value = false;
    createForm.value = { username: '', password: '', role: 'user', displayName: '', quota: 0 };
    load();
  } catch (e: any) {
    ElMessage.error(e.message || '创建失败');
  }
}

/* ---------- 编辑用户 ---------- */
const editDialog = ref(false);
const editForm = ref<any>({});

function openEdit(row: any) {
  editForm.value = {
    id: row.id,
    role: row.role,
    displayName: row.displayName || '',
    quota: row.quota || 0,
    status: row.status || 'active',
  };
  editDialog.value = true;
}

async function doEdit() {
  try {
    await api(`/users/${editForm.value.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        role: editForm.value.role,
        displayName: editForm.value.displayName,
        quota: editForm.value.quota,
        status: editForm.value.status,
      }),
    });
    ElMessage.success('用户已更新');
    editDialog.value = false;
    load();
  } catch (e: any) {
    ElMessage.error(e.message || '更新失败');
  }
}

/* ---------- 重置密码 ---------- */
async function doResetPassword(row: any) {
  try {
    const { newPassword } = await ElMessageBox.prompt(`为用户「${row.username}」设置新密码`, '重置密码', {
      inputType: 'password',
      inputPattern: /^.{4,}$/,
      inputErrorMessage: '密码至少 4 位',
    });
    await api(`/users/${row.id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    });
    ElMessage.success('密码已重置');
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e.message || '重置失败');
  }
}

/* ---------- 删除用户 ---------- */
async function doDelete(row: any) {
  try {
    await ElMessageBox.confirm(`确定删除用户「${row.username}」吗？`, '删除确认', { type: 'warning' });
  } catch {
    return;
  }
  try {
    await api(`/users/${row.id}`, { method: 'DELETE' });
    ElMessage.success('已删除');
    load();
  } catch (e: any) {
    ElMessage.error(e.message || '删除失败');
  }
}

onMounted(load);
</script>

<template>
  <div class="users-page">
    <!-- KPI 卡片 -->
    <div class="kpi-grid">
      <div class="kpi glass-card">
        <div class="kpi-icon kpi-blue"><el-icon :size="24"><User /></el-icon></div>
        <div>
          <div class="kpi-num">{{ stats.total }}</div>
          <div class="kpi-label">用户总数</div>
        </div>
      </div>
      <div class="kpi glass-card">
        <div class="kpi-icon kpi-red"><el-icon :size="24"><Setting /></el-icon></div>
        <div>
          <div class="kpi-num">{{ stats.admins }}</div>
          <div class="kpi-label">管理员</div>
        </div>
      </div>
      <div class="kpi glass-card">
        <div class="kpi-icon kpi-green"><el-icon :size="24"><CircleCheck /></el-icon></div>
        <div>
          <div class="kpi-num">{{ stats.active }}</div>
          <div class="kpi-label">正常用户</div>
        </div>
      </div>
    </div>

    <!-- 用户列表 -->
    <div class="panel glass-card">
      <div class="panel-head">
        <el-icon class="panel-icon"><User /></el-icon>
        <span class="panel-title">用户管理</span>
        <div class="head-right">
          <el-input
            v-model="filter"
            class="filter-input"
            placeholder="搜索用户名 / 昵称"
            clearable
            :prefix-icon="'Search'"
          />
          <el-button type="primary" size="small" @click="createDialog = true">
            <el-icon><User /></el-icon>&nbsp;创建用户
          </el-button>
        </div>
      </div>

      <el-table v-loading="loading" :data="filtered">
        <el-table-column label="用户名" min-width="150" prop="username" />
        <el-table-column label="昵称" min-width="130" prop="displayName">
          <template #default="{ row }">{{ row.displayName || '-' }}</template>
        </el-table-column>
        <el-table-column label="角色" width="110">
          <template #default="{ row }">
            <el-tag size="small" :type="roleTag(row.role)">{{ roleLabel(row.role) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="权限" width="90">
          <template #default="{ row }">
            <el-tag size="small" type="info" effect="plain">{{ permCount(row) }} 项</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="容量" width="130">
          <template #default="{ row }">{{ row.quota ? fmtSize(row.quota) : '不限' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="statusTag(row.status)">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="最近登录" width="170">
          <template #default="{ row }">
            <span v-if="row.lastLoginAt">{{ fmtTime(row.lastLoginAt) }}</span>
            <span v-else class="muted">从未登录</span>
          </template>
        </el-table-column>
        <el-table-column label="注册时间" width="170">
          <template #default="{ row }">{{ fmtTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="220">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
            <el-button link type="primary" size="small" @click="doResetPassword(row)">重置密码</el-button>
            <el-button v-if="row.role !== 'admin'" link type="danger" size="small" @click="doDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 创建用户 -->
    <el-dialog v-model="createDialog" title="创建用户" width="480px">
      <el-form label-width="90px">
        <el-form-item label="用户名">
          <el-input v-model="createForm.username" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="createForm.password" type="password" />
        </el-form-item>
        <el-form-item label="角色">
          <el-radio-group v-model="createForm.role">
            <el-radio value="user">普通用户</el-radio>
            <el-radio value="admin">管理员</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="昵称">
          <el-input v-model="createForm.displayName" placeholder="可选" />
        </el-form-item>
        <el-form-item label="容量">
          <el-input v-model.number="createForm.quota" type="number" placeholder="0 表示不限" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialog = false">取消</el-button>
        <el-button type="primary" @click="doCreate">创建</el-button>
      </template>
    </el-dialog>

    <!-- 编辑用户 -->
    <el-dialog v-model="editDialog" title="编辑用户" width="480px">
      <el-form label-width="90px">
        <el-form-item label="角色">
          <el-radio-group v-model="editForm.role">
            <el-radio value="user">普通用户</el-radio>
            <el-radio value="admin">管理员</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="昵称">
          <el-input v-model="editForm.displayName" />
        </el-form-item>
        <el-form-item label="容量">
          <el-input v-model.number="editForm.quota" type="number" placeholder="0 表示不限" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="editForm.status">
            <el-radio value="active">正常</el-radio>
            <el-radio value="disabled">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialog = false">取消</el-button>
        <el-button type="primary" @click="doEdit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.users-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* ---------- KPI 卡片 ---------- */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}
@media (max-width: 900px) {
  .kpi-grid {
    grid-template-columns: repeat(1, 1fr);
  }
}
.kpi {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  border-radius: 18px;
}
.kpi:hover {
  transform: none;
}
.kpi-icon {
  width: 52px;
  height: 52px;
  border-radius: 16px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  color: #fff;
  border: 1px solid var(--glass-border);
  box-shadow: inset 0 1px 0 var(--glass-highlight);
}
.kpi-blue {
  background: linear-gradient(135deg, #3b82f6, #6366f1);
}
.kpi-red {
  background: linear-gradient(135deg, #ef4444, #f97316);
}
.kpi-green {
  background: linear-gradient(135deg, #22c55e, #14b8a6);
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
.panel {
  border-radius: 18px;
  padding: 20px 22px;
}
.panel:hover {
  transform: none;
}
.panel-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.panel-icon {
  color: var(--accent);
  font-size: 18px;
}
.panel-title {
  font-size: 15px;
  font-weight: 600;
}
.head-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 10px;
}
.filter-input {
  width: 220px;
}

/* ---------- 表格 ---------- */
.muted {
  color: var(--text-secondary);
  font-size: 12px;
}
</style>
