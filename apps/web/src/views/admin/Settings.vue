<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { api } from '../../api';

const form = ref({
  appName: 'NebulaDrive 星云网盘',
  logo: '',
  notice: '',
  copyright: '',
  aboutText: '',
  contactEmail: '',
  registerEnabled: true,
  minPasswordLen: 8,
  sessionTimeoutHours: 168,
  uploadChunkSize: 5242880,
  maxFileSizeGB: 0,
  shareDefaultExpireDays: 0,
  recycleRetentionDays: 0,
  brandColor: '',
  bgType: 'theme',
  bgImage: '',
  bgGradientFrom: '#9fc2ff',
  bgGradientTo: '#cdb4ef',
  bgGradientAngle: 135,
  bgColor: '#1e2634',
  bgOverlay: 40,
});
const saving = ref(false);
const bgUploading = ref(false);

// 更新检查
const updateInfo = ref<{ currentVersion: string; latestVersion: string; isUpdateAvailable: boolean } | null>(null);
const updateChecking = ref(false);

async function checkUpdate() {
  updateChecking.value = true;
  try {
    const r = await api('/system/check-update');
    updateInfo.value = r;
    if (r.isUpdateAvailable) {
      ElMessage.success(`发现新版本 v${r.latestVersion}`);
    } else {
      ElMessage.info('已是最新版本');
    }
  } catch (e: any) {
    ElMessage.error(e.message || '检查更新失败');
  } finally {
    updateChecking.value = false;
  }
}

async function load() {
  try {
    const s = await api('/settings');
    form.value.appName = s.appName || 'NebulaDrive 星云网盘';
    form.value.logo = s.logo || '';
    form.value.notice = s.notice || '';
    form.value.copyright = s.copyright || '';
    form.value.aboutText = s.aboutText || '';
    form.value.contactEmail = s.contactEmail || '';
    form.value.registerEnabled = s.registerEnabled !== false;
    form.value.minPasswordLen = Number(s.minPasswordLen) || 8;
    form.value.sessionTimeoutHours = Number(s.sessionTimeoutHours) || 168;
    form.value.uploadChunkSize = Number(s.uploadChunkSize) || 5242880;
    form.value.maxFileSizeGB = Number(s.maxFileSizeGB) || 0;
    form.value.shareDefaultExpireDays = Number(s.shareDefaultExpireDays) || 0;
    form.value.recycleRetentionDays = Number(s.recycleRetentionDays) || 0;
    form.value.brandColor = s.brandColor || '';
    form.value.bgType = s.bgType || 'theme';
    form.value.bgImage = s.bgImage || '';
    form.value.bgGradientFrom = s.bgGradientFrom || '#9fc2ff';
    form.value.bgGradientTo = s.bgGradientTo || '#cdb4ef';
    form.value.bgGradientAngle = Number(s.bgGradientAngle) || 135;
    form.value.bgColor = s.bgColor || '#1e2634';
    form.value.bgOverlay = Number(s.bgOverlay) || 40;
  } catch {
    /* 使用默认值 */
  }
}

async function doSave() {
  saving.value = true;
  try {
    await api('/settings', {
      method: 'PUT',
      body: JSON.stringify({
        appName: form.value.appName,
        logo: form.value.logo,
        notice: form.value.notice,
        copyright: form.value.copyright,
        aboutText: form.value.aboutText,
        contactEmail: form.value.contactEmail,
        registerEnabled: String(form.value.registerEnabled),
        minPasswordLen: String(form.value.minPasswordLen),
        sessionTimeoutHours: String(form.value.sessionTimeoutHours),
        uploadChunkSize: String(form.value.uploadChunkSize),
        maxFileSizeGB: String(form.value.maxFileSizeGB),
        shareDefaultExpireDays: String(form.value.shareDefaultExpireDays),
        recycleRetentionDays: String(form.value.recycleRetentionDays),
        brandColor: form.value.brandColor,
        bgType: form.value.bgType,
        bgImage: form.value.bgImage,
        bgGradientFrom: form.value.bgGradientFrom,
        bgGradientTo: form.value.bgGradientTo,
        bgGradientAngle: String(form.value.bgGradientAngle),
        bgColor: form.value.bgColor,
        bgOverlay: String(form.value.bgOverlay),
      }),
    });
    // 立即应用品牌色
    applyBrandColorNow();
    ElMessage.success('设置已保存');
  } catch (e: any) {
    ElMessage.error(e.message || '保存失败');
  } finally {
    saving.value = false;
  }
}

