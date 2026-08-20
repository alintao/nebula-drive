<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { api, fmtSize, fmtTime } from '../api';

const storages = ref<any[]>([]);
const storageId = ref(0);
const path = ref('/');
const entries = ref<any[]>([]);
const loading = ref(false);
const selected = ref<any[]>([]);
const tableRef = ref();
const view = ref<'grid' | 'list' | 'photo'>('grid');

/* ---------- 文件类型图标（按扩展名着色，对标百度网盘） ---------- */
const FILE_TYPES: { exts: string[]; icon: string; color: string }[] = [
  { exts: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'ico'], icon: 'Picture', color: '#ec4899' },
  { exts: ['mp4', 'avi', 'mkv', 'mov', 'flv', 'wmv'], icon: 'VideoPlay', color: '#ef4444' },
  { exts: ['mp3', 'wav', 'flac', 'ogg', 'aac', 'm4a'], icon: 'Headset', color: '#f59e0b' },
  { exts: ['pdf'], icon: 'Document', color: '#dc2626' },
  { exts: ['doc', 'docx'], icon: 'Document', color: '#2563eb' },
  { exts: ['xls', 'xlsx', 'csv'], icon: 'DataLine', color: '#16a34a' },
  { exts: ['ppt', 'pptx'], icon: 'Document', color: '#ea580c' },
  { exts: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2'], icon: 'Files', color: '#ca8a04' },
  { exts: ['js', 'ts', 'py', 'java', 'c', 'cpp', 'h', 'html', 'css', 'json', 'sh', 'vue', 'go', 'rs'], icon: 'DataLine', color: '#0d9488' },
];
function fileType(name: string, isDir: boolean) {
  if (isDir) return { icon: 'Folder', color: 'var(--accent)' };
  const ext = name.split('.').pop()?.toLowerCase() || '';
  for (const t of FILE_TYPES) if (t.exts.includes(ext)) return t;
  return { icon: 'Document', color: '#94a3b8' };
}

/* ---------- 排序（服务端支持 name/size/mtime × asc/desc） ---------- */
const sortKey = ref<'name' | 'size' | 'mtime'>('name');
const sortOrder = ref<'asc' | 'desc'>('asc');

const parent = computed(() =>
  path.value === '/' ? null : path.value.replace(/\/[^/]*\/?$/, '') || '/'
);
const crumbs = computed(() => {
  const out = [{ name: '根目录', path: '/' }];
  if (path.value !== '/') {
    const segs = path.value.split('/').filter(Boolean);
    let acc = '';
    for (const s of segs) {
      acc += '/' + s;
      out.push({ name: s, path: acc });
    }
  }
  return out;
});

async function loadStorages() {
  try {
    const r = await api('/storages');
    storages.value = r.storages;
    if (!storageId.value && r.storages.length) {
      storageId.value = r.storages[0].id;
    }
  } catch (e: any) {
    ElMessage.error(e.message || '加载存储失败');
  }
}

async function load() {
  if (!storageId.value) return;
  loading.value = true;
  try {
    const r = await api(
      `/files?storageId=${storageId.value}&path=${encodeURIComponent(path.value)}&sort=${sortKey.value}&order=${sortOrder.value}`
    );
    entries.value = r.entries;
  } catch (e: any) {
    ElMessage.error(e.message || '加载目录失败');
  } finally {
    loading.value = false;
  }
}

function onStorageChange() {
  path.value = '/';
  load();
}

function openDir(e: any) {
  if (e.isDir) {
    path.value = e.path;
    load();
  }
}

function goCrumb(p: string) {
  path.value = p;
  load();
}

/** 更多菜单命令分发 */
function handleMoreCmd(cmd: string, row: any) {
  switch (cmd) {
    case 'share': openShare(row); break;
    case 'rename': openRename(row); break;
    case 'props': openProps(row); break;
    case 'move': openMove(row, 'move'); break;
    case 'copy': openMove(row, 'copy'); break;
  }
}

/* ---------- 新建文件夹 ---------- */
const mkdirDialog = ref(false);
const mkdirName = ref('');
async function doMkdir() {
  const name = mkdirName.value.trim();
  if (!name) return ElMessage.warning('请输入文件夹名称');
  const p = (path.value === '/' ? '' : path.value) + '/' + name;
  try {
    await api('/files/mkdir', { method: 'POST', body: JSON.stringify({ storageId: storageId.value, path: p }) });
    ElMessage.success('已创建');
    mkdirDialog.value = false;
    mkdirName.value = '';
    load();
  } catch (e: any) {
    ElMessage.error(e.message || '创建失败');
  }
}

/* ---------- 重命名 ---------- */
const renameDialog = ref(false);
const renameTarget = ref<any>(null);
const renameValue = ref('');
function openRename(row: any) {
  renameTarget.value = row;
  renameValue.value = row.name;
  renameDialog.value = true;
}
async function doRename() {
  const name = renameValue.value.trim();
  if (!name) return ElMessage.warning('名称不能为空');
  const p = renameTarget.value.path;
  const dir = p.replace(/\/[^/]*$/, '') || '/';
  const newPath = (dir === '/' ? '' : dir) + '/' + name;
  try {
    await api('/files/rename', {
      method: 'POST',
      body: JSON.stringify({ storageId: storageId.value, path: p, newPath }),
    });
    ElMessage.success('重命名成功');
    renameDialog.value = false;
    load();
  } catch (e: any) {
    ElMessage.error(e.message || '重命名失败');
  }
}

/* ---------- 移动 / 复制 ---------- */
const moveDialog = ref(false);
const moveTarget = ref<any>(null);
const moveMode = ref<'move' | 'copy'>('move');
const moveDest = ref('/');
function openMove(row: any, mode: 'move' | 'copy') {
  moveTarget.value = row;
  moveMode.value = mode;
  moveDest.value = parent.value || '/';
  moveDialog.value = true;
}
async function doMove() {
  const dest = moveDest.value.trim() || '/';
  const destDir = dest.endsWith('/') ? dest : dest + '/';
  const destPath = (destDir === '/' ? '' : destDir) + moveTarget.value.name;
  try {
    await api(moveMode.value === 'move' ? '/files/move' : '/files/copy', {
      method: 'POST',
      body: JSON.stringify({ storageId: storageId.value, path: moveTarget.value.path, destPath }),
    });
    ElMessage.success(moveMode.value === 'move' ? '移动成功' : '复制成功');
    moveDialog.value = false;
    load();
  } catch (e: any) {
    ElMessage.error(e.message || '操作失败');
  }
}

/* ---------- 删除 ---------- */
async function doDelete(row: any) {
  try {
    await ElMessageBox.confirm(`确定删除「${row.name}」吗？删除后可在回收站恢复。`, '删除确认', { type: 'warning' });
  } catch {
    return;
  }
  try {
    await api('/files/delete', { method: 'POST', body: JSON.stringify({ storageId: storageId.value, path: row.path }) });
    ElMessage.success('已删除到回收站');
    load();
  } catch (e: any) {
    ElMessage.error(e.message || '删除失败');
  }
}

