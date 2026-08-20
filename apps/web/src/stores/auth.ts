import { defineStore } from 'pinia';
import { api } from '../api';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('nebula_token') || '',
    user: null as null | { id: number; username: string; role: string; displayName: string; permissions?: string[] },
  }),
  getters: {
    /** 当前用户是否拥有某权限点 */
    hasPerm: (state) => (key: string) => {
      const perms = state.user?.permissions;
      if (!perms) return false;
      return perms.includes(key);
    },
  },
  actions: {
    async login(username: string, password: string) {
      const r = await api('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
      this.token = r.token;
      this.user = r.user;
      localStorage.setItem('nebula_token', r.token);
    },
    async me() {
      if (!this.token) return null;
      try {
        this.user = await api('/auth/me');
        return this.user;
      } catch {
        this.token = '';
        this.user = null;
        localStorage.removeItem('nebula_token');
        return null;
      }
    },
    logout() {
      this.token = '';
      this.user = null;
      localStorage.removeItem('nebula_token');
    },
  },
});
