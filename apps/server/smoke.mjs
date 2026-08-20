// NebulaDrive 全链路冒烟测试（Node 20+，使用全局 fetch）
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const BASE = 'http://127.0.0.1:8080/api/v1';
const results = [];
let pass = 0, failN = 0;

function record(name, ok, extra = '') {
  results.push({ name, ok, extra });
  if (ok) pass++; else failN++;
  console.log((ok ? 'PASS' : 'FAIL') + '  ' + name + (extra ? '  | ' + extra : ''));
}

async function api(method, p, { token, body, headers = {}, raw = false } = {}) {
  const h = { ...headers };
  if (token) h['Authorization'] = 'Bearer ' + token;
  if (body && !raw) h['Content-Type'] = 'application/json';
  const res = await fetch(BASE + p, {
    method,
    headers: h,
    body: body === undefined ? undefined : (raw ? body : JSON.stringify(body)),
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* non-json */ }
  return { status: res.status, json, text };
}

// ---------- 1. health ----------
{
  const r = await fetch('http://127.0.0.1:8080/health');
  const j = await r.json();
  record('health', r.status === 200 && j.status === 'ok');
}

// ---------- 2. login ----------
let token = '';
{
  const r = await api('POST', '/auth/login', { body: { username: 'admin', password: 'admin123' } });
  token = r.json?.data?.token || '';
  record('auth/login', r.status === 200 && token.length > 20, 'token len=' + token.length);
}

// ---------- 3. auth/me ----------
{
  const r = await api('GET', '/auth/me', { token });
  record('auth/me', r.status === 200 && r.json?.data?.username === 'admin', JSON.stringify(r.json?.data?.username));
}

// ---------- 4. files/mkdir ----------
{
  const r = await api('POST', '/files/mkdir', { token, body: { storageId: 1, path: '/docs' } });
  record('files/mkdir /docs', r.status === 200 && r.json?.data?.ok === true);
}

// ---------- 5. 分片上传（raw octet-stream） ----------
const testContent = 'NebulaDrive smoke test content: ' + 'A'.repeat(12288) + 'END';
const testBuf = Buffer.from(testContent, 'utf8');
{
  const init = await api('POST', '/upload/init', {
    token,
    body: { storageId: 1, path: '/docs', name: 'smoke-chunked.txt', size: testBuf.length, chunkSize: 4096 },
  });
  const uid = init.json?.data?.uploadId;
  record('upload/init', init.status === 200 && !!uid, 'chunkSize=' + init.json?.data?.chunkSize);

  // 分 3 片上传（raw body）
  let allOk = true;
  const cs = 4096;
  for (let i = 0, off = 0; off < testBuf.length; i++, off += cs) {
    const slice = testBuf.subarray(off, Math.min(off + cs, testBuf.length));
    const r = await fetch(`${BASE}/upload/chunk?uploadId=${uid}&chunkIndex=${i}`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/octet-stream' },
      body: slice,
    });
    const j = await r.json().catch(() => null);
    if (r.status !== 200 || !j?.data?.ok) { allOk = false; console.log('   chunk', i, '->', r.status, j?.error || ''); break; }
  }
  record('upload/chunk x3 (raw)', allOk);

  const comp = await api('POST', '/upload/complete', { token, body: { uploadId: uid } });
  record('upload/complete', comp.status === 200 && comp.json?.data?.ok === true, comp.json?.error || '');
}

// ---------- 6. 直传（multipart FormData + Blob） ----------
{
  const fd = new FormData();
  fd.append('file', new Blob([testBuf], { type: 'application/octet-stream' }), 'smoke-direct.txt');
  fd.append('storageId', '1');
  fd.append('path', '/docs/');
  const res = await fetch(BASE + '/upload/direct', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token },
    body: fd,
  });
  const j = await res.json();
  record('upload/direct (multipart)', res.status === 200 && j?.data?.ok === true, JSON.stringify(j?.data?.path) + ' ' + (j?.error || ''));
}

// ---------- 7. 列表 + 下载校验 ----------
{
  const r = await api('GET', '/files?storageId=1&path=/docs', { token });
  const names = (r.json?.data?.entries || []).map((e) => e.name);
  record('files/list /docs', r.status === 200 && names.includes('smoke-chunked.txt') && names.includes('smoke-direct.txt'), JSON.stringify(names));

  const d = await fetch(`${BASE}/files/download?storageId=1&path=${encodeURIComponent('/docs/smoke-chunked.txt')}`, {
    headers: { Authorization: 'Bearer ' + token },
  });
  const buf = Buffer.from(await d.arrayBuffer());
  record('files/download 内容校验', d.status === 200 && buf.toString('utf8') === testContent, 'len=' + buf.length);
}