async function doBatchDelete() {
  if (!selected.value.length) return ElMessage.warning('请先选择文件');
  try {
    await ElMessageBox.confirm(`确定删除选中的 ${selected.value.length} 项吗？`, '批量删除', { type: 'warning' });
  } catch {
    return;
  }
  try {
    await api('/files/batch-delete', {
      method: 'POST',
      body: JSON.stringify({ storageId: storageId.value, paths: selected.value.map((x: any) => x.path) }),
    });
    ElMessage.success('批量删除完成');
    load();
  } catch (e: any) {
    ElMessage.error(e.message || '批量删除失败');
  }
}

/* ---------- 下载 ---------- */
/* 大文件不能 fetch+blob 整包缓冲（内存爆掉报 Failed to fetch），
   改为：签发一次性票据 → 锚点跳转，浏览器原生流式下载到磁盘（有进度条、可取消） */
async function download(row: any) {
  try {
    const r = await api('/files/download-ticket', { method: 'POST', body: JSON.stringify({ storageId: storageId.value, path: row.path }) });
    const a = document.createElement('a');
    a.href = `/api/v1/files/download?ticket=${r.ticket}`;
    a.click();
  } catch (e: any) {
    ElMessage.error(e.message || '下载失败');
  }
}

/* ---------- 图片 / 视频预览 ---------- */
const IMG_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'ico'];
const VIDEO_EXTS = ['mp4', 'mkv', 'mov', 'webm', 'avi', 'flv', 'wmv', 'm4v', 'ts', '3gp'];
const AUDIO_EXTS = ['mp3', 'wav', 'flac', 'ogg', 'aac', 'm4a'];
const previewDialog = ref(false);
const previewUrl = ref('');
const previewLoading = ref(false);
const previewName = ref('');
const previewPath = ref('');  // 完整文件路径（用于新窗口打开）
const previewSize = ref(0);
const previewKind = ref<'image' | 'video' | 'audio' | 'pdf' | 'code'>('image');
/* ---------- 图片增强功能（对标百度网盘/夸克/Google Drive） ---------- */
const imgScale = ref(1);          // 缩放比例 (0.1 ~ 5.0)
const imgRotation = ref(0);       // 旋转角度 (0/90/180/270)
const imgFit = ref<'original' | 'fit-width' | 'fit-height' | 'fullscreen'>('fit-width');
const isFullscreen = ref(false);
const imgInfo = ref<{ width: number; height: number; type: string } | null>(null);
const imgLoading = ref(false);

const ZOOM_STEPS = [0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4, 5];
const ZOOM_STEP_MULT = 1.25;      // 每次缩放倍数

function zoomIn() {
  if (imgScale.value < 5) imgScale.value = Math.min(5, imgScale.value * ZOOM_STEP_MULT);
}
function zoomOut() {
  if (imgScale.value > 0.1) imgScale.value = Math.max(0.1, imgScale.value / ZOOM_STEP_MULT);
}
function resetZoom() {
  imgScale.value = 1;
  imgRotation.value = 0;
  imgFit.value = 'fit-width';
}
function rotateLeft() {
  imgRotation.value = (imgRotation.value + 270) % 360;
}
function rotateRight() {
  imgRotation.value = (imgRotation.value + 90) % 360;
}
function setFit(mode: 'original' | 'fit-width' | 'fit-height' | 'fullscreen') {
  imgFit.value = mode;
  if (mode === 'fullscreen') {
    isFullscreen.value = true;
  } else {
    isFullscreen.value = false;
  }
  imgScale.value = 1;
}
function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value;
}

// 鼠标滚轮缩放
function onWheel(e: WheelEvent) {
  if (previewKind.value !== 'image') return;
  e.preventDefault();
  if (e.deltaY < 0) zoomIn();
  else zoomOut();
}

// 键盘快捷键
function onImageKey(e: KeyboardEvent) {
  if (previewKind.value !== 'image') return;
  switch (e.key) {
    case '+': case '=': zoomIn(); break;
    case '-': zoomOut(); break;
    case '0': resetZoom(); break;
    case 'r': case 'R': rotateRight(); break;
    case 'f': case 'F': toggleFullscreen(); break;
    case '1': setFit('original'); break;
    case '2': setFit('fit-width'); break;
    case '3': setFit('fit-height'); break;
    case '4': setFit('fullscreen'); break;
  }
}

// 加载图片信息
async function loadImgInfo(url: string) {
  imgLoading.value = true;
  imgInfo.value = null;
  try {
    const img = new Image();
    img.src = url;
    await new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve;
    });
    imgInfo.value = {
      width: img.naturalWidth,
      height: img.naturalHeight,
      type: url.split('.').pop()?.toUpperCase() || 'UNKNOWN',
    };
  } catch {
    imgInfo.value = null;
  } finally {
    imgLoading.value = false;
  }
}

function extOf(name: string) {
  return name.split('.').pop()?.toLowerCase() || '';
}
function isImage(name: string) {
  return IMG_EXTS.includes(extOf(name));
}
function isVideo(name: string) {
  return VIDEO_EXTS.includes(extOf(name));
}
function isAudio(name: string) {
  return AUDIO_EXTS.includes(extOf(name));
}
const CODE_EXTS = ['js', 'ts', 'py', 'java', 'c', 'cpp', 'h', 'html', 'css', 'json', 'sh', 'vue', 'go', 'rs', 'xml', 'yml', 'yaml', 'md', 'txt', 'sql', 'ini', 'conf', 'env'];
function isCode(name: string) {
  return CODE_EXTS.includes(extOf(name));
}
function isPreviewable(name: string) {
  return isImage(name) || isVideo(name) || isAudio(name) || isPdf(name) || isCode(name);
}

const previewCode = ref('');

