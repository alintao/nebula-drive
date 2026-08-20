<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from './stores/auth';
import { api } from './api';
import { useTheme, THEMES, type ThemeKey } from './useTheme';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const { theme, setTheme, isGlassTheme } = useTheme();

const appName = ref('NebulaDrive 星云网盘');
const collapsed = ref(false);
const showThemePicker = ref(false);

const bare = computed(() => !route.meta?.auth);
const isAdmin = computed(() => auth.user?.role === 'admin');

/** 权限判断：当前用户是否拥有某权限点 */
const perm = (key: string) => auth.hasPerm(key);

const pageTitle = computed(() => {
  const map: Record<string, string> = {
    '/': '文件管理',
    '/recent': '最近全部',
    '/media': '视频文档',
    '/quick-access': '快捷访问',
    '/hidden': '隐藏空间',
    '/subscriptions': '转存和订阅',
    '/shares': '我的分享',
    '/recycle': '回收站',
    '/admin/users': '用户管理',
    '/admin/roles': '角色权限',
    '/admin/storages': '存储管理',
    '/admin/settings': '系统设置',
    '/admin/logs': '操作日志',
    '/admin/sync': '同步管理',
    '/admin/stats': '系统统计',
    '/profile': '我的资料',
  };
  return map[route.path] || 'NebulaDrive';
});

// 侧边栏菜单（perm = 所需权限点；无 perm 的项始终显示）
const mainMenuAll = [
  { path: '/', label: '文件管理', icon: 'Folder', perm: 'files:view' },
  { path: '/recent', label: '最近全部', icon: 'Clock', perm: 'files:view' },
  { path: '/media', label: '视频文档', icon: 'VideoCamera', perm: 'files:view' },
  { path: '/quick-access', label: '快捷访问', icon: 'Star', perm: 'files:view' },
  { path: '/hidden', label: '隐藏空间', icon: 'Lock', perm: 'files:view' },
  { path: '/subscriptions', label: '转存和订阅', icon: 'Download', perm: 'files:share' },
  { path: '/shares', label: '我的分享', icon: 'Share', perm: 'files:share' },
  { path: '/recycle', label: '回收站', icon: 'Delete', perm: 'recycle:view' },
  { path: '/profile', label: '我的资料', icon: 'User', perm: 'files:view' },
];
const adminMenuAll = [
  { path: '/admin/users', label: '用户管理', icon: 'User', perm: 'users:view' },
  { path: '/admin/roles', label: '角色权限', icon: 'Lock', perm: 'users:manage' },
  { path: '/admin/storages', label: '存储管理', icon: 'Box', perm: 'storages:view' },
  { path: '/admin/settings', label: '系统设置', icon: 'Tools', perm: 'settings:view' },
  { path: '/admin/logs', label: '操作日志', icon: 'Document', perm: 'logs:view' },
  { path: '/admin/sync', label: '同步管理', icon: 'Refresh', perm: 'sync:view' },
  { path: '/admin/stats', label: '系统统计', icon: 'DataLine', perm: 'stats:view' },
];
const mainMenu = computed(() => mainMenuAll.filter((m) => !m.perm || perm(m.perm)));
const adminMenu = computed(() => adminMenuAll.filter((m) => !m.perm || perm(m.perm)));

onMounted(async () => {
  if (auth.token) {
    await auth.me();
  }
  try {
    const s = await api('/settings');
    if (s?.appName) appName.value = s.appName;
    applyBrandColor(s?.brandColor);
    applyBackground(s);
  } catch {
    /* 忽略 */
  }
  if (route.meta?.admin && auth.user?.role !== 'admin') {
    router.replace('/');
  }
});

function logout() {
  auth.logout();
  router.push('/login');
}

/** 应用品牌主色：覆盖 --accent / --accent-soft（空 = 跟随主题默认） */
function applyBrandColor(color?: string) {
  const root = document.documentElement;
  if (!color || !/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color)) {
    root.style.removeProperty('--accent');
    root.style.removeProperty('--accent-soft');
    return;
  }
  const hex = color.length === 4 ? '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3] : color;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  root.style.setProperty('--accent', color);
  root.style.setProperty('--accent-soft', `rgba(${r}, ${g}, ${b}, 0.18)`);
}

