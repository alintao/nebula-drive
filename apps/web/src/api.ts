const BASE = '/api/v1';

export async function api<T = any>(path: string, init: RequestInit & { raw?: boolean } = {}): Promise<T> {
  const token = localStorage.getItem('nebula_token');
  const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  // 仅当 body 为字符串且未显式指定 Content-Type 时补 JSON 头（FormData 需保留自动 boundary）
  if (typeof init.body === 'string' && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(BASE + path, { ...init, headers });
  if (res.status === 401 && !path.includes('/auth/login')) {
    localStorage.removeItem('nebula_token');
    window.location.href = '/login';
    throw new Error('未登录');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `请求失败 (${res.status})`);
  return data.data as T;
}

export function downloadUrl(path: string, params: Record<string, string> = {}) {
  const q = new URLSearchParams(params);
  const token = localStorage.getItem('nebula_token') || '';
  return `${BASE}${path}?${q.toString()}&token=${token}`;
}

export function fmtSize(n: number): string {
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  if (n < 1024 * 1024 * 1024) return (n / 1024 / 1024).toFixed(1) + ' MB';
  return (n / 1024 / 1024 / 1024).toFixed(2) + ' GB';
}

export function fmtTime(t: string | number | null): string {
  if (!t) return '-';
  const d = typeof t === 'number' ? new Date(t) : new Date(String(t).replace(' ', 'T') + (String(t).includes('Z') ? '' : 'Z'));
  if (isNaN(d.getTime())) return String(t);
  return d.toLocaleString('zh-CN', { hour12: false });
}