/* ---------- 压缩包预览 ---------- */
const archiveDialog = ref(false);
const archiveName = ref('');
const archiveEntries = ref<any[]>([]);
const archiveLoading = ref(false);
const ARCHIVE_EXTS = ['zip', 'tar', 'gz', 'tgz', 'bz2', '7z'];
function isArchive(name: string) {
  return ARCHIVE_EXTS.includes(extOf(name));
}
async function openArchivePreview(row: any) {
  archiveName.value = row.name;
  archiveDialog.value = true;
  archiveLoading.value = true;
  archiveEntries.value = [];
  try {
    const token = localStorage.getItem('nebula_token') || '';
    const res = await fetch(
      `/api/v1/files/${encodeURIComponent(row.path)}/archive-list?storageId=${storageId.value}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) throw new Error('获取压缩包内容失败');
    const data = await res.json();
    archiveEntries.value = data.data.entries || [];
  } catch (e: any) {
    ElMessage.error(e.message || '获取压缩包内容失败');
  } finally {
    archiveLoading.value = false;
  }
}
async function openPreview(row: any) {
  if (row.isDir) return;
  const kind = isVideo(row.name) ? 'video' : isAudio(row.name) ? 'audio' : isPdf(row.name) ? 'pdf' : isImage(row.name) ? 'image' : isCode(row.name) ? 'code' : null;
  if (!kind) return download(row);
  previewName.value = row.name;
  previewPath.value = row.path;  // 保存完整路径
  previewSize.value = row.size || 0;
  previewKind.value = kind;
  previewDialog.value = true;
  previewLoading.value = true;
  previewUrl.value = '';
  previewCode.value = '';
  // 重置图片状态
  imgScale.value = 1;
  imgRotation.value = 0;
  imgFit.value = 'fit-width';
  isFullscreen.value = false;
  imgInfo.value = null;
  try {
    const token = localStorage.getItem('nebula_token') || '';
    const base = `/api/v1/files/preview?storageId=${storageId.value}&path=${encodeURIComponent(row.path)}`;
    if (previewKind.value === 'image' || previewKind.value === 'pdf' || previewKind.value === 'code') {
      // 图片 / PDF / 代码：带 Bearer 头拉取 blob
      const res = await fetch(base, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('预览加载失败');
      if (previewKind.value === 'code') {
        // 代码文件：读取文本内容
        const text = await res.text();
        previewCode.value = text.length > 50000 ? text.slice(0, 50000) + '\n... (内容过长，仅显示前 50KB)' : text;
        previewUrl.value = 'code-loaded';
      } else {
        const blob = await res.blob();
        previewUrl.value = URL.createObjectURL(blob);
        // 加载图片信息
        if (previewKind.value === 'image') {
          loadImgInfo(previewUrl.value);
        }
      }
    } else {
      // 视频 / 音频：用 ?token= 直连流地址，支持 Range 拖动
      previewUrl.value = `${base}&token=${encodeURIComponent(token)}`;
      const res = await fetch(`${base}&token=${encodeURIComponent(token)}`, {
        headers: { Range: 'bytes=0-0' },
      });
      if (!res.ok) throw new Error('预览加载失败');
    }
  } catch (e: any) {
    ElMessage.error(e.message || '预览加载失败');
    previewDialog.value = false;
  } finally {
    previewLoading.value = false;
  }
}

function closePreview() {
  previewDialog.value = false;
  if (previewUrl.value && previewUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(previewUrl.value);
  }
  previewUrl.value = '';
  previewPath.value = '';
}

/** 在新窗口打开图片 */
function openInNewTab() {
  if (previewKind.value !== 'image' || !previewUrl.value) return;
  // 使用当前预览的完整路径
  const token = localStorage.getItem('nebula_token') || '';
  // previewPath 存储了完整的文件路径
  const filePath = previewPath.value || previewName.value;
  const base = `/api/v1/files/preview?storageId=${storageId.value}&path=${encodeURIComponent(filePath)}`;
  const url = `${base}&token=${encodeURIComponent(token)}`;
  window.open(url, '_blank');
}

/* ---------- 上传 ---------- */
const fileInput = ref<HTMLInputElement>();
const uploadDialog = ref(false);
const uploads = ref<{ name: string; percent: number; status: string }[]>([]);

function pickFiles() {
  fileInput.value?.click();
}

function onPick(e: Event) {
  const files = (e.target as HTMLInputElement).files;
  if (files && files.length) {
    uploadDialog.value = true;
    startUploads(Array.from(files));
  }
  (e.target as HTMLInputElement).value = '';
}

async function startUploads(files: File[]) {
  for (const f of files) {
    // 先 push 再取回，确保拿到的是响应式代理（直接改普通对象不会触发视图更新）
    uploads.value.push({ name: f.name, percent: 0, status: '上传中' });
    const u = uploads.value[uploads.value.length - 1];
    try {
      if (f.size <= 10 * 1024 * 1024) {
        await directUpload(f, u);
      } else {
        await chunkUpload(f, u);
      }
      u.status = '完成';
      u.percent = 100;
    } catch (err: any) {
      u.status = '失败: ' + (err.message || '未知错误');
    }
  }
  load();
  if (uploads.value.every((x) => x.status === '完成')) {
    setTimeout(() => { uploadDialog.value = false; }, 1200);
  }
}

/* ---------- 直接分享 ---------- */
const shareDialog = ref(false);
const shareTarget = ref<any>(null);
const shareForm = ref({ name: '', password: '', expireDays: 0, maxDownloads: 0 });
const shareResult = ref<{ url: string; token: string } | null>(null);
const shareBusy = ref(false);

function openShare(row: any) {
  shareTarget.value = row;
  shareForm.value = { name: row.name, password: '', expireDays: 0, maxDownloads: 0 };
  shareResult.value = null;
  shareDialog.value = true;
}

async function doShare() {
  if (!shareTarget.value) return;
  shareBusy.value = true;
  try {
    const body: any = {
      storageId: storageId.value,
      path: shareTarget.value.path,
      name: shareForm.value.name || undefined,
    };
    if (shareForm.value.password) body.password = shareForm.value.password;
    if (shareForm.value.expireDays > 0) {
      // 有效期 = 现在 + N 天；服务端按 SQLite datetime（UTC）比较
      const ms = Date.now() + shareForm.value.expireDays * 86400000;
      body.expiresAt = new Date(ms).toISOString().replace('T', ' ').slice(0, 19);
    }
    if (shareForm.value.maxDownloads > 0) body.maxDownloads = shareForm.value.maxDownloads;
    const r = await api('/shares', { method: 'POST', body: JSON.stringify(body) });
    shareResult.value = { url: r.url, token: r.share?.token };
  } catch (e: any) {
    ElMessage.error(e.message || '创建分享失败');
  } finally {
    shareBusy.value = false;
  }
}

function copyShareUrl() {
  if (!shareResult.value) return;
  navigator.clipboard?.writeText(shareResult.value.url).then(
    () => ElMessage.success('分享链接已复制'),
    () => ElMessage.warning('请手动复制：' + shareResult.value.url)
  );
}

async function directUpload(f: File, u: any) {
  const fd = new FormData();
  fd.append('storageId', String(storageId.value));
  fd.append('path', path.value);
  fd.append('name', f.name);
  fd.append('file', f);
  await api('/upload/direct', { method: 'POST', body: fd });
  u.percent = 100;
}

async function chunkUpload(f: File, u: any) {
  const init = await api('/upload/init', {
    method: 'POST',
    body: JSON.stringify({ storageId: storageId.value, path: path.value, name: f.name, size: f.size }),
  });
  const { uploadId, chunkSize } = init;
  const total = Math.ceil(f.size / chunkSize);
  const token = localStorage.getItem('nebula_token') || '';
  for (let i = 0; i < total; i++) {
    const off = i * chunkSize;
    const chunk = f.slice(off, Math.min(off + chunkSize, f.size));
    const res = await fetch(`/api/v1/upload/chunk?uploadId=${uploadId}&chunkIndex=${i}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/octet-stream' },
      body: chunk,
    });
    if (!res.ok) throw new Error(`分片 ${i} 上传失败 (HTTP ${res.status})`);
    u.percent = Math.round(((i + 1) / total) * 100);
  }
  await api('/upload/complete', { method: 'POST', body: JSON.stringify({ uploadId }) });
  u.percent = 100;
}