/** 应用自定义背景：theme(跟随主题) / image / gradient / color */
function applyBackground(s?: any) {
  const root = document.documentElement;
  const style = root.style;
  // 清除旧的自定义背景
  style.removeProperty('--bg');
  style.removeProperty('--bg-size');
  style.removeProperty('--bg-overlay');
  const bgEl = document.querySelector('.app-bg') as HTMLElement | null;
  bgEl?.classList.remove('has-image');

  const type = s?.bgType || 'theme';
  if (type === 'theme') return; // 跟随主题默认

  // 遮罩：0-100 映射到 0-0.6 的透明度
  const overlay = Math.max(0, Math.min(100, Number(s?.bgOverlay) || 0)) / 100;
  style.setProperty('--bg-overlay', String(overlay * 0.6));

  if (type === 'image' && s?.bgImage) {
    style.setProperty('--bg', `url(${s.bgImage})`);
    style.setProperty('--bg-size', 'cover');
    bgEl?.classList.add('has-image');
  } else if (type === 'gradient' && s?.bgGradientFrom && s?.bgGradientTo) {
    const angle = Number(s?.bgGradientAngle) || 135;
    style.setProperty('--bg', `linear-gradient(${angle}deg, ${s.bgGradientFrom} 0%, ${s.bgGradientTo} 100%)`);
  } else if (type === 'color' && s?.bgColor) {
    style.setProperty('--bg', s.bgColor);
  }
}
</script>

<template>
  <router-view v-if="bare" />
  <div v-else class="shell">
    <!-- 背景渐变 + 遮罩层 -->
    <div class="app-bg" aria-hidden="true" />
    <div class="app-overlay" aria-hidden="true" />

    <div class="layout">
      <!-- 侧边栏（玻璃） -->
      <aside class="aside glass" :class="{ collapsed }">
        <div class="logo">
          <div class="logo-badge">
            <el-icon :size="20"><Cloudy /></el-icon>
          </div>
          <div v-if="!collapsed" class="logo-text">
            <p class="logo-name">{{ appName }}</p>
            <p class="logo-sub">Glass Drive</p>
          </div>
          <button
            class="collapse-btn glass-btn"
            :title="collapsed ? '展开侧边栏' : '折叠侧边栏'"
            @click="collapsed = !collapsed"
          >
            <el-icon :class="{ flip: collapsed }"><ArrowLeft /></el-icon>
          </button>
        </div>

        <nav class="menu">
          <button
            v-for="item in mainMenu"
            :key="item.path"
            class="menu-item"
            :class="{ active: route.path === item.path }"
            :title="collapsed ? item.label : undefined"
            @click="router.push(item.path)"
          >
            <el-icon><component :is="item.icon" /></el-icon>
            <span v-if="!collapsed" class="menu-label">{{ item.label }}</span>
          </button>

          <template v-if="isAdmin">
            <div v-if="!collapsed" class="menu-group">系统管理</div>
            <button
              v-for="item in adminMenu"
              :key="item.path"
              class="menu-item"
              :class="{ active: route.path === item.path }"
              :title="collapsed ? item.label : undefined"
              @click="router.push(item.path)"
            >
              <el-icon><component :is="item.icon" /></el-icon>
              <span v-if="!collapsed" class="menu-label">{{ item.label }}</span>
            </button>
          </template>
        </nav>

        <div class="aside-footer">
          <div class="user-chip">
            <div class="avatar">{{ (auth.user?.displayName || auth.user?.username || 'U').charAt(0) }}</div>
            <div v-if="!collapsed" class="user-info">
              <p class="user-name">{{ auth.user?.displayName || auth.user?.username || '未登录' }}</p>
              <p class="user-role">{{ isAdmin ? '管理员' : '普通用户' }}</p>
            </div>
          </div>
        </div>
      </aside>

      <!-- 主体：顶栏 + 内容 -->
      <div class="body">
        <header class="header glass">
          <div class="page-title">{{ pageTitle }}</div>
          <div class="header-right">
            <!-- 主题切换：太阳/月亮按钮 + 四主题快选 -->
            <div class="theme-wrap">
              <button
                class="theme-btn glass-btn"
                :title="`当前主题：${THEMES[theme].label}`"
                @click="showThemePicker = !showThemePicker"
              >
                <el-icon><Sunny v-if="isGlassTheme" /><Moon v-else /></el-icon>
              </button>
              <div v-if="showThemePicker" class="theme-picker glass">
                <button
                  v-for="(meta, key) in THEMES"
                  :key="key"
                  class="theme-opt"
                  :class="{ active: theme === key }"
                  @click="setTheme(key as ThemeKey); showThemePicker = false"
                >
                  <span class="theme-dot">{{ meta.icon }}</span>
                  <span>{{ meta.label }}</span>
                  <span v-if="theme === key" class="tick">✓</span>
                </button>
              </div>
            </div>
            <el-tag v-if="isAdmin" type="danger" size="small" effect="light">管理员</el-tag>
            <span class="user-name">{{ auth.user?.username || '未登录' }}</span>
            <button class="logout-btn glass-btn" @click="logout">退出登录</button>
          </div>
        </header>

        <main class="main">
          <router-view />
        </main>
      </div>
    </div>
  </div>
