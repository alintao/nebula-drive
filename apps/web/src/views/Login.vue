<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useAuthStore } from '../stores/auth';
import { api } from '../api';

const router = useRouter();
const auth = useAuthStore();
const username = ref('');
const password = ref('');
const loading = ref(false);

/* ---------- 公开设置（品牌展示） ---------- */
const brand = ref({
  appName: 'NebulaDrive 星云网盘',
  logo: '',
  aboutText: '',
  notice: '',
  copyright: '',
  contactEmail: '',
  registerEnabled: true,
});

async function loadBrand() {
  try {
    const s = await api('/settings');
    brand.value.appName = s.appName || 'NebulaDrive 星云网盘';
    brand.value.logo = s.logo || '';
    brand.value.aboutText = s.aboutText || '';
    brand.value.notice = s.notice || '';
    brand.value.copyright = s.copyright || '';
    brand.value.contactEmail = s.contactEmail || '';
    brand.value.registerEnabled = s.registerEnabled !== false;
  } catch {
    /* 使用默认品牌 */
  }
}
onMounted(loadBrand);

async function doLogin() {
  if (!username.value || !password.value) {
    ElMessage.warning('请输入用户名和密码');
    return;
  }
  loading.value = true;
  try {
    await auth.login(username.value.trim(), password.value);
    ElMessage.success('登录成功');
    router.push('/');
  } catch (e: any) {
    ElMessage.error(e.message || '登录失败');
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <div class="brand">
        <img v-if="brand.logo" :src="brand.logo" class="brand-logo" alt="logo" @error="($event.target as HTMLImageElement).style.display = 'none'" />
        <el-icon v-else :size="42" color="var(--accent)"><Cloudy /></el-icon>
        <div class="brand-name">{{ brand.appName }}</div>
        <div class="brand-sub">{{ brand.aboutText || '多存储统一管理平台' }}</div>
      </div>
      <el-form label-position="top" @submit.prevent="doLogin">
        <el-form-item label="用户名">
          <el-input v-model="username" placeholder="请输入用户名" prefix-icon="User" clearable />
        </el-form-item>
        <el-form-item label="密码">
          <el-input
            v-model="password"
            type="password"
            placeholder="请输入密码"
            prefix-icon="Lock"
            show-password
            @keyup.enter="doLogin"
          />
        </el-form-item>
        <el-button type="primary" class="login-btn" :loading="loading" @click="doLogin">
          登 录
        </el-button>
      </el-form>
      <div v-if="brand.notice" class="notice">
        <el-icon><Document /></el-icon>
        <span>{{ brand.notice }}</span>
      </div>
      <div class="tip">默认管理员账号：admin / admin123</div>
      <div v-if="brand.copyright" class="copyright">{{ brand.copyright }}</div>
      <div v-if="brand.contactEmail" class="contact">{{ brand.contactEmail }}</div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg);
  position: relative;
  overflow: hidden;
}
.login-page::before,
.login-page::after {
  content: '';
  position: absolute;
  border-radius: 50%;
  filter: blur(120px);
  opacity: 0.4;
}
.login-page::before {
  top: -120px;
  right: -80px;
  width: 420px;
  height: 420px;
  background: var(--accent);
}
.login-page::after {
  bottom: -120px;
  left: -80px;
  width: 420px;
  height: 420px;
  background: color-mix(in srgb, var(--accent) 50%, #ffffff);
  opacity: 0.3;
}
.login-card {
  width: 380px;
  background: var(--glass-bg);
  backdrop-filter: blur(var(--blur)) saturate(170%);
  -webkit-backdrop-filter: blur(var(--blur)) saturate(170%);
  border: 1px solid var(--glass-border);
  border-radius: 24px;
  padding: 40px 34px;
  box-shadow: var(--shadow), inset 0 1px 0 var(--glass-highlight);
  position: relative;
  z-index: 1;
}
.brand {
  text-align: center;
  margin-bottom: 24px;
}
.brand-logo {
  width: 64px;
  height: 64px;
  object-fit: contain;
  margin: 0 auto;
  border-radius: 16px;
}
.brand-name {
  font-size: 22px;
  font-weight: 700;
  color: var(--text);
  margin-top: 8px;
}
.brand-sub {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 6px;
}
.login-btn {
  width: 100%;
}
.notice {
  margin-top: 16px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-secondary);
  background: var(--accent-soft);
  border-radius: 12px;
  padding: 10px 12px;
}
.notice .el-icon {
  margin-top: 3px;
  color: var(--accent);
  flex-shrink: 0;
}
.tip {
  margin-top: 16px;
  text-align: center;
  font-size: 12px;
  color: var(--text-secondary);
}
.copyright {
  margin-top: 10px;
  text-align: center;
  font-size: 11px;
  color: var(--text-secondary);
  opacity: 0.8;
}
.contact {
  margin-top: 4px;
  text-align: center;
  font-size: 11px;
  color: var(--text-secondary);
  opacity: 0.7;
}
</style>