// ---------- 8. rename / copy / move / delete ----------
{
  let r = await api('POST', '/files/rename', { token, body: { storageId: 1, path: '/docs/smoke-direct.txt', newPath: '/docs/smoke-direct-renamed.txt' } });
  record('files/rename', r.status === 200 && r.json?.data?.ok === true, r.json?.error || '');

  r = await api('POST', '/files/copy', { token, body: { storageId: 1, path: '/docs/smoke-chunked.txt', destPath: '/docs/smoke-chunked-copy.txt' } });
  record('files/copy', r.status === 200 && r.json?.data?.ok === true, r.json?.error || '');

  r = await api('POST', '/files/move', { token, body: { storageId: 1, path: '/docs/smoke-chunked-copy.txt', destPath: '/docs/deep/smoke-chunked-copy.txt' } });
  record('files/move (自动建目录)', r.status === 200 && r.json?.data?.ok === true, r.json?.error || '');

  r = await api('POST', '/files/delete', { token, body: { storageId: 1, path: '/docs/deep/smoke-chunked-copy.txt' } });
  record('files/delete', r.status === 200 && r.json?.data?.ok === true, r.json?.error || '');
}

// ---------- 9. search ----------
{
  const r = await api('GET', '/search?q=' + encodeURIComponent('smoke-chunked'), { token });
  const names = (r.json?.data?.results || []).map((e) => e.entry?.name);
  record('search', r.status === 200 && names.some((n) => (n || '').includes('smoke-chunked')), JSON.stringify(names));
}

// ---------- 10. 回收站 ----------
{
  // 先把一个文件删进回收站
  await api('POST', '/files/delete', { token, body: { storageId: 1, path: '/docs/smoke-direct-renamed.txt' } });
  const r = await api('GET', '/recycle', { token });
  const items = r.json?.data?.items || [];
  const target = items.find((i) => (i.path || i.name || '').includes('smoke-direct-renamed'));
  record('recycle/list', r.status === 200 && !!target, JSON.stringify(items.map((i) => i.path || i.name)));
  if (target) {
    const st = await api('POST', '/recycle/restore', { token, body: { id: target.id } });
    record('recycle/restore', st.status === 200 && st.json?.data?.ok === true, st.json?.error || '');
  } else {
    record('recycle/restore', false, 'no target');
  }
}

// ---------- 11. 分享 ----------
let shareToken = '';
{
  const r = await api('POST', '/shares', { token, body: { storageId: 1, path: '/docs/smoke-chunked.txt', name: '冒烟分享', password: 'abc123' } });
  shareToken = r.json?.data?.share?.token || '';
  record('shares/create', r.status === 200 && !!shareToken, 'url=' + (r.json?.data?.url || ''));

  const pub = await api('GET', '/s/' + shareToken);
  record('share/public info', pub.status === 200 && pub.json?.data?.share?.hasPassword === true);

  const bad = await api('POST', '/s/' + shareToken + '/extract', { body: { password: 'wrong' } });
  record('share/extract 错误密码', bad.status === 403);

  const ex = await api('POST', '/s/' + shareToken + '/extract', { body: { password: 'abc123' } });
  const ticket = ex.json?.data?.ticket;
  record('share/extract 正确密码', ex.status === 200 && !!ticket);

  const fl = await api('GET', '/s/' + shareToken + '/files?ticket=' + ticket, {});
  record('share/files', fl.status === 200, JSON.stringify(fl.json?.data?.entries?.map((e) => e.name) || fl.json?.error));

  const dl = await fetch(`${BASE}/s/${shareToken}/download?ticket=${ticket}&path=${encodeURIComponent('/docs/smoke-chunked.txt')}`);
  const buf = Buffer.from(await dl.arrayBuffer());
  record('share/download', dl.status === 200 && buf.toString('utf8') === testContent, 'len=' + buf.length);

  const del = await api('DELETE', '/shares/' + (r.json?.data?.share?.id), { token });
  record('shares/delete', del.status === 200 && del.json?.data?.ok === true);
}

// ---------- 12. 存储 CRUD ----------
{
  const tmpRoot = path.join(process.cwd(), 'storage', 'smoke-second');
  fs.mkdirSync(tmpRoot, { recursive: true });
  const r = await api('POST', '/storages', { token, body: { name: '冒烟第二存储', type: 'local', config: { root: tmpRoot } } });
  const id = r.json?.data?.id;
  record('storages/create', r.status === 200 && !!id, 'id=' + id);

  const t = await api('POST', '/storages/' + id + '/test', { token });
  record('storages/test', t.status === 200 && t.json?.data?.ok === true, JSON.stringify(t.json?.data));

  const tg1 = await api('POST', '/storages/' + id + '/toggle', { token });
  record('storages/toggle off', tg1.status === 200 && tg1.json?.data?.enabled === false);
  const tg2 = await api('POST', '/storages/' + id + '/toggle', { token });
  record('storages/toggle on', tg2.status === 200 && tg2.json?.data?.enabled === true);

  const up = await api('PUT', '/storages/' + id, { token, body: { name: '冒烟第二存储-改', sort: 5 } });
  record('storages/update', up.status === 200 && up.json?.data?.ok === true);

  const del = await api('DELETE', '/storages/' + id, { token });
  record('storages/delete', del.status === 200 && del.json?.data?.ok === true);
  fs.rmSync(tmpRoot, { recursive: true, force: true });
}