/* ---------- 批量下载（zip）---------- */
const batchDownloading = ref(false);
async function doBatchDownload() {
  if (!selected.value.length) return ElMessage.warning('请先选择文件');
  const fileRows = selected.value.filter((x: any) => !x.isDir);
  if (!fileRows.length) return ElMessage.warning('请选择文件（文件夹不支持打包）');
  batchDownloading.value = true;
  try {
    const token = localStorage.getItem('nebula_token') || '';
    const res = await fetch('/api/v1/files/batch-download', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ storageId: storageId.value, paths: fileRows.map((x: any) => x.path) }),
    });
    if (!res.ok) throw new Error('打包失败');
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'batch-download.zip';
    a.click();
    URL.revokeObjectURL(a.href);
    ElMessage.success('批量下载完成');
  } catch (e: any) {
    ElMessage.error(e.message || '批量下载失败');
  } finally {
    batchDownloading.value = false;
  }
}

/* ---------- 文件属性面板 ---------- */
const propsDrawer = ref(false);
const propsMeta = ref<any>(null);
const propsLoading = ref(false);
const propsTarget = ref<any>(null);
async function openProps(row: any) {
  if (row.isDir) return;
  propsTarget.value = row;
  propsDrawer.value = true;
  propsLoading.value = true;
  propsMeta.value = null;
  try {
    const r = await api(`/files/${encodeURIComponent(row.path)}/meta?storageId=${storageId.value}`);
    propsMeta.value = r.meta;
  } catch (e: any) {
    ElMessage.error(e.message || '获取属性失败');
  } finally {
    propsLoading.value = false;
  }
}

/* ---------- 图片画廊（前后导航）---------- */
const galleryIndex = ref(0);
const galleryImages = ref<any[]>([]);
function openGallery(row: any) {
  // 收集当前目录所有图片
  galleryImages.value = entries.value.filter((e: any) => !e.isDir && isImage(e.name));
  galleryIndex.value = galleryImages.value.findIndex((e: any) => e.path === row.path);
  if (galleryIndex.value < 0) galleryIndex.value = 0;
  openPreview(row);
}
function galleryPrev() {
  if (galleryIndex.value > 0) {
    galleryIndex.value--;
    openPreview(galleryImages.value[galleryIndex.value]);
  }
}
function galleryNext() {
  if (galleryIndex.value < galleryImages.value.length - 1) {
    galleryIndex.value++;
    openPreview(galleryImages.value[galleryIndex.value]);
  }
}
function onGalleryKey(e: KeyboardEvent) {
  if (previewDialog.value && previewKind.value === 'image' && galleryImages.value.length > 1) {
    if (e.key === 'ArrowLeft') galleryPrev();
    if (e.key === 'ArrowRight') galleryNext();
  }
}
onMounted(() => {
  document.addEventListener('keydown', onGalleryKey);
});
onUnmounted(() => {
  document.removeEventListener('keydown', onGalleryKey);
});

/* ---------- PDF 预览 ---------- */
const PDF_EXTS = ['pdf'];
function isPdf(name: string) {
  return PDF_EXTS.includes(extOf(name));
}

/* ---------- 搜索 ---------- */
const searchDialog = ref(false);
const searchQ = ref('');
const searchResults = ref<any[]>([]);
const searching = ref(false);
const searchFilters = ref({ type: '', minSize: '', maxSize: '', since: '', until: '' });
async function doSearch() {
  const q = searchQ.value.trim();
  if (!q) return;
  searching.value = true;
  try {
    let url = `/search?q=${encodeURIComponent(q)}`;
    if (searchFilters.value.type) url += `&type=${encodeURIComponent(searchFilters.value.type)}`;
    if (searchFilters.value.minSize) url += `&minSize=${searchFilters.value.minSize}`;
    if (searchFilters.value.maxSize) url += `&maxSize=${searchFilters.value.maxSize}`;
    if (searchFilters.value.since) url += `&since=${encodeURIComponent(searchFilters.value.since)}`;
    if (searchFilters.value.until) url += `&until=${encodeURIComponent(searchFilters.value.until)}`;
    const r = await api(url);
    searchResults.value = r.results;
    // 记录搜索历史
    api('/search-history', { method: 'POST', body: JSON.stringify({ query: q }) }).catch(() => {});
  } catch (e: any) {
    ElMessage.error(e.message || '搜索失败');
  } finally {
    searching.value = false;
  }
}
function openSearchResult(r: any) {
  const e = r.entry;
  searchDialog.value = false;
  if (r.storageId !== storageId.value) {
    storageId.value = r.storageId;
  }
  path.value = e.isDir ? e.path : (e.path.replace(/\/[^/]*$/, '') || '/');
  load();
}

/* ---------- 照片视图 ---------- */
const PHOTO_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'ico'];
const photoEntries = computed(() =>
  entries.value.filter((e) => {
    if (e.isDir) return false;
    const ext = e.name.split('.').pop()?.toLowerCase() || '';
    return PHOTO_EXTS.includes(ext);
  })
);
function photoUrl(row: any) {
  return `/api/v1/files/${encodeURIComponent(row.path)}?storageId=${storageId.value}&t=thumb`;
}

onMounted(async () => {
  await loadStorages();
  if (storageId.value) load();
});
</script>

