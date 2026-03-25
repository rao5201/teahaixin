const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { getDb } = require('../config/database');

/**
 * GET /nearby - 获取附近的情绪记录
 * Query: latitude, longitude, radius (km, default 5)
 */
router.get('/nearby', authMiddleware, (req, res) => {
  try {
    const latitude = parseFloat(req.query.latitude);
    const longitude = parseFloat(req.query.longitude);
    const radius = Math.min(50, Math.max(0.1, parseFloat(req.query.radius) || 5));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ success: false, message: '请提供有效的经纬度' });
    }

    // 使用简化的距离计算（Haversine 近似）
    // 1度纬度 ≈ 111km，1度经度 ≈ 111km * cos(latitude)
    const latRange = radius / 111.0;
    const lngRange = radius / (111.0 * Math.cos((latitude * Math.PI) / 180));

    const db = getDb();
    const emotions = db.prepare(`
      SELECT e.*, u.username, u.avatar,
        ROUND(
          111.0 * SQRT(
            POW(e.latitude - ?, 2) +
            POW((e.longitude - ?) * COS(? * 3.14159265 / 180), 2)
          ), 2
        ) as distance_km
      FROM emotions e
      LEFT JOIN users u ON e.user_id = u.id
      WHERE e.is_public = 1
        AND e.latitude BETWEEN ? AND ?
        AND e.longitude BETWEEN ? AND ?
        AND e.latitude != 0
        AND e.longitude != 0
      ORDER BY distance_km ASC
      LIMIT ?
    `).all(
      latitude, longitude, latitude,
      latitude - latRange, latitude + latRange,
      longitude - lngRange, longitude + lngRange,
      limit
    );

    res.json({
      success: true,
      data: {
        emotions,
        center: { latitude, longitude },
        radius,
      },
    });
  } catch (err) {
    console.error('[附近情绪] 错误:', err);
    res.status(500).json({ success: false, message: '获取附近情绪失败' });
  }
});

/**
 * GET /heatmap - 获取情绪热力图数据
 * Query: emotion (可选过滤), days (时间范围，默认7天)
 */
router.get('/heatmap', authMiddleware, (req, res) => {
  try {
    const emotionFilter = req.query.emotion || '';
    const days = Math.min(90, Math.max(1, parseInt(req.query.days) || 7));

    const db = getDb();

    let query = `
      SELECT latitude, longitude, emotion, COUNT(*) as intensity
      FROM emotions
      WHERE is_public = 1
        AND latitude != 0
        AND longitude != 0
        AND created_at >= datetime('now', '-${days} days', 'localtime')
    `;
    const params = [];

    if (emotionFilter) {
      query += ' AND emotion = ?';
      params.push(emotionFilter);
    }

    query += ' GROUP BY ROUND(latitude, 2), ROUND(longitude, 2), emotion';
    query += ' ORDER BY intensity DESC LIMIT 500';

    const heatData = db.prepare(query).all(...params);

    // 按情绪汇总
    const summary = db.prepare(`
      SELECT emotion, COUNT(*) as count
      FROM emotions
      WHERE is_public = 1
        AND latitude != 0
        AND longitude != 0
        AND created_at >= datetime('now', '-${days} days', 'localtime')
      GROUP BY emotion
      ORDER BY count DESC
    `).all();

    res.json({
      success: true,
      data: {
        heatmap: heatData,
        summary,
        days,
      },
    });
  } catch (err) {
    console.error('[热力图] 错误:', err);
    res.status(500).json({ success: false, message: '获取热力图数据失败' });
  }
});

/**
 * POST /location - 更新情绪记录的位置信息
 * Body: { emotionId, location, latitude, longitude }
 */
router.post('/location', authMiddleware, (req, res) => {
  try {
    const { emotionId, location = '', latitude, longitude } = req.body;

    if (!emotionId || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ success: false, message: '缺少必要参数' });
    }

    const db = getDb();

    // 确保该记录属于当前用户
    const emotion = db.prepare('SELECT id FROM emotions WHERE id = ? AND user_id = ?').get(emotionId, req.user.id);

    if (!emotion) {
      return res.status(404).json({ success: false, message: '情绪记录不存在或无权限修改' });
    }

    db.prepare(
      'UPDATE emotions SET location = ?, latitude = ?, longitude = ? WHERE id = ?'
    ).run(location, latitude, longitude, emotionId);

    res.json({
      success: true,
      message: '位置信息已更新',
    });
  } catch (err) {
    console.error('[位置更新] 错误:', err);
    res.status(500).json({ success: false, message: '更新位置信息失败' });
  }
});

module.exports = router;