</template>

<style scoped>
.shell {
  height: 100vh;
  overflow: hidden;
}
.layout {
  height: 100%;
  display: flex;
  gap: 14px;
  padding: 14px;
}

/* ---------- 侧边栏 ---------- */
.aside {
  width: 236px;
  display: flex;
  flex-direction: column;
  border-radius: 22px;
  overflow: hidden;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.aside.collapsed {
  width: 78px;
}
.logo {
  height: 60px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
}
.aside.collapsed .logo {
  justify-content: center;
  padding: 0 8px;
}
.logo-badge {
  width: 38px;
  height: 38px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: var(--accent);
  color: #fff;
  box-shadow: var(--shadow), inset 0 1px 0 rgba(255, 255, 255, 0.35);
  flex-shrink: 0;
}
.logo-text {
  min-width: 0;
  flex: 1;
}
.logo-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 0;
}
.logo-sub {
  font-size: 11px;
  color: var(--text-secondary);
  margin: 0;
}
.collapse-btn {
  width: 30px;
  height: 30px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  color: var(--text-secondary);
  flex-shrink: 0;
}
.collapse-btn:hover {
  color: var(--text);
}
.collapse-btn .flip {
  transform: rotate(180deg);
}

.menu {
  flex: 1;
  overflow-y: auto;
  padding: 6px 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.aside.collapsed .menu {
  padding: 6px 8px;
}
.menu-group {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 12px 12px 4px;
}
.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 14px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border: none;
  background: transparent;
  text-align: left;
  width: 100%;
}
.aside.collapsed .menu-item {
  justify-content: center;
  padding: 10px 8px;
}
.menu-item:hover {
  background: var(--glass-bg-hover);
  color: var(--text);
}
.menu-item.active {
  background: var(--accent-soft);
  color: var(--text);
  box-shadow: inset 0 1px 0 var(--glass-highlight);
}
.menu-item .el-icon {
  font-size: 18px;
  flex-shrink: 0;
}
.menu-item.active .el-icon {
  color: var(--accent);
}

.aside-footer {
  padding: 12px 10px;
  border-top: 1px solid var(--glass-border);
}
.user-chip {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 14px;
}
.aside.collapsed .user-chip {
  justify-content: center;
  padding: 8px 6px;
}
.avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #818cf8, #d946ef);
  color: #fff;
  font-weight: 700;
  font-size: 14px;
  flex-shrink: 0;
}
.user-info {
  min-width: 0;
}
.user-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.user-role {
  font-size: 11px;
  color: var(--text-secondary);
  margin: 0;
}

/* ---------- 主体 ---------- */
.body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.header {
  height: 60px;
  border-radius: 22px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  flex-shrink: 0;
  /* header 因 backdrop-filter 自成堆叠上下文；抬升 z-index 让主题下拉
     不被 .main 里更靠后的玻璃卡片盖住 */
  position: relative;
  z-index: 10;
}
.page-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--text);
}
.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.theme-wrap {
  position: relative;
}
.theme-btn {
  width: 38px;
  height: 38px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  color: var(--text);
}
.theme-picker {
  position: absolute;
  top: 48px;
  right: 0;
  width: 180px;
  border-radius: 16px;
  padding: 8px;
  z-index: 20;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.theme-opt {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 12px;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  border: none;
  background: transparent;
  text-align: left;
  transition: all 0.15s;
}
.theme-opt:hover {
  background: var(--glass-bg-hover);
  color: var(--text);
}
.theme-opt.active {
  background: var(--accent-soft);
  color: var(--text);
}
.theme-dot {
  font-size: 15px;
  width: 20px;
  text-align: center;
}
.tick {
  margin-left: auto;
  color: var(--accent);
}
.user-name {
  font-size: 14px;
  color: var(--text-secondary);
}
.logout-btn {
  padding: 8px 14px;
  border-radius: 14px;
  font-size: 13px;
  color: var(--text-secondary);
}
.logout-btn:hover {
  color: var(--text);
}

.main {
  flex: 1;
  overflow: auto;
  padding: 4px;
}
</style>