<template>
  <div class="files-page">
    <div class="files-glass glass">
      <div class="toolbar">
        <el-select v-model="storageId" size="default" class="storage-select" @change="onStorageChange">
          <el-option v-for="s in storages" :key="s.id" :label="s.name" :value="s.id" />
        </el-select>
        <el-breadcrumb separator="/" class="crumbs">
          <el-breadcrumb-item v-for="c in crumbs" :key="c.path">
            <a class="crumb" @click="goCrumb(c.path)">{{ c.name }}</a>
          </el-breadcrumb-item>
        </el-breadcrumb>
        <div class="spacer" />
        <!-- 排序：字段 + 升降序 -->
        <el-select v-model="sortKey" size="small" class="sort-select" @change="load">
          <el-option label="按名称" value="name" />
          <el-option label="按大小" value="size" />
          <el-option label="按时间" value="mtime" />
        </el-select>
        <button class="sort-order-btn glass-btn" :title="sortOrder === 'asc' ? '当前升序，点击切换降序' : '当前降序，点击切换升序'" @click="sortOrder = sortOrder === 'asc' ? 'desc' : 'asc'; load()">
          <el-icon><ArrowUp v-if="sortOrder === 'asc'" /><ArrowDown v-else /></el-icon>
        </button>
        <!-- 视图切换：网格 / 列表 / 照片 -->
        <div class="view-toggle glass-btn">
          <button class="vt-btn" :class="{ active: view === 'grid' }" title="网格视图" @click="view = 'grid'">
            <el-icon><Grid /></el-icon>
          </button>
          <button class="vt-btn" :class="{ active: view === 'list' }" title="列表视图" @click="view = 'list'">
            <el-icon><List /></el-icon>
          </button>
          <button class="vt-btn" :class="{ active: view === 'photo' }" title="照片视图" @click="view = 'photo'">
            <el-icon><PictureFilled /></el-icon>
          </button>
        </div>
        <el-button size="small" @click="load"><el-icon><Refresh /></el-icon>&nbsp;刷新</el-button>
        <el-button size="small" @click="searchDialog = true"><el-icon><Search /></el-icon>&nbsp;搜索</el-button>
        <el-button size="small" @click="mkdirDialog = true; mkdirName = ''"><el-icon><FolderAdd /></el-icon>&nbsp;新建文件夹</el-button>
        <el-button size="small" type="primary" @click="pickFiles"><el-icon><Upload /></el-icon>&nbsp;上传文件</el-button>
        <el-button size="small" type="danger" :disabled="!selected.length" @click="doBatchDelete">
          <el-icon><Delete /></el-icon>&nbsp;删除选中
        </el-button>
        <el-button size="small" type="success" :disabled="!selected.length" :loading="batchDownloading" @click="doBatchDownload">
          <el-icon><Download /></el-icon>&nbsp;批量下载
        </el-button>
      </div>

      <!-- 网格视图（毛玻璃卡片 + 悬浮微动画） -->
      <div v-if="view === 'grid'" v-loading="loading" class="file-grid">
        <div
          v-for="row in entries"
          :key="row.path"
          class="file-card glass-card"
          @click="openDir(row)"
        >
          <div class="fc-icon">
            <el-icon :size="42" :color="fileType(row.name, row.isDir).color">
              <component :is="fileType(row.name, row.isDir).icon" />
            </el-icon>
          </div>
          <div class="fc-name" :title="row.name">{{ row.name }}</div>
          <div class="fc-meta">{{ row.isDir ? '文件夹' : fmtSize(row.size) }}</div>
          <div class="fc-actions" @click.stop>
            <!-- 文件夹：保持原有操作 -->
            <template v-if="row.isDir">
              <el-tooltip content="分享" placement="top" :show-after="300">
                <el-button link @click="openShare(row)"><el-icon><Share /></el-icon></el-button>
              </el-tooltip>
              <el-tooltip content="重命名" placement="top" :show-after="300">
                <el-button link @click="openRename(row)"><el-icon><EditPen /></el-icon></el-button>
              </el-tooltip>
              <el-tooltip content="删除" placement="top" :show-after="300">
                <el-button link type="danger" @click="doDelete(row)"><el-icon><Delete /></el-icon></el-button>
              </el-tooltip>
            </template>
            <!-- 文件：核心操作 + 更多菜单 -->
            <template v-else>
              <el-tooltip v-if="isPreviewable(row.name)" content="预览" placement="top" :show-after="300">
                <el-button link @click="openPreview(row)"><el-icon><View /></el-icon></el-button>
              </el-tooltip>
              <el-tooltip content="下载" placement="top" :show-after="300">
                <el-button link @click="download(row)"><el-icon><Download /></el-icon></el-button>
              </el-tooltip>
              <el-tooltip v-if="isArchive(row.name)" content="压缩包内容" placement="top" :show-after="300">
                <el-button link @click="openArchivePreview(row)"><el-icon><Files /></el-icon></el-button>
              </el-tooltip>
              <el-tooltip content="删除" placement="top" :show-after="300">
                <el-button link type="danger" @click="doDelete(row)"><el-icon><Delete /></el-icon></el-button>
              </el-tooltip>
              <el-dropdown trigger="click" @command="(cmd: string) => handleMoreCmd(cmd, row)">
                <el-button link class="more-btn"><el-icon><MoreFilled /></el-icon></el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="share"><el-icon><Share /></el-icon>分享</el-dropdown-item>
                    <el-dropdown-item command="rename"><el-icon><EditPen /></el-icon>重命名</el-dropdown-item>
                    <el-dropdown-item command="props"><el-icon><InfoFilled /></el-icon>属性</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </template>
          </div>
        </div>
        <div v-if="!loading && !entries.length" class="empty">此文件夹为空</div>
      </div>

      <!-- 列表视图 -->
      <el-table
        v-else
        ref="tableRef"
        v-loading="loading"
        class="file-table"
        :data="entries"
        row-key="path"
        @selection-change="(v: any[]) => (selected = v)"
        @row-click="(r: any) => openDir(r.row)"
      >
        <el-table-column type="selection" width="40" />
        <el-table-column label="名称" min-width="300">
          <template #default="{ row }">
            <el-icon class="f-icon" :color="fileType(row.name, row.isDir).color">
              <component :is="fileType(row.name, row.isDir).icon" />
            </el-icon>
            <span class="f-name" :class="{ dir: row.isDir }" @click.stop="openDir(row)">{{ row.name }}</span>
          </template>
        </el-table-column>
        <el-table-column label="大小" width="120">
          <template #default="{ row }">{{ row.isDir ? '-' : fmtSize(row.size) }}</template>
        </el-table-column>
        <el-table-column label="修改时间" width="180">
          <template #default="{ row }">{{ fmtTime(row.mtime) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="330">
          <template #default="{ row }">
            <!-- 文件夹：保持原有操作 -->
            <template v-if="row.isDir">
              <el-button link type="primary" size="small" @click.stop="openShare(row)">分享</el-button>
              <el-button link type="primary" size="small" @click.stop="openRename(row)">重命名</el-button>
              <el-button link type="primary" size="small" @click.stop="openMove(row, 'move')">移动</el-button>
              <el-button link type="primary" size="small" @click.stop="openMove(row, 'copy')">复制</el-button>
              <el-button link type="danger" size="small" @click.stop="doDelete(row)">删除</el-button>
            </template>
            <!-- 文件：核心操作 + 更多菜单 -->
            <div v-else class="row-actions">
              <el-button v-if="isPreviewable(row.name)" link type="primary" size="small" @click.stop="openPreview(row)">预览</el-button>
              <el-button link type="primary" size="small" @click.stop="download(row)">下载</el-button>
              <el-button link type="danger" size="small" @click.stop="doDelete(row)">删除</el-button>
              <el-dropdown trigger="click" @command="(cmd: string) => handleMoreCmd(cmd, row)">
                <el-button link size="small" class="more-btn"><el-icon><MoreFilled /></el-icon></el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="share">分享</el-dropdown-item>
                    <el-dropdown-item command="rename">重命名</el-dropdown-item>
                    <el-dropdown-item command="move">移动</el-dropdown-item>
                    <el-dropdown-item command="copy">复制</el-dropdown-item>
                    <el-dropdown-item command="props">属性</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <!-- 照片视图（仅显示图片文件） -->
      <div v-if="view === 'photo'" v-loading="loading" class="photo-grid">
        <div
          v-for="row in photoEntries"
          :key="row.path"
          class="photo-card"
          @click="openPreview(row)"
        >
          <img :src="photoUrl(row)" :alt="row.name" loading="lazy" />
          <div class="photo-name">{{ row.name }}</div>
        </div>
        <div v-if="!loading && !photoEntries.length" class="empty">此文件夹没有图片文件</div>
      </div>
    </div>

    <!-- 新建文件夹 -->
    <el-dialog v-model="mkdirDialog" title="新建文件夹" width="420px">
      <el-input v-model="mkdirName" placeholder="文件夹名称" @keyup.enter="doMkdir" />
      <template #footer>
        <el-button @click="mkdirDialog = false">取消</el-button>
        <el-button type="primary" @click="doMkdir">创建</el-button>
      </template>
    </el-dialog>

    <!-- 重命名 -->
    <el-dialog v-model="renameDialog" title="重命名" width="420px">
      <el-input v-model="renameValue" @keyup.enter="doRename" />
      <template #footer>
        <el-button @click="renameDialog = false">取消</el-button>
        <el-button type="primary" @click="doRename">确定</el-button>
      </template>
    </el-dialog>

    <!-- 移动 / 复制 -->
    <el-dialog v-model="moveDialog" :title="moveMode === 'move' ? '移动到' : '复制到'" width="460px">
      <div class="form-tip">目标目录（相对存储根目录，以 / 开头）</div>
      <el-input v-model="moveDest" placeholder="/docs/" />
      <template #footer>
        <el-button @click="moveDialog = false">取消</el-button>
        <el-button type="primary" @click="doMove">确定</el-button>
      </template>
    </el-dialog>

    <!-- 直接分享 -->
    <el-dialog v-model="shareDialog" title="分享" width="520px">
      <div v-if="!shareResult">
        <div class="form-tip">
          分享对象：<b>{{ shareTarget?.path }}</b>（{{ shareTarget?.isDir ? '文件夹' : '文件' }}）
        </div>
        <el-form label-width="90px" style="margin-top: 12px">
          <el-form-item label="分享名称">
            <el-input v-model="shareForm.name" placeholder="默认使用文件/文件夹名称" />
          </el-form-item>
          <el-form-item label="提取码">
            <el-input v-model="shareForm.password" placeholder="可选，访问者需输入提取码" />
          </el-form-item>
          <el-form-item label="有效期">
            <el-radio-group v-model="shareForm.expireDays">
              <el-radio-button :label="0">永久</el-radio-button>
              <el-radio-button :label="1">1 天</el-radio-button>
              <el-radio-button :label="7">1 周</el-radio-button>
              <el-radio-button :label="30">1 个月</el-radio-button>
              <el-radio-button :label="90">3 个月</el-radio-button>
              <el-radio-button :label="180">6 个月</el-radio-button>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="下载次数">
            <el-input v-model.number="shareForm.maxDownloads" type="number" placeholder="0 表示不限" />
          </el-form-item>
        </el-form>
      </div>
      <div v-else>
        <div class="form-tip">分享已创建！把下面的链接发给别人即可访问：</div>
        <el-input :model-value="shareResult.url" readonly style="margin-top: 12px" />
      </div>
      <template #footer>
        <template v-if="!shareResult">
          <el-button @click="shareDialog = false">取消</el-button>
          <el-button type="primary" :loading="shareBusy" @click="doShare">创建分享</el-button>
        </template>
        <template v-else>
          <el-button @click="shareResult = null">再创建一个</el-button>
          <el-button type="primary" @click="copyShareUrl">复制链接</el-button>
        </template>
      </template>
    </el-dialog>

    <!-- 搜索 -->
    <el-dialog v-model="searchDialog" title="全局搜索" width="640px">
      <div class="search-bar">
        <el-input v-model="searchQ" placeholder="输入文件名关键字" @keyup.enter="doSearch" />
        <el-button type="primary" :loading="searching" @click="doSearch">搜索</el-button>
      </div>
      <!-- 高级过滤 -->
      <div class="search-filters">
        <el-input v-model="searchFilters.type" placeholder="扩展名 (如 pdf, jpg)" size="small" style="width: 160px" />
        <el-input v-model="searchFilters.minSize" placeholder="最小大小(B)" size="small" style="width: 120px" />
        <el-input v-model="searchFilters.maxSize" placeholder="最大大小(B)" size="small" style="width: 120px" />
        <el-date-picker v-model="searchFilters.since" type="date" placeholder="起始日期" size="small" style="width: 140px" />
        <el-date-picker v-model="searchFilters.until" type="date" placeholder="截止日期" size="small" style="width: 140px" />
      </div>
      <el-table :data="searchResults" max-height="360" class="search-table">
        <el-table-column label="名称" min-width="200">
          <template #default="{ row }">
            <el-icon class="f-icon" :color="row.entry.isDir ? '#409eff' : '#909399'">
              <Folder v-if="row.entry.isDir" />
              <Document v-else />
            </el-icon>
            <span class="f-name">{{ row.entry.name }}</span>
          </template>
        </el-table-column>
        <el-table-column label="存储" width="140" prop="storageName" />
        <el-table-column label="路径" min-width="220" prop="entry.path" show-overflow-tooltip />
        <el-table-column label="操作" width="90">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openSearchResult(row)">打开</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <!-- 上传进度 -->
    <el-dialog v-model="uploadDialog" title="上传进度" width="480px">
      <div v-for="u in uploads" :key="u.name" class="upload-item">
        <div class="upload-name">{{ u.name }}</div>
        <el-progress :percentage="u.percent" :status="u.status === '完成' ? 'success' : u.status === '上传中' ? undefined : 'exception'" :stroke-width="10" />
        <div class="upload-status">{{ u.status }}</div>
      </div>
    </el-dialog>

    <!-- 文件属性抽屉 -->
    <el-drawer v-model="propsDrawer" title="文件属性" size="360px" direction="rtl">
      <div v-loading="propsLoading" class="props-wrap">
        <div v-if="propsMeta" class="props-list">
          <div class="props-row"><span class="props-label">名称</span><span class="props-value">{{ propsMeta.name }}</span></div>
          <div class="props-row"><span class="props-label">路径</span><span class="props-value">{{ propsMeta.path }}</span></div>
          <div class="props-row"><span class="props-label">大小</span><span class="props-value">{{ fmtSize(propsMeta.size) }}</span></div>
          <div class="props-row"><span class="props-label">扩展名</span><span class="props-value">{{ propsMeta.ext || '-' }}</span></div>
          <div class="props-row"><span class="props-label">修改时间</span><span class="props-value">{{ fmtTime(propsMeta.mtime) }}</span></div>
          <div class="props-row"><span class="props-label">创建时间</span><span class="props-value">{{ fmtTime(propsMeta.created) }}</span></div>
          <div v-if="propsMeta.width" class="props-row"><span class="props-label">尺寸</span><span class="props-value">{{ propsMeta.width }} × {{ propsMeta.height }}</span></div>
        </div>
        <div v-else-if="!propsLoading" class="empty">无数据</div>
      </div>
    </el-drawer>

    <!-- 图片 / 视频 / 音频 / PDF / 代码 预览（增强版） -->
    <el-dialog
      v-model="previewDialog"
      :title="previewName"
      :width="previewKind === 'image' ? (isFullscreen ? '100%' : '90%') : '880px'"
      :top="isFullscreen ? '0' : '3vh'"
      :fullscreen="isFullscreen"
      class="preview-dialog"
      @close="closePreview"
    >
      <div class="preview-wrap" v-loading="previewLoading">
        <!-- 图片预览（增强版：缩放/旋转/适应/全屏/信息） -->
        <template v-if="previewKind === 'image' && previewUrl">
          <div class="image-preview-container" @wheel.prevent="onWheel">
            <img
              :src="previewUrl"
              class="preview-img-enhanced"
              :style="{
                transform: `scale(${imgScale}) rotate(${imgRotation}deg)`,
                objectFit: imgFit === 'original' ? 'none' : imgFit === 'fit-width' ? 'contain' : imgFit === 'fit-height' ? 'cover' : 'contain',
              }"
              :alt="previewName"
            />
          </div>
          <!-- 画廊导航 -->
          <div class="gallery-controls" v-if="galleryImages.length > 1">
            <button class="gallery-nav gallery-prev" @click="galleryPrev">
              <el-icon><ArrowLeft /></el-icon>
            </button>
            <span class="gallery-counter">{{ galleryIndex + 1 }} / {{ galleryImages.length }}</span>
            <button class="gallery-nav gallery-next" @click="galleryNext">
              <el-icon><ArrowRight /></el-icon>
            </button>
          </div>
          <!-- 图片工具栏 -->
          <div class="image-toolbar">
            <div class="toolbar-section">
              <el-button-group size="small">
                <el-button @click="zoomOut" title="缩小 (−)">
                  <el-icon><ZoomOut /></el-icon>
                </el-button>
                <el-button @click="resetZoom" title="重置 (0)">
                  <el-icon><Refresh /></el-icon>
                </el-button>
                <el-button @click="zoomIn" title="放大 (+)">
                  <el-icon><ZoomIn /></el-icon>
                </el-button>
              </el-button-group>
              <span class="zoom-label">{{ Math.round(imgScale * 100) }}%</span>
            </div>
            <div class="toolbar-section">
              <el-button-group size="small">
                <el-button @click="rotateLeft" title="左转">
                  <el-icon><RefreshLeft /></el-icon>
                </el-button>
                <el-button @click="rotateRight" title="右转">
                  <el-icon><RefreshRight /></el-icon>
                </el-button>
              </el-button-group>
            </div>
            <div class="toolbar-section">
              <el-radio-group v-model="imgFit" size="small">
                <el-radio-button value="original">原始</el-radio-button>
                <el-radio-button value="fit-width">适应宽</el-radio-button>
                <el-radio-button value="fit-height">适应高</el-radio-button>
                <el-radio-button value="fullscreen">全屏</el-radio-button>
              </el-radio-group>
            </div>
            <div class="toolbar-section">
              <el-button size="small" @click="toggleFullscreen" :type="isFullscreen ? 'primary' : 'default'">
                <el-icon><FullScreen /></el-icon>&nbsp;{{ isFullscreen ? '退出全屏' : '全屏' }}
              </el-button>
            </div>
          </div>
          <!-- 图片信息 -->
          <div class="image-info" v-if="imgInfo">
            <span class="info-badge">{{ imgInfo.width }} × {{ imgInfo.height }} px</span>
            <span class="info-badge">{{ imgInfo.type }}</span>
            <span v-if="previewSize" class="info-badge">{{ fmtSize(previewSize) }}</span>
          </div>
        </template>
        <!-- PDF 预览 -->
        <iframe
          v-else-if="previewKind === 'pdf' && previewUrl"
          :src="previewUrl"
          class="preview-pdf"
          width="100%"
          height="65vh"
        ></iframe>
        <!-- 代码预览 -->
        <pre v-else-if="previewKind === 'code' && previewUrl" class="preview-code">
          <code>{{ previewCode }}</code>
        </pre>
        <!-- 视频预览 -->
        <video
          v-else-if="previewKind === 'video' && previewUrl"
          :src="previewUrl"
          class="preview-media"
          controls
          preload="auto"
        ></video>
        <!-- 音频预览 -->
        <div v-else-if="previewKind === 'audio' && previewUrl" class="audio-box">
          <el-icon class="audio-icon"><Headset /></el-icon>
          <audio :src="previewUrl" class="preview-media" controls></audio>
        </div>
        <!-- 底部操作栏 -->
        <div v-if="!previewLoading && previewUrl" class="preview-actions">
          <el-button size="small" type="primary" @click="download(propsTarget || { path: previewName })">
            <el-icon><Download /></el-icon>&nbsp;下载
          </el-button>
          <el-button size="small" v-if="previewKind === 'image'" @click="openInNewTab">
            <el-icon><Top /></el-icon>&nbsp;新窗口打开
          </el-button>
        </div>
      </div>
    </el-dialog>

    <!-- 压缩包预览 -->
    <el-dialog v-model="archiveDialog" :title="`压缩包内容：${archiveName}`" width="640px">
      <div v-loading="archiveLoading">
        <el-table :data="archiveEntries" max-height="400">
          <el-table-column label="文件名" min-width="200" prop="name" />
          <el-table-column label="大小" width="100">
            <template #default="{ row }">{{ row.isDir ? '-' : fmtSize(row.size) }}</template>
          </el-table-column>
          <el-table-column label="类型" width="80">
            <template #default="{ row }">{{ row.isDir ? '文件夹' : '文件' }}</template>
          </el-table-column>
        </el-table>
        <div v-if="!archiveLoading && !archiveEntries.length" class="empty">无法读取压缩包内容</div>
      </div>
    </el-dialog>

    <input ref="fileInput" type="file" multiple class="file-picker" @change="onPick" />
  </div>
