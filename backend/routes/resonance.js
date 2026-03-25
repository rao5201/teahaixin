const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { getDb } = require('../config/database');

/**
 * POST /find - 寻找情绪共鸣者
 * Body: { emotion, limit }
 */
router.post('/find', authMiddleware, (req, res) => {
  try {
    const { emotion, limit: reqLimit } = req.body;
    const limit = Math.min(20, Math.max(1, parseInt(reqLimit) || 10));

    if (!emotion) {
      return res.status(400).json({ success: false, message: '请指定情绪类型' });
    }

    const db = getDb();

    // 查找最近发表相同情绪的其他用户
    const matches = db.prepare(`
      SELECT DISTINCT
        u.id as user_id,
        u.username,
        u.avatar,
        e.id as emotion_id,
        e.text,
        e.emotion,
        e.poem_text,
        e.created_at
      FROM emotions e
      JOIN users u ON e.user_id = u.id
      WHERE e.emotion = ?
        AND e.is_public = 1
        AND e.user_id != ?
        AND e.created_at >= datetime('now', '-7 days', 'localtime')
      ORDER BY e.created_at DESC
      LIMIT ?
    `).all(emotion, req.user.id, limit);

    res.json({
      success: true,
      message: matches.length > 0 ? '找到了与你情绪共鸣的人' : '暂时没有找到共鸣者，再等等吧',
      data: {
        matches,
        emotion,
        total: matches.length,
      },
    });
  } catch (err) {
    console.error('[寻找共鸣] 错误:', err);
    res.status(500).json({ success: false, message: '寻找共鸣失败' });
  }
});

/**
 * POST /create - 创建共鸣连接
 * Body: { toUserId, emotionId }
 */
router.post('/create', authMiddleware, (req, res) => {
  try {
    const { toUserId, emotionId } = req.body;

    if (!toUserId || !emotionId) {
      return res.status(400).json({ success: false, message: '缺少必要参数' });
    }

    if (toUserId === req.user.id) {
      return res.status(400).json({ success: false, message: '不能与自己产生共鸣哦' });
    }

    const db = getDb();

    // 验证目标用户和情绪记录存在
    const targetUser = db.prepare('SELECT id, username FROM users WHERE id = ?').get(toUserId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: '目标用户不存在' });
    }

    const emotionRecord = db.prepare('SELECT id, emotion FROM emotions WHERE id = ? AND is_public = 1').get(emotionId);
    if (!emotionRecord) {
      return res.status(404).json({ success: false, message: '情绪记录不存在或非公开' });
    }

    // 检查是否已有共鸣
    const existing = db.prepare(
      'SELECT id FROM resonances WHERE from_user_id = ? AND to_user_id = ? AND emotion_id = ?'
    ).get(req.user.id, toUserId, emotionId);

    if (existing) {
      return res.status(409).json({ success: false, message: '你已经与这条情绪产生过共鸣了' });
    }

    const result = db.prepare(
      'INSERT INTO resonances (from_user_id, to_user_id, emotion_id) VALUES (?, ?, ?)'
    ).run(req.user.id, toUserId, emotionId);

    // 通过 Socket.IO 向目标用户发送实时通知
    const io = req.app.get('io');
    const onlineUsers = req.app.get('onlineUsers');
    const targetSocketId = onlineUsers.get(String(toUserId));

    if (targetSocketId) {
      io.to(targetSocketId).emit('resonance_notification', {
        id: result.lastInsertRowid,
        fromUser: {
          id: req.user.id,
          username: req.user.username,
        },
        emotionId,
        emotion: emotionRecord.emotion,
        message: `${req.user.username} 与你产生了情绪共鸣`,
        createdAt: new Date().toISOString(),
      });
    }

    res.status(201).json({
      success: true,
      message: '共鸣已建立，心意已传达',
      data: {
        id: result.lastInsertRowid,
        toUser: targetUser.username,
        emotion: emotionRecord.emotion,
      },
    });
  } catch (err) {
    console.error('[创建共鸣] 错误:', err);
    res.status(500).json({ success: false, message: '创建共鸣失败' });
  }
});

/**
 * GET /my - 获取我的共鸣列表
 * Query: type (sent | received | all), page, limit
 */
router.get('/my', authMiddleware, (req, res) => {
  try {
    const type = req.query.type || 'all';
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const db = getDb();

    let query = '';
    let countQuery = '';
    const params = [];
    const countParams = [];

    if (type === 'sent') {
      query = `
        SELECT r.*, u.username as to_username, u.avatar as to_avatar,
               e.text as emotion_text, e.emotion as emotion_type
        FROM resonances r
        JOIN users u ON r.to_user_id = u.id
        JOIN emotions e ON r.emotion_id = e.id
        WHERE r.from_user_id = ?
        ORDER BY r.created_at DESC
        LIMIT ? OFFSET ?
      `;
      countQuery = 'SELECT COUNT(*) as count FROM resonances WHERE from_user_id = ?';
      params.push(req.user.id, limit, offset);
      countParams.push(req.user.id);
    } else if (type === 'received') {
      query = `
        SELECT r.*, u.username as from_username, u.avatar as from_avatar,
               e.text as emotion_text, e.emotion as emotion_type
        FROM resonances r
        JOIN users u ON r.from_user_id = u.id
        JOIN emotions e ON r.emotion_id = e.id
        WHERE r.to_user_id = ?
        ORDER BY r.created_at DESC
        LIMIT ? OFFSET ?
      `;
      countQuery = 'SELECT COUNT(*) as count FROM resonances WHERE to_user_id = ?';
      params.push(req.user.id, limit, offset);
      countParams.push(req.user.id);
    } else {
      query = `
        SELECT r.*,
               fu.username as from_username, fu.avatar as from_avatar,
               tu.username as to_username, tu.avatar as to_avatar,
               e.text as emotion_text, e.emotion as emotion_type,
               CASE WHEN r.from_user_id = ? THEN 'sent' ELSE 'received' END as direction
        FROM resonances r
        JOIN users fu ON r.from_user_id = fu.id
        JOIN users tu ON r.to_user_id = tu.id
        JOIN emotions e ON r.emotion_id = e.id
        WHERE r.from_user_id = ? OR r.to_user_id = ?
        ORDER BY r.created_at DESC
        LIMIT ? OFFSET ?
      `;
      countQuery = 'SELECT COUNT(*) as count FROM resonances WHERE from_user_id = ? OR to_user_id = ?';
      params.push(req.user.id, req.user.id, req.user.id, limit, offset);
      countParams.push(req.user.id, req.user.id);
    }

    const resonances = db.prepare(query).all(...params);
    const total = db.prepare(countQuery).get(...countParams);

    res.json({
      success: true,
      data: {
        resonances,
        pagination: {
          page,
          limit,
          total: total.count,
          totalPages: Math.ceil(total.count / limit),
        },
      },
    });
  } catch (err) {
    console.error('[我的共鸣] 错误:', err);
    res.status(500).json({ success: false, message: '获取共鸣列表失败' });
  }
});

module.exports = router;