// ---------- 13. 同步对 ----------
{
  const r = await api('POST', '/sync/pairs', { token, body: { storageId: 1, remotePath: '/sync', mode: 'two-way' } });
  const pair = r.json?.data?.pair;
  record('sync/pairs create', r.status === 200 && !!pair?.token, 'token len=' + (pair?.token?.length || 0));
  const st = pair?.token || '';

  // push（raw body）
  const pushBuf = Buffer.from('sync push payload 1234567890');
  const pr = await fetch(`${BASE}/sync/push?token=${st}&path=${encodeURIComponent('/hello-sync.txt')}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: pushBuf,
  });
  const pj = await pr.json();
  record('sync/push', pr.status === 200 && pj?.data?.ok === true, pj?.error || '');

  // manifest
  const m = await api('GET', '/sync/manifest?token=' + st);
  const files = m.json?.data?.files || [];
  record('sync/manifest', m.status === 200 && files.some((f) => f.relPath === '/hello-sync.txt'), JSON.stringify(files));

  // report
  const rep = await api('POST', '/sync/manifest/report?token=' + st, { body: { files: [{ relPath: '/hello-sync.txt', hash: 'abc', size: pushBuf.length, mtime: Date.now() }] } });
  record('sync/manifest/report', rep.status === 200 && rep.json?.data?.ok === true);

  // pull
  const pl = await fetch(`${BASE}/sync/pull?token=${st}&path=${encodeURIComponent('/hello-sync.txt')}`, { method: 'POST' });
  const pbuf = Buffer.from(await pl.arrayBuffer());
  record('sync/pull', pl.status === 200 && pbuf.toString() === pushBuf.toString(), 'len=' + pbuf.length);

  // delete
  const sd = await api('POST', '/sync/delete?token=' + st + '&path=' + encodeURIComponent('/hello-sync.txt'));
  record('sync/delete', sd.status === 200 && sd.json?.data?.ok === true, sd.json?.error || '');

  const bad = await api('GET', '/sync/manifest?token=badtoken123');
  record('sync 无效令牌', bad.status === 401);

  const d = await api('DELETE', '/sync/pairs/' + pair.id, { token });
  record('sync/pairs delete', d.status === 200 && d.json?.data?.ok === true);
}

// ---------- 14. 用户管理 ----------
{
  const r = await api('GET', '/users', { token });
  record('users/list', r.status === 200 && (r.json?.data?.users || []).length >= 1);

  const c = await api('POST', '/users', { token, body: { username: 'smokeuser', password: 'smoke12345', role: 'user', displayName: '冒烟用户', quota: 1048576 } });
  const uid = c.json?.data?.user?.id;
  record('users/create', c.status === 200 && !!uid, JSON.stringify(c.json?.data?.user?.username));

  const rp = await api('POST', '/users/' + uid + '/reset-password', { token });
  record('users/reset-password', rp.status === 200 && (rp.json?.data?.password || '').length >= 8);

  const up = await api('PUT', '/users/' + uid, { token, body: { status: 'disabled' } });
  record('users/disable', up.status === 200 && up.json?.data?.user?.status === 'disabled');

  const d = await api('DELETE', '/users/' + uid, { token });
  record('users/delete', d.status === 200 && d.json?.data?.ok === true);
}

// ---------- 15. 设置 ----------
{
  const g = await api('GET', '/settings');
  record('settings/get (公开)', g.status === 200 && !!g.json?.data, JSON.stringify(Object.keys(g.json?.data || {})));

  const p = await api('PUT', '/settings', { token, body: { appName: 'NebulaDrive 星云网盘' } });
  record('settings/put', p.status === 200 && !!p.json?.data?.settings);
}

// ---------- 16. 日志 ----------
{
  const r1 = await api('GET', '/logs?page=1&size=10', { token });
  record('logs/ops', r1.status === 200 && Array.isArray(r1.json?.data?.items || r1.json?.data?.logs || []), JSON.stringify(Object.keys(r1.json?.data || {})));
  const r2 = await api('GET', '/logs?type=login', { token });
  record('logs/login', r2.status === 200);
}

// ---------- 17. 统计 ----------
{
  const r = await api('GET', '/stats', { token });
  record('stats', r.status === 200 && r.json?.data?.users >= 1 && r.json?.data?.storages >= 1, JSON.stringify(r.json?.data));
}

// ---------- 18. 无 token 应 401 ----------
{
  const r = await api('GET', '/files?storageId=1&path=/', {});
  record('无 token 401', r.status === 401);
}

// ---------- 汇总 ----------
console.log('\n================ 冒烟测试汇总 ================');
console.log(`通过: ${pass}  失败: ${failN}  总计: ${pass + failN}`);
if (failN > 0) {
  console.log('失败项:');
  for (const r of results.filter((x) => !x.ok)) console.log('  - ' + r.name + ' ' + r.extra);
  process.exitCode = 1;
}
