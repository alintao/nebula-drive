<template>
  <view class="page">
    <!-- 密码门 -->
    <view v-if="needPassword" class="card pwd-card">
      <view class="pwd-title">🔒 该分享需要提取密码</view>
      <input class="input" v-model="pwd" placeholder="输入提取密码" />
      <view class="btn-primary" @click="doExtract">进入</view>
      <view class="error" v-if="err">{{ err }}</view>
    </view>

    <!-- 文件列表 -->
    <view v-else>
      <view class="share-head">
        <view class="share-name">{{ info.name || '分享文件' }}</view>
        <view class="muted" v-if="info.expiresAt">到期：{{ info.expiresAt }}</view>
      </view>

      <view class="breadcrumb" v-if="currentPath !== '/'">
        <text class="crumb" @click="currentPath = '/'; loadList()">/</text>
        <text v-for="(seg, i) in pathSegs" :key="i" class="crumb" @click="goSeg(i)">/{{ seg }}</text>
      </view>

      <view class="list">
        <view v-if="loading" class="muted center">加载中…</view>
        <view v-else-if="entries.length === 0" class="muted center">空目录</view>
        <view v-for="e in entries" :key="e.path" class="file-row" @click="onTap(e)">
          <view class="icon">{{ e.isDir ? '📁' : '📄' }}</view>
          <view class="file-info">
            <view class="file-name">{{ e.name }}</view>
            <view class="muted">{{ e.isDir ? '目录' : fmtSize(e.size) }}</view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script lang="ts">
import { publicInfo, publicExtract, publicList, publicDownloadUrl } from '@/api';

export default {
  data() {
    return {
      token: '',
      info: null as any,
      needPassword: false,
      pwd: '',
      ticket: '',
      currentPath: '/',
      entries: [] as any[],
      loading: false,
      err: '',
    };
  },
  computed: {
    pathSegs() {
      return this.currentPath.split('/').filter((s) => s !== '');
    },
  },
  onLoad(options: any) {
    this.token = options.token || '';
    if (!this.token) {
      this.err = '缺少分享 token';
      return;
    }
    this.bootstrap();
  },
  methods: {
    async bootstrap() {
      this.loading = true;
      this.err = '';
      try {
        const info = await publicInfo(this.token);
        this.info = info;
        if (info.hasPassword) {
          this.needPassword = true;
        } else {
          await this.loadList();
        }
      } catch (e: any) {
        this.err = e.message;
      } finally {
        this.loading = false;
      }
    },
    async doExtract() {
      this.err = '';
      try {
        const r = await publicExtract(this.token, this.pwd);
        this.ticket = r.ticket || '';
        this.needPassword = false;
        await this.loadList();
      } catch (e: any) {
        this.err = e.message;
      }
    },
    async loadList() {
      this.loading = true;
      try {
        const r = await publicList(this.token, this.currentPath, this.ticket);
        this.entries = r.entries || [];
      } catch (e: any) {
        this.err = e.message;
      } finally {
        this.loading = false;
      }
    },
    goSeg(i: number) {
      const segs = this.pathSegs.slice(0, i + 1);
      this.currentPath = '/' + segs.join('/') + '/';
      this.loadList();
    },
    onTap(e: any) {
      if (e.isDir) {
        this.currentPath = e.path.endsWith('/') ? e.path : e.path + '/';
        this.loadList();
      } else {
        this.onDownload(e);
      }
    },
    onDownload(e: any) {
      const url = publicDownloadUrl(this.token, e.path, this.ticket);
      uni.showLoading({ title: '准备下载' });
      uni.downloadFile({
        url,
        success: (r) => {
          uni.hideLoading();
          uni.saveFile({
            filePath: r.tempFilePath,
            success: () => uni.showToast({ title: '已保存', icon: 'success' }),
            fail: () => uni.showToast({ title: '保存失败', icon: 'none' }),
          });
        },
        fail: (err) => {
          uni.hideLoading();
          uni.showToast({ title: err.errMsg || '下载失败', icon: 'none' });
        },
      });
    },
    fmtSize(n: number) {
      if (n < 1024) return n + ' B';
      if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
      if (n < 1024 * 1024 * 1024) return (n / 1024 / 1024).toFixed(1) + ' MB';
      return (n / 1024 / 1024 / 1024).toFixed(2) + ' GB';
    },
  },
};
</script>

<style scoped>
.page {
  padding: 12px;
}
.pwd-card {
  text-align: center;
  padding: 30px 20px;
}
.pwd-title {
  font-size: 16px;
  margin-bottom: 16px;
}
.share-head {
  margin-bottom: 12px;
}
.share-name {
  font-size: 18px;
  font-weight: bold;
}
.breadcrumb {
  font-size: 12px;
  color: #606266;
  margin-bottom: 8px;
}
.crumb {
  margin-right: 4px;
  color: #3b82f6;
}
.file-row {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 8px;
}
.icon {
  font-size: 28px;
  margin-right: 12px;
}
.file-info {
  flex: 1;
}
.file-name {
  font-size: 14px;
  font-weight: 500;
}
.center {
  text-align: center;
  padding: 30px;
}
</style>
