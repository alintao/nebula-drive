/** 同步服务端 API 客户端（基于 /sync/* 令牌端点） */
export class SyncClient {
  constructor(
    public url: string,
    public token: string,
  ) {}

  private get base(): string {
    return `${this.url.replace(/\/+$/, '')}/api/v1`;
  }

  private async req(path: string, init: RequestInit = {}): Promise<Response> {
    const r = await fetch(`${this.base}${path}`, init);
    if (!r.ok && r.status !== 204) {
      let msg = `HTTP ${r.status}`;
      try {
        const j = (await r.json()) as { error?: string };
        if (j.error) msg = j.error;
      } catch {
        /* ignore */
      }
      throw new Error(msg);
    }
    return r;
  }

  /** 远端清单：relPath（无前导斜杠）-> {size, mtime(ms)} */
  async manifest(): Promise<Map<string, { size: number; mtime: number }>> {
    const r = await this.req(`/sync/manifest?token=${encodeURIComponent(this.token)}`);
    const j = (await r.json()) as { data: { files: Array<{ relPath: string; size: number; mtime: number }> } };
    const m = new Map<string, { size: number; mtime: number }>();
    for (const f of j.data.files) {
      m.set(f.relPath.replace(/^\//, ''), { size: f.size, mtime: Math.floor(f.mtime) });
    }
    return m;
  }

  /** 回写本地清单（供服务端记录 hash） */
  async report(files: Array<{ relPath: string; hash: string; size: number; mtime: number }>): Promise<void> {
    const payload = files.map((f) => ({ ...f, relPath: f.relPath.startsWith('/') ? f.relPath : `/${f.relPath}` }));
    await this.req(`/sync/manifest/report?token=${encodeURIComponent(this.token)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files: payload }),
    });
  }

  /** 拉取远端文件为 Buffer */
  async pull(rel: string): Promise<Buffer> {
    const p = encodeURIComponent(`/${rel}`);
    const r = await this.req(`/sync/pull?token=${encodeURIComponent(this.token)}&path=${p}`, { method: 'POST' });
    return Buffer.from(await r.arrayBuffer());
  }

  /** 推送本地文件 */
  async push(rel: string, data: Buffer): Promise<void> {
    const p = encodeURIComponent(`/${rel}`);
    await this.req(`/sync/push?token=${encodeURIComponent(this.token)}&path=${p}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: data,
    });
  }

  /** 删除远端文件 */
  async remove(rel: string): Promise<void> {
    const p = encodeURIComponent(`/${rel}`);
    await this.req(`/sync/delete?token=${encodeURIComponent(this.token)}&path=${p}`, { method: 'POST' });
  }

  /** 校验令牌是否有效 */
  async ping(): Promise<void> {
    await this.manifest();
  }
}
