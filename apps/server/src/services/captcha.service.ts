import crypto from 'node:crypto';

/** 登录失败次数追踪（内存存储，进程重启后清零） */
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();

/** 验证码存储（内存存储，5 分钟过期） */
const captchaStore = new Map<string, { code: string; expires: number }>();

/** 生成验证码 ID */
export function generateCaptchaId(): string {
  return crypto.randomBytes(16).toString('hex');
}

/** 生成 4 位数字验证码 */
export function generateCaptchaCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

/** 创建验证码，返回 { id, code } */
export function createCaptcha(): { id: string; code: string } {
  const id = generateCaptchaId();
  const code = generateCaptchaCode();
  captchaStore.set(id, { code, expires: Date.now() + 5 * 60 * 1000 });
  return { id, code };
}

/** 验证验证码 */
export function verifyCaptcha(id: string, code: string): boolean {
  const entry = captchaStore.get(id);
  if (!entry) return false;
  if (Date.now() > entry.expires) {
    captchaStore.delete(id);
    return false;
  }
  if (entry.code !== code) return false;
  // 验证成功后删除（一次性使用）
  captchaStore.delete(id);
  return true;
}

/** 记录登录失败 */
export function recordLoginFailure(username: string): number {
  const key = username.toLowerCase();
  const entry = loginAttempts.get(key);
  const count = (entry?.count || 0) + 1;
  loginAttempts.set(key, { count, lastAttempt: Date.now() });
  return count;
}

/** 登录成功，清除失败记录 */
export function clearLoginFailures(username: string): void {
  loginAttempts.delete(username.toLowerCase());
}

/** 获取某用户的失败次数 */
export function getFailureCount(username: string): number {
  return loginAttempts.get(username.toLowerCase())?.count || 0;
}

/** 清理过期的验证码（定期调用） */
export function cleanupCaptchas(): void {
  const now = Date.now();
  for (const [id, entry] of captchaStore) {
    if (now > entry.expires) {
      captchaStore.delete(id);
    }
  }
}

/** 获取所有登录失败记录（用于管理界面） */
export function getAllFailures(): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [key, entry] of loginAttempts) {
    result[key] = entry.count;
  }
  return result;
}