</template>

<style scoped>
.files-glass {
  border-radius: 20px;
  padding: 18px;
  min-height: calc(100vh - 100px);
}
.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
  flex-wrap: wrap;
}
.storage-select {
  width: 200px;
}
.spacer {
  flex: 1;
}
.crumbs {
  flex: 1;
  min-width: 120px;
}
.crumb {
  color: var(--accent);
  cursor: pointer;
}
.crumb:hover {
  filter: brightness(1.1);
}

/* 视图切换 */
.view-toggle {
  display: inline-flex;
  gap: 2px;
  padding: 3px;
  border-radius: 12px;
}
.vt-btn {
  width: 32px;
  height: 30px;
  display: grid;
  place-items: center;
  border: none;
  background: transparent;
  border-radius: 9px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}
.vt-btn:hover {
  color: var(--text);
}
.vt-btn.active {
  background: var(--accent-soft);
  color: var(--accent);
}

/* 排序控件 */
.sort-select {
  width: 110px;
}
.sort-order-btn {
  width: 32px;
  height: 30px;
  display: inline-grid;
  place-items: center;
  border: none;
  border-radius: 10px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}
.sort-order-btn:hover {
  color: var(--text);
  background: var(--accent-soft);
}

/* 图片预览 */
.preview-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  min-height: 200px;
}
.preview-img {
  max-width: 100%;
  max-height: 65vh;
  border-radius: 12px;
  box-shadow: var(--shadow-hover);
}
.preview-media {
  width: 100%;
  max-height: 65vh;
  border-radius: 12px;
  box-shadow: var(--shadow-hover);
  background: #000;
}
.audio-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  padding: 30px 20px;
  width: 100%;
}
.audio-icon {
  font-size: 72px;
  color: var(--accent);
  opacity: 0.85;
}
.audio-box .preview-media {
  width: 100%;
  max-width: 560px;
  max-height: none;
  background: transparent;
  box-shadow: none;
}
.preview-meta {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: var(--text-secondary);
}

