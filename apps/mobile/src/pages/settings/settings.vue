<template>
  <view class="page">
    <view class="card">
      <view class="avatar">👤</view>
      <view class="uname">{{ user }}</view>
      <view class="muted">NebulaDrive 星云网盘</view>
    </view>

    <view class="card">
      <view class="row">
        <text>服务器地址</text>
        <text class="muted">{{ serverBase }}</text>
      </view>
      <view class="row">
        <text>版本</text>
        <text class="muted">v0.1.0</text>
      </view>
    </view>

    <view class="btn-primary logout" @click="onLogout">退出登录</view>
  </view>
</template>

<script lang="ts">
import { isLoggedIn } from '@/api';

export default {
  data() {
    return {
      user: uni.getStorageSync('nebula_user') || '',
      serverBase: uni.getStorageSync('nebula_base') || '',
    };
  },
  onShow() {
    if (!isLoggedIn()) {
      uni.reLaunch({ url: '/pages/login/login' });
      return;
    }
    this.user = uni.getStorageSync('nebula_user') || '';
    this.serverBase = uni.getStorageSync('nebula_base') || '';
  },
  methods: {
    onLogout() {
      uni.showModal({
        title: '退出登录',
        content: '确认退出？',
        success: (res) => {
          if (!res.confirm) return;
          uni.removeStorageSync('nebula_token');
          uni.removeStorageSync('nebula_user');
          uni.reLaunch({ url: '/pages/login/login' });
        },
      });
    },
  },
};
</script>

<style scoped>
.page {
  padding: 12px;
}
.avatar {
  font-size: 48px;
  text-align: center;
}
.uname {
  text-align: center;
  font-size: 16px;
  font-weight: 500;
  margin-top: 8px;
}
.logout {
  margin-top: 20px;
  background: #f56c6c;
}
</style>
