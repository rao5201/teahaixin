/**
 * 管理后台 - 数据分析路由
 * 用户使用率、总产量、客户满意度分析
 */
const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');

// 简单的管理员密钥验证（查询参数 ?key=xxx）
const ADMIN_KEY = process.env.ADMIN_KEY || 'teahaixin-admin-2024';

function adminAuth(req, res, next) {
  const key = req.query.key || req.headers['x-admin-key'];
  if (key !== ADMIN_KEY) {
    return res.status(403).json({ success: false, message: '无权访问' });
  }
  next();
}

/**
 * GET /api/admin/stats - 综合数据统计
 */
router.get('/stats', adminAuth, (req, res) => {
  try {
    const db = getDb();
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const weekAgo = new Date(now - 7 * 86400000).toISOString().slice(0, 10);
    const monthAgo = new Date(now - 30 * 86400000).toISOString().slice(0, 10);

    // ─── 用户统计 ───
    const totalUsers = db.prepare(
      "SELECT COUNT(*) as c FROM users WHERE username NOT LIKE 'AI_%'"
    ).get().c;

    const totalAI = db.prepare(
      "SELECT COUNT(*) as c FROM users WHERE username LIKE 'AI_%'"
    ).get().c;

    const todayUsers = db.prepare(
      "SELECT COUNT(*) as c FROM users WHERE username NOT LIKE 'AI_%' AND date(created_at) = ?"
    ).get(today).c;

    const weekUsers = db.prepare(
      "SELECT COUNT(*) as c FROM users WHERE username NOT LIKE 'AI_%' AND date(created_at) >= ?"
    ).get(weekAgo).c;

    const monthUsers = db.prepare(
      "SELECT COUNT(*) as c FROM users WHERE username NOT LIKE 'AI_%' AND date(created_at) >= ?"
    ).get(monthAgo).c;

    // 活跃用户（有发消息或生成情绪记录的）
    const activeToday = db.prepare(`
      SELECT COUNT(DISTINCT user_id) as c FROM (
        SELECT from_user_id as user_id FROM messages WHERE date(created_at) = ? AND from_user_id IN (SELECT id FROM users WHERE username NOT LIKE 'AI_%')
        UNION
        SELECT user_id FROM emotions WHERE date(created_at) = ?
      )
    `).get(today, today).c;

    const activeWeek = db.prepare(`
      SELECT COUNT(DISTINCT user_id) as c FROM (
        SELECT from_user_id as user_id FROM messages WHERE date(created_at) >= ? AND from_user_id IN (SELECT id FROM users WHERE username NOT LIKE 'AI_%')
        UNION
        SELECT user_id FROM emotions WHERE date(created_at) >= ?
      )
    `).get(weekAgo, weekAgo).c;

    const activeMonth = db.prepare(`
      SELECT COUNT(DISTINCT user_id) as c FROM (
        SELECT from_user_id as user_id FROM messages WHERE date(created_at) >= ? AND from_user_id IN (SELECT id FROM users WHERE username NOT LIKE 'AI_%')
        UNION
        SELECT user_id FROM emotions WHERE date(created_at) >= ?
      )
    `).get(monthAgo, monthAgo).c;

    // ─── 产量统计 ───
    const totalEmotions = db.prepare("SELECT COUNT(*) as c FROM emotions").get().c;
    const totalMessages = db.prepare("SELECT COUNT(*) as c FROM messages").get().c;
    const totalResonances = db.prepare("SELECT COUNT(*) as c FROM resonances").get().c;

    const userMessages = db.prepare(
      "SELECT COUNT(*) as c FROM messages WHERE from_user_id IN (SELECT id FROM users WHERE username NOT LIKE 'AI_%')"
    ).get().c;
    const aiMessages = db.prepare(
      "SELECT COUNT(*) as c FROM messages WHERE from_user_id IN (SELECT id FROM users WHERE username LIKE 'AI_%')"
    ).get().c;

    // 每日产量（近7天）
    const dailyProduction = db.prepare(`
      SELECT date(created_at) as day,
        COUNT(*) as messages
      FROM messages
      WHERE date(created_at) >= ?
      GROUP BY date(created_at)
      ORDER BY day
    `).all(weekAgo);

    const dailyEmotions = db.prepare(`
      SELECT date(created_at) as day,
        COUNT(*) as emotions
      FROM emotions
      WHERE date(created_at) >= ?
      GROUP BY date(created_at)
      ORDER BY day
    `).all(weekAgo);

    // ─── 客户满意度分析 ───

    // 1. 对话深度（平均每个用户发送消息数，越多说明越有粘性）
    const avgMsgPerUser = db.prepare(`
      SELECT AVG(cnt) as avg_msgs FROM (
        SELECT from_user_id, COUNT(*) as cnt
        FROM messages
        WHERE from_user_id IN (SELECT id FROM users WHERE username NOT LIKE 'AI_%')
        GROUP BY from_user_id
      )
    `).get().avg_msgs || 0;

    // 2. AI回复率（AI收到消息后回复的比例）
    const aiReplyRate = aiMessages > 0 && userMessages > 0
      ? Math.min((aiMessages / userMessages * 100), 100).toFixed(1)
      : 0;

    // 3. 用户回头率（发送多条消息的用户占比）
    const returningUsers = db.prepare(`
      SELECT COUNT(*) as c FROM (
        SELECT from_user_id, COUNT(*) as cnt
        FROM messages
        WHERE from_user_id IN (SELECT id FROM users WHERE username NOT LIKE 'AI_%')
        GROUP BY from_user_id
        HAVING cnt > 3
      )
    `).get().c;

    const returnRate = totalUsers > 0 ? (returningUsers / totalUsers * 100).toFixed(1) : 0;

    // 4. 情绪分布
    const emotionDist = db.prepare(`
      SELECT emotion, COUNT(*) as count
      FROM emotions
      GROUP BY emotion
      ORDER BY count DESC
    `).all();

    // 5. 每日注册趋势（近30天）
    const registrationTrend = db.prepare(`
      SELECT date(created_at) as day, COUNT(*) as count
      FROM users
      WHERE username NOT LIKE 'AI_%' AND date(created_at) >= ?
      GROUP BY date(created_at)
      ORDER BY day
    `).all(monthAgo);

    // 6. 热门聊天茶友 TOP10
    const topAIFriends = db.prepare(`
      SELECT u.username, COUNT(m.id) as msg_count
      FROM messages m
      JOIN users u ON u.id = m.to_user_id
      WHERE u.username LIKE 'AI_%'
      GROUP BY m.to_user_id
      ORDER BY msg_count DESC
      LIMIT 10
    `).all();

    // 7. 用户活跃时段分布
    const hourlyActivity = db.prepare(`
      SELECT CAST(strftime('%H', created_at) AS INTEGER) as hour, COUNT(*) as count
      FROM messages
      WHERE from_user_id IN (SELECT id FROM users WHERE username NOT LIKE 'AI_%')
      GROUP BY hour
      ORDER BY hour
    `).all();

    // 8. 满意度评分计算（综合指标）
    const satisfactionScore = calculateSatisfaction({
      returnRate: parseFloat(returnRate),
      avgMsgPerUser,
      aiReplyRate: parseFloat(aiReplyRate),
      totalUsers,
      activeMonth
    });

    res.json({
      success: true,
      data: {
        overview: {
          totalUsers,
          totalAI,
          todayUsers,
          weekUsers,
          monthUsers,
          activeToday,
          activeWeek,
          activeMonth,
          usageRate: {
            daily: totalUsers > 0 ? (activeToday / totalUsers * 100).toFixed(1) : 0,
            weekly: totalUsers > 0 ? (activeWeek / totalUsers * 100).toFixed(1) : 0,
            monthly: totalUsers > 0 ? (activeMonth / totalUsers * 100).toFixed(1) : 0
          }
        },
        production: {
          totalEmotions,
          totalMessages,
          totalResonances,
          userMessages,
          aiMessages,
          dailyProduction,
          dailyEmotions
        },
        satisfaction: {
          score: satisfactionScore.score,
          grade: satisfactionScore.grade,
          details: satisfactionScore.details,
          avgMsgPerUser: parseFloat(avgMsgPerUser.toFixed(1)),
          aiReplyRate: parseFloat(aiReplyRate),
          returnRate: parseFloat(returnRate),
          returningUsers
        },
        distributions: {
          emotions: emotionDist,
          registrationTrend,
          topAIFriends,
          hourlyActivity
        },
        generatedAt: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error('[管理后台] 统计查询失败:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

/**
 * 计算综合满意度评分（100分制）
 */
function calculateSatisfaction({ returnRate, avgMsgPerUser, aiReplyRate, totalUsers, activeMonth }) {
  const details = [];
  let total = 0;

  // 回头率权重 30%（>50%=满分）
  const returnScore = Math.min(returnRate / 50 * 100, 100);
  total += returnScore * 0.3;
  details.push({ name: '用户回头率', score: returnScore.toFixed(0), weight: '30%', value: returnRate + '%' });

  // 对话深度权重 25%（>10条=满分）
  const depthScore = Math.min(avgMsgPerUser / 10 * 100, 100);
  total += depthScore * 0.25;
  details.push({ name: '对话深度', score: depthScore.toFixed(0), weight: '25%', value: avgMsgPerUser.toFixed(1) + '条/人' });

  // AI回复率权重 20%（>90%=满分）
  const replyScore = Math.min(aiReplyRate / 90 * 100, 100);
  total += replyScore * 0.2;
  details.push({ name: 'AI回复率', score: replyScore.toFixed(0), weight: '20%', value: aiReplyRate + '%' });

  // 月活率权重 15%（>30%=满分）
  const mauRate = totalUsers > 0 ? (activeMonth / totalUsers * 100) : 0;
  const mauScore = Math.min(mauRate / 30 * 100, 100);
  total += mauScore * 0.15;
  details.push({ name: '月活跃率', score: mauScore.toFixed(0), weight: '15%', value: mauRate.toFixed(1) + '%' });

  // 用户基数权重 10%（>100=满分）
  const baseScore = Math.min(totalUsers / 100 * 100, 100);
  total += baseScore * 0.1;
  details.push({ name: '用户基数', score: baseScore.toFixed(0), weight: '10%', value: totalUsers + '人' });

  let grade = 'D';
  if (total >= 90) grade = 'A+';
  else if (total >= 80) grade = 'A';
  else if (total >= 70) grade = 'B+';
  else if (total >= 60) grade = 'B';
  else if (total >= 50) grade = 'C+';
  else if (total >= 40) grade = 'C';
  else if (total >= 30) grade = 'D+';

  return { score: parseFloat(total.toFixed(1)), grade, details };
}

module.exports = router;