/* 图片预览增强 */
.image-preview-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 65vh;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 12px;
  cursor: crosshair;
}
.preview-img-enhanced {
  transition: transform 0.2s ease;
  border-radius: 4px;
  box-shadow: var(--shadow-hover);
  user-select: none;
}
.gallery-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
}
.gallery-counter {
  font-size: 14px;
  color: var(--text-secondary);
  min-width: 60px;
  text-align: center;
}
.gallery-nav {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: var(--accent-soft);
  color: var(--accent);
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: all 0.2s;
}
.gallery-nav:hover {
  background: var(--accent);
  color: #fff;
}
.image-toolbar {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
  padding: 8px 0;
}
.toolbar-section {
  display: flex;
  align-items: center;
  gap: 8px;
}
.zoom-label {
  font-size: 13px;
  color: var(--text-secondary);
  min-width: 48px;
  text-align: center;
}
.image-info {
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}
.info-badge {
  padding: 4px 10px;
  background: var(--accent-soft);
  border-radius: 8px;
  font-size: 12px;
  color: var(--text-secondary);
}
.preview-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  padding-top: 8px;
}

/* 网格视图 */
.file-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 14px;
}
.file-card {
  border-radius: 18px;
  padding: 18px 14px;
  cursor: pointer;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.fc-icon {
  height: 56px;
  display: grid;
  place-items: center;
}
.fc-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.fc-meta {
  font-size: 12px;
  color: var(--text-secondary);
}
.fc-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 6px;
  opacity: 0;
  transition: opacity 0.2s;
}
.file-card:hover .fc-actions {
  opacity: 1;
}
.row-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.more-btn {
  padding: 4px;
}
.empty {
  grid-column: 1 / -1;
  text-align: center;
  padding: 60px 0;
  color: var(--text-secondary);
  font-size: 14px;
}

