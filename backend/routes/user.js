const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { getDb } = require('../config/database');
const { generateToken, authMiddleware } = require('../middleware/auth');

const AVATAR_STYLES = [
  '🍵', '🌸', '🌙', '🌊', '🎋', '🏔️', '🌿', '🎑', '☁️', '🌺',
  '🦋', '🍃', '🌅', '🎐', '🪷', '🌻', '🐚', '🌈', '🕊️', '🌾',
];

/**
 * POST /register - 用户注册
 */
router.post('/register', (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: '请输入用户名和密码' });
    }

    if (username.length < 2 || username.length > 20) {
      return res.status(400).json({ success: false, message: '用户名长度需在2-20个字符之间' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: '密码长度不能少于6位' });
    }

    const db = getDb();

    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) {
      return res.status(409).json({ success: false, message: '用户名已存在' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const avatar = AVATAR_STYLES[Math.floor(Math.random() * AVATAR_STYLES.length)];

    const result = db.prepare(
      'INSERT INTO users (username, password, avatar) VALUES (?, ?, ?)'
    ).run(username, hashedPassword, avatar);

    const token = generateToken({ id: result.lastInsertRowid, username });

    res.status(201).json({
      success: true,
      message: '注册成功，欢迎来到茶海心遇',
      data: {
        token,
        user: {
          id: result.lastInsertRowid,
          username,
          avatar,
        },
      },
    });
  } catch (err) {
    console.error('[注册] 错误:', err);
    res.status(500).json({ success: false, message: '注册失败，请稍后重试' });
  }
});

/**
 * POST /login - 用户登录
 */
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: '请输入用户名和密码' });
    }

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

    if (!user) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }

    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }

    const token = generateToken({ id: user.id, username: user.username });

    res.json({
      success: true,
      message: '登录成功',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          avatar: user.avatar,
          created_at: user.created_at,
        },
      },
    });
  } catch (err) {
    console.error('[登录] 错误:', err);
    res.status(500).json({ success: false, message: '登录失败，请稍后重试' });
  }
});

/**
 * GET /profile - 获取用户资料（需登录）
 */
router.get('/profile', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const user = db.prepare('SELECT id, username, avatar, created_at FROM users WHERE id = ?').get(req.user.id);

    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    const stats = db.prepare(`
      SELECT
        COUNT(*) as totalEmotions,
        COUNT(DISTINCT emotion) as emotionTypes,
        COUNT(DISTINCT date(created_at)) as activeDays
      FROM emotions
      WHERE user_id = ?
    `).get(req.user.id);

    const resonanceCount = db.prepare(
      'SELECT COUNT(*) as count FROM resonances WHERE from_user_id = ? OR to_user_id = ?'
    ).get(req.user.id, req.user.id);

    res.json({
      success: true,
      data: {
        user,
        stats: {
          totalEmotions: stats.totalEmotions,
          emotionTypes: stats.emotionTypes,
          activeDays: stats.activeDays,
          resonances: resonanceCount.count,
        },
      },
    });
  } catch (err) {
    console.error('[用户资料] 错误:', err);
    res.status(500).json({ success: false, message: '获取用户资料失败' });
  }
});

/**
 * GET /history - 获取用户情绪历史（需登录，支持分页）
 */
router.get('/history', authMiddleware, (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const emotionFilter = req.query.emotion || '';

    const db = getDb();

    let query = 'SELECT * FROM emotions WHERE user_id = ?';
    let countQuery = 'SELECT COUNT(*) as count FROM emotions WHERE user_id = ?';
    const params = [req.user.id];
    const countParams = [req.user.id];

    if (emotionFilter) {
      query += ' AND emotion = ?';
      countQuery += ' AND emotion = ?';
      params.push(emotionFilter);
      countParams.push(emotionFilter);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const emotions = db.prepare(query).all(...params);
    const total = db.prepare(countQuery).get(...countParams);

    res.json({
      success: true,
      data: {
        emotions,
        pagination: {
          page,
          limit,
          total: total.count,
          totalPages: Math.ceil(total.count / limit),
        },
      },
    });
  } catch (err) {
    console.error('[历史记录] 错误:', err);
    res.status(500).json({ success: false, message: '获取历史记录失败' });
  }
});

module.exports = router;
