import crypto from 'node:crypto';

const ALGO = 'scrypt';

export function hashPassword(password: string, salt?: string): string {
  const s = salt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, s, 64);
  return `${s}:${derived.toString('hex')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [s, hash] = stored.split(':');
  if (!s || !hash) return false;
  const derived = crypto.scryptSync(password, s, 64);
  const a = Buffer.from(hash, 'hex');
  const b = derived;
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