/* 列表视图 */
.file-table {
  width: 100%;
  --el-table-bg-color: transparent;
  --el-table-tr-bg-color: transparent;
  --el-table-header-bg-color: transparent;
}
.file-table :deep(.el-table) {
  background: transparent;
}
.file-table :deep(.el-table__header) {
  background: transparent;
}
.f-icon {
  margin-right: 6px;
  vertical-align: -2px;
}
.f-name {
  vertical-align: -2px;
  cursor: pointer;
  color: var(--text);
}
.f-name.dir {
  color: var(--accent);
  font-weight: 500;
}
.form-tip {
  font-size: 12px;
  color: #909399;
  margin-bottom: 8px;
}
.search-bar {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}
.search-table {
  width: 100%;
}
.upload-item {
  margin-bottom: 14px;
}
.upload-name {
  font-size: 13px;
  color: var(--text);
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.upload-status {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
}

/* 隐藏但可点击的文件选择器（display:none 会导致 .click() 无法打开选择框） */
.file-picker {
  position: absolute;
  top: 0;
  left: 0;
  width: 1px;
  height: 1px;
  opacity: 0;
  overflow: hidden;
}

/* 图片画廊 */
.gallery-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}
.gallery-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.4);
  color: #fff;
  cursor: pointer;
  transition: background 0.2s;
  z-index: 10;
}
.gallery-nav:hover {
  background: rgba(0, 0, 0, 0.6);
}
.gallery-prev { left: 12px; }
.gallery-next { right: 12px; }
.gallery-counter {
  text-align: center;
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 8px;
}

/* PDF 预览 */
.preview-pdf {
  border: none;
  border-radius: 12px;
  box-shadow: var(--shadow-hover);
}

/* 代码预览 */
.preview-code {
  max-height: 65vh;
  overflow: auto;
  padding: 16px;
  border-radius: 12px;
  background: #1e1e1e;
  color: #d4d4d4;
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
}
.preview-code code {
  font-family: inherit;
}

/* 文件属性抽屉 */
.props-wrap {
  padding: 8px 0;
}
.props-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.props-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-radius: 10px;
  background: var(--accent-soft);
}
.props-label {
  font-size: 13px;
  color: var(--text-secondary);
}
.props-value {
  font-size: 13px;
  color: var(--text);
  font-weight: 500;
  text-align: right;
  max-width: 200px;
  word-break: break-all;
}

/* 搜索高级过滤 */
.search-filters {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

/* 照片视图 */
.photo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 14px;
  padding: 8px 0;
}
.photo-card {
  position: relative;
  border-radius: 14px;
  overflow: hidden;
  cursor: pointer;
  background: var(--accent-soft);
  box-shadow: var(--shadow);
  transition: transform 0.2s, box-shadow 0.2s;
}
.photo-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-hover);
}
.photo-card img {
  width: 100%;
  height: 160px;
  object-fit: cover;
  display: block;
}
.photo-name {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 6px 10px;
  font-size: 12px;
  color: #fff;
  background: linear-gradient(transparent, rgba(0,0,0,0.6));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
