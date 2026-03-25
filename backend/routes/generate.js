const express = require('express');
const router = express.Router();
const freeAI = require('../services/freeAI');
const { authMiddleware } = require('../middleware/auth');
const { getDb } = require('../config/database');

/**
 * POST / - 公开生成（无需登录）
 * Body: { text: string }
 */
router.post('/', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ success: false, message: '请输入您的心情文字' });
    }

    if (text.length > 1000) {
      return res.status(400).json({ success: false, message: '文字内容不能超过1000字' });
    }

    const result = await freeAI.generateCompleteResponse(text.trim());

    res.json({
      success: true,
      message: '生成成功',
      data: result,
    });
  } catch (err) {
    console.error('[生成] 错误:', err);
    res.status(500).json({ success: false, message: '生成失败，请稍后重试' });
  }
});

/**
 * POST /save - 保存生成结果（需登录）
 * Body: { text, emotion, image_url, audio_url, poem_text, location, latitude, longitude, is_public }
 */
router.post('/save', authMiddleware, (req, res) => {
  try {
    const {
      text,
      emotion,
      image_url = '',
      audio_url = '',
      poem_text = '',
      location = '',
      latitude = 0,
      longitude = 0,
      is_public = 1,
    } = req.body;

    if (!text || !emotion) {
      return res.status(400).json({ success: false, message: '缺少必要参数' });
    }

    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO emotions (user_id, text, emotion, image_url, audio_url, poem_text, location, latitude, longitude, is_public)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      req.user.id,
      text.trim(),
      emotion,
      image_url,
      audio_url,
      poem_text,
      location,
      latitude,
      longitude,
      is_public ? 1 : 0
    );

    res.json({
      success: true,
      message: '情绪记录已保存',
      data: { id: result.lastInsertRowid },
    });
  } catch (err) {
    console.error('[保存] 错误:', err);
    res.status(500).json({ success: false, message: '保存失败，请稍后重试' });
  }
});

/**
 * GET /emotions - 获取公开情绪列表
 * Query: page, limit
 */
router.get('/emotions', (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const db = getDb();

    const emotions = db.prepare(`
      SELECT e.*, u.username, u.avatar
      FROM emotions e
      LEFT JOIN users u ON e.user_id = u.id
      WHERE e.is_public = 1
      ORDER BY e.created_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);

    const total = db.prepare('SELECT COUNT(*) as count FROM emotions WHERE is_public = 1').get();

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
    console.error('[情绪列表] 错误:', err);
    res.status(500).json({ success: false, message: '获取情绪列表失败' });
  }
});

module.exports = router;
