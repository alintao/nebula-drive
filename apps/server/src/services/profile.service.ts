import { getDb } from '../db/index.js';

/**
 * 用户资料服务：头像 / 邮箱 / 简介 / 手机。
 */
export const profileService = {
  get(userId: number) {
    const db = getDb();
    const row = db.prepare('SELECT * FROM user_profiles WHERE user_id = ?').get(userId) as any;
    if (!row) return { user_id: userId, avatar: '', email: '', bio: '', phone: '' };
    return row;
  },

  update(userId: number, fields: { avatar?: string; email?: string; bio?: string; phone?: string }) {
    const db = getDb();
    const current = this.get(userId);
    const next = {
      avatar: fields.avatar ?? current.avatar,
      email: fields.email ?? current.email,
      bio: fields.bio ?? current.bio,
      phone: fields.phone ?? current.phone,
    };
    db.prepare(
      'INSERT INTO user_profiles (user_id, avatar, email, bio, phone, updated_at) VALUES (?, ?, ?, ?, ?, datetime(\'now\')) ' +
      'ON CONFLICT(user_id) DO UPDATE SET avatar = ?, email = ?, bio = ?, phone = ?, updated_at = datetime(\'now\')'
    ).run(userId, next.avatar, next.email, next.bio, next.phone, next.avatar, next.email, next.bio, next.phone);
    return this.get(userId);
  },
};