/** 立即应用品牌色（无需刷新） */
function applyBrandColorNow() {
  const root = document.documentElement;
  const color = form.value.brandColor;
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

async function uploadBackground(file: File) {
  bgUploading.value = true;
  try {
    const fd = new FormData();
    fd.append('file', file);
    const token = localStorage.getItem('nebula_token') || '';
    const r = await fetch('/api/v1/settings/background', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token },
      body: fd,
    });
    const j = await r.json();
    if (j.error) throw new Error(j.error);
    form.value.bgImage = j.data.url;
    form.value.bgType = 'image';
    ElMessage.success('背景图已上传，记得保存');
  } catch (e: any) {
    ElMessage.error(e.message || '背景上传失败');
  } finally {
    bgUploading.value = false;
  }
}

function onBgFile(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) uploadBackground(file);
  input.value = '';
}

function resetBg() {
  form.value.bgType = 'theme';
  form.value.bgImage = '';
  form.value.bgGradientFrom = '#9fc2ff';
  form.value.bgGradientTo = '#cdb4ef';
  form.value.bgGradientAngle = 135;
  form.value.bgColor = '#1e2634';
  form.value.bgOverlay = 40;
}

onMounted(load);
</script>

<template>
  <div class="settings-page">
    <div class="settings-grid">
      <!-- 基本信息 -->
      <section class="panel glass-card span2">
        <div class="panel-head">
          <div class="panel-icon pi-blue"><el-icon><Document /></el-icon></div>
          <div>
            <h3>基本信息</h3>
            <p>系统名称、Logo 与公告，显示在登录页与全站</p>
          </div>
        </div>
        <div class="fields">
          <div class="field">
            <label>系统名称</label>
            <el-input v-model="form.appName" placeholder="显示在登录页与侧边栏的名称" />
          </div>
          <div class="field">
            <label>Logo URL</label>
            <div class="logo-row">
              <el-input v-model="form.logo" placeholder="可选，http(s) 图片地址" />
              <img v-if="form.logo" :src="form.logo" class="logo-preview" alt="logo" @error="($event.target as HTMLImageElement).style.display = 'none'" />
            </div>
          </div>
          <div class="field span2">
            <label>系统公告</label>
            <el-input v-model="form.notice" type="textarea" :rows="3" placeholder="显示在登录页下方的公告内容" />
          </div>
          <div class="field">
            <label>版权页脚</label>
            <el-input v-model="form.copyright" placeholder="如 © 2025 NebulaDrive" />
          </div>
          <div class="field">
            <label>联系邮箱</label>
            <el-input v-model="form.contactEmail" placeholder="如 support@example.com" />
          </div>
          <div class="field span2">
            <label>关于文本</label>
            <el-input v-model="form.aboutText" type="textarea" :rows="2" placeholder="登录页副标题下方的关于介绍" />
          </div>
        </div>
      </section>

      <!-- 注册与安全 -->
      <section class="panel glass-card">
        <div class="panel-head">
          <div class="panel-icon pi-green"><el-icon><Lock /></el-icon></div>
          <div>
            <h3>注册与安全</h3>
            <p>注册开关与账号安全策略</p>
          </div>
        </div>
        <div class="rows">
          <div class="row">
            <span class="row-label">开放注册</span>
            <el-switch v-model="form.registerEnabled" />
          </div>
          <div class="row">
            <span class="row-label">密码最小长度</span>
            <el-input-number
              v-model="form.minPasswordLen"
              :min="4"
              :max="32"
              :step="1"
              size="small"
              class="num"
            />
          </div>
          <div class="row">
            <span class="row-label">会话有效期</span>
            <el-select v-model="form.sessionTimeoutHours" size="small" class="sel">
              <el-option :value="24" label="1 天" />
              <el-option :value="72" label="3 天" />
              <el-option :value="168" label="7 天" />
              <el-option :value="336" label="14 天" />
              <el-option :value="720" label="30 天" />
              <el-option :value="4320" label="180 天" />
            </el-select>
          </div>
        </div>
      </section>

      <!-- 上传与存储 -->
      <section class="panel glass-card">
        <div class="panel-head">
          <div class="panel-icon pi-orange"><el-icon><Upload /></el-icon></div>
          <div>
            <h3>上传与存储</h3>
            <p>分片大小与文件大小限制</p>
          </div>
        </div>
        <div class="rows">
          <div class="row">
            <span class="row-label">上传分片大小</span>
            <el-select v-model="form.uploadChunkSize" size="small" class="sel">
              <el-option :value="2097152" label="2 MB" />
              <el-option :value="5242880" label="5 MB（默认）" />
              <el-option :value="10485760" label="10 MB" />
              <el-option :value="20971520" label="20 MB" />
              <el-option :value="52428800" label="50 MB" />
            </el-select>
          </div>
          <div class="row">
            <span class="row-label">单文件大小上限</span>
            <div class="row-end">
              <el-input-number
                v-model="form.maxFileSizeGB"
                :min="0"
                :max="1024"
                :step="1"
                size="small"
                class="num"
                controls-position="right"
              />
              <span class="unit">GB · 0 = 不限制</span>
            </div>
          </div>
        </div>
      </section>

      <!-- 分享管理 -->
      <section class="panel glass-card">
        <div class="panel-head">
          <div class="panel-icon pi-teal"><el-icon><Share /></el-icon></div>
          <div>
            <h3>分享管理</h3>
            <p>新建分享的默认有效期</p>
          </div>
        </div>
        <div class="rows">
          <div class="row">
            <span class="row-label">默认分享有效期</span>
            <el-select v-model="form.shareDefaultExpireDays" size="small" class="sel">
              <el-option :value="0" label="永久（默认）" />
              <el-option :value="1" label="1 天" />
              <el-option :value="7" label="7 天" />
              <el-option :value="30" label="30 天" />
              <el-option :value="90" label="90 天" />
            </el-select>
          </div>
        </div>
      </section>

      <!-- 回收站 -->
      <section class="panel glass-card">
        <div class="panel-head">
          <div class="panel-icon pi-red"><el-icon><Delete /></el-icon></div>
          <div>
            <h3>回收站</h3>
            <p>自动清理超期文件，节省空间</p>
          </div>
        </div>
        <div class="rows">
          <div class="row">
            <span class="row-label">自动清理保留期</span>
            <el-select v-model="form.recycleRetentionDays" size="small" class="sel">
              <el-option :value="0" label="关闭（仅手动）" />
              <el-option :value="3" label="3 天" />
              <el-option :value="7" label="7 天" />
              <el-option :value="15" label="15 天" />
              <el-option :value="30" label="30 天" />
              <el-option :value="90" label="90 天" />
            </el-select>
          </div>
        </div>
      </section>

      <!-- 主题色 -->
      <section class="panel glass-card">
        <div class="panel-head">
          <div class="panel-icon pi-purple"><el-icon><Brush /></el-icon></div>
          <div>
            <h3>主题色</h3>
            <p>品牌主色，应用于全站强调色</p>
          </div>
        </div>
        <div class="rows">
          <div class="row">
            <span class="row-label">品牌主色</span>
            <div class="row-end">
              <el-color-picker v-model="form.brandColor" />
              <el-button v-if="form.brandColor" link size="small" @click="form.brandColor = ''">恢复默认</el-button>
            </div>
          </div>
        </div>
      </section>

      <!-- 在线更新 -->
      <section class="panel glass-card">
        <div class="panel-head">
          <div class="panel-icon pi-purple"><el-icon><Refresh /></el-icon></div>
          <div>
            <h3>在线更新</h3>
            <p>从 GitHub 检查最新版本</p>
          </div>
        </div>
        <div class="rows">
          <div class="row">
            <span class="row-label">当前版本</span>
            <span class="row-value">{{ updateInfo?.currentVersion || '加载中...' }}</span>
          </div>
          <div class="row">
            <span class="row-label">最新版本</span>
            <span class="row-value" :class="{ 'update-available': updateInfo?.isUpdateAvailable }">
              {{ updateInfo?.latestVersion || '检查中...' }}
              <el-tag v-if="updateInfo?.isUpdateAvailable" type="warning" size="small">有新版本</el-tag>
            </span>
          </div>
          <div class="row">
            <span class="row-label"></span>
            <el-button size="small" :loading="updateChecking" @click="checkUpdate">
              <el-icon><Refresh /></el-icon>&nbsp;检查更新
            </el-button>
          </div>
        </div>
      </section>

      <!-- 自定义背景 -->
      <section class="panel glass-card span2">
        <div class="panel-head">
          <div class="panel-icon pi-cyan"><el-icon><Picture /></el-icon></div>
          <div>
            <h3>自定义背景</h3>
            <p>全站页面背景，支持图片 / 渐变 / 纯色，保存后对所有用户生效</p>
          </div>
        </div>
        <div class="rows">
          <div class="row">
            <span class="row-label">背景类型</span>
            <el-select v-model="form.bgType" size="small" class="sel">
              <el-option value="theme" label="跟随主题（默认）" />
              <el-option value="image" label="图片" />
              <el-option value="gradient" label="渐变" />
              <el-option value="color" label="纯色" />
            </el-select>
          </div>

          <!-- 图片模式 -->
          <template v-if="form.bgType === 'image'">
            <div class="row">
              <span class="row-label">上传背景图</span>
              <div class="row-end">
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" class="bg-file-input" @change="onBgFile" />
                <el-button :loading="bgUploading" size="small" @click="document.querySelector('.bg-file-input')?.click()">选择图片</el-button>
              </div>
            </div>
            <div class="row">
              <span class="row-label">图片地址</span>
              <el-input v-model="form.bgImage" placeholder="http(s) 外链，或 /uploads/background/..." />
            </div>
            <div class="row">
              <span class="row-label">实时预览</span>
              <div class="bg-preview-wrap">
                <img v-if="form.bgImage" :src="form.bgImage" class="bg-preview" />
                <div v-else class="bg-preview-empty">选择或填写背景图后显示预览</div>
              </div>
            </div>
          </template>

          <!-- 渐变模式 -->
          <template v-if="form.bgType === 'gradient'">
            <div class="row">
              <span class="row-label">起始色</span>
              <el-color-picker v-model="form.bgGradientFrom" />
            </div>
            <div class="row">
              <span class="row-label">结束色</span>
              <el-color-picker v-model="form.bgGradientTo" />
            </div>
            <div class="row">
              <span class="row-label">渐变角度</span>
              <el-slider v-model="form.bgGradientAngle" :min="0" :max="360" :step="5" class="bg-slider" />
            </div>
            <div class="row">
              <span class="row-label">实时预览</span>
              <div class="bg-preview-wrap">
                <div class="bg-preview" :style="{ background: `linear-gradient(${form.bgGradientAngle}deg, ${form.bgGradientFrom} 0%, ${form.bgGradientTo} 100%)` }" />
              </div>
            </div>
          </template>

          <!-- 纯色模式 -->
          <template v-if="form.bgType === 'color'">
            <div class="row">
              <span class="row-label">背景色</span>
              <el-color-picker v-model="form.bgColor" />
            </div>
          </template>

          <!-- 遮罩强度（所有自定义类型通用） -->
          <div class="row" v-if="form.bgType !== 'theme'">
            <span class="row-label">遮罩强度</span>
            <el-slider v-model="form.bgOverlay" :min="0" :max="100" :step="5" class="bg-slider" />
          </div>
          <div class="row" v-if="form.bgType !== 'theme'">
            <span class="row-label"></span>
            <el-button link size="small" @click="resetBg">恢复默认</el-button>
          </div>
        </div>
      </section>
    </div>

    <!-- 保存栏 -->
    <div class="save-bar glass-card">
      <span class="save-hint">修改后点保存立即生效（会话有效期对下次登录生效）</span>
      <el-button type="primary" size="large" :loading="saving" @click="doSave">
        保存全部设置
      </el-button>
    </div>
  </div>
</template>

<style scoped>
.settings-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.settings-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
.span2 {
  grid-column: span 2;
}

/* ---------- 面板 ---------- */
.panel {
  border-radius: 18px;
  padding: 18px 20px;
}
.panel:hover {
  transform: none; /* 大卡片不缩放，避免压到相邻面板 */
}
.panel-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.panel-head h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
}
.panel-head p {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--text-secondary);
}
.panel-icon {
  width: 40px;
  height: 40px;
  border-radius: 13px;
  display: grid;
  place-items: center;
  font-size: 19px;
  color: #fff;
  flex-shrink: 0;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35);
}
.pi-blue {
  background: linear-gradient(135deg, #5b8cff, #7c6ff0);
}
.pi-green {
  background: linear-gradient(135deg, #2ea24f, #6fcf9a);
}
.pi-orange {
  background: linear-gradient(135deg, #e8933a, #f0b35c);
}
.pi-teal {
  background: linear-gradient(135deg, #2aa8a8, #4fc9c9);
}
.pi-red {
  background: linear-gradient(135deg, #e5484d, #f08a8e);
}
.pi-purple {
  background: linear-gradient(135deg, #9a6fe8, #c59af5);
}
.pi-cyan {
  background: linear-gradient(135deg, #2aa8d8, #6fd0e8);
}

/* ---------- 基本信息：双列表单 ---------- */
.fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px 18px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.field.span2 {
  grid-column: span 2;
}
.field label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
}
.logo-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.logo-preview {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  object-fit: contain;
  background: var(--surface);
  border: 1px solid var(--glass-border);
  flex-shrink: 0;
}

/* ---------- 其他面板：行式 ---------- */
.rows {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.row-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
}
.row-end {
  display: flex;
  align-items: center;
  gap: 8px;
}
.unit {
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
}
.num {
  width: 130px;
}
.sel {
  width: 170px;
}

/* ---------- 自定义背景 ---------- */
.bg-file-input {
  display: none;
}
.bg-preview-wrap {
  flex: 1;
  display: flex;
  justify-content: flex-end;
}
.bg-preview {
  width: 220px;
  height: 120px;
  border-radius: 12px;
  object-fit: cover;
  border: 1px solid var(--glass-border);
  box-shadow: var(--shadow);
  flex-shrink: 0;
}
.bg-preview-empty {
  width: 220px;
  height: 120px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  font-size: 12px;
  color: var(--text-secondary);
  background: var(--surface);
  border: 1px dashed var(--glass-border);
}
.bg-slider {
  flex: 1;
  max-width: 320px;
}

/* ---------- 保存栏 ---------- */
.save-bar {
  border-radius: 18px;
  padding: 14px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.save-bar:hover {
  transform: none;
}
.save-hint {
  font-size: 12px;
  color: var(--text-secondary);
}

@media (max-width: 900px) {
  .settings-grid {
    grid-template-columns: 1fr;
  }
  .span2 {
    grid-column: span 1;
  }
  .fields {
    grid-template-columns: 1fr;
  }
  .field.span2 {
    grid-column: span 1;
  }
}
</style>
