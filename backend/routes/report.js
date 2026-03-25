const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { getDb } = require('../config/database');

// 情绪标签
const EMOTION_LABELS = {
  happy: '喜悦',
  sad: '忧伤',
  angry: '愤怒',
  peaceful: '平和',
  anxious: '焦虑',
  romantic: '浪漫',
};

// 情绪洞察语句
const INSIGHTS = {
  happy: [
    '这周你的笑容格外灿烂，保持这份好心情吧！',
    '阳光洒满了你的一周，愿每天都有小确幸。',
    '快乐是会传染的，你也在温暖着身边的人。',
  ],
  sad: [
    '每个人都有低落的时候，记得给自己一杯温暖的茶。',
    '忧伤只是暂时的客人，明天又是新的一天。',
    '允许自己难过，也要记得抬头看看天空。',
  ],
  angry: [
    '深呼吸，让愤怒像风一样过去。',
    '情绪的浪花终会平息，你比想象中更坚强。',
    '试着把怒气转化为改变的力量。',
  ],
  peaceful: [
    '内心的平静是最珍贵的礼物，继续保持吧。',
    '你正处于一种很好的心理状态，享受当下。',
    '平和的心境如同一湖清水，映照万物。',
  ],
  anxious: [
    '焦虑时，试着关注呼吸，一切都会好起来的。',
    '把大事拆成小事，一步一步来。',
    '不安是对未来的关注，也说明你在认真对待生活。',
  ],
  romantic: [
    '心中有爱的人，整个世界都是温柔的。',
    '浪漫不需要惊天动地，平凡中的心动最珍贵。',
    '愿你的每一份深情都不被辜负。',
  ],
};

// 茶语金句
const TEA_QUOTES = [
  '一盏清茶，一段心事，茶凉了人还在。',
  '人生如茶，苦尽甘来。',
  '茶不过两种姿态：浮与沉；人不过两种姿态：拿起与放下。',
  '喝茶是一种心情，品茶却是一种心境。',
  '半盏清茶，观浮沉人生。',
  '一杯茶，品人生沉浮；平常心，造万千世界。',
  '茶如人生，淡中有味，虚怀若谷。',
  '以茶会心，遇见情绪，遇见自己。',
  '浮生若茶，甘苦一念。',
  '煮一壶茶，等一阵风，候一个人。',
];

/**
 * GET /weekly - 获取情绪周报
 */
router.get('/weekly', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;

    // 本周情绪统计
    const weeklyEmotions = db.prepare(`
      SELECT emotion, COUNT(*) as count
      FROM emotions
      WHERE user_id = ?
        AND created_at >= datetime('now', '-7 days', 'localtime')
      GROUP BY emotion
      ORDER BY count DESC
    `).all(userId);

    // 本周总记录数
    const weeklyTotal = db.prepare(`
      SELECT COUNT(*) as count
      FROM emotions
      WHERE user_id = ?
        AND created_at >= datetime('now', '-7 days', 'localtime')
    `).get(userId);

    // 上周记录数（对比用）
    const lastWeekTotal = db.prepare(`
      SELECT COUNT(*) as count
      FROM emotions
      WHERE user_id = ?
        AND created_at >= datetime('now', '-14 days', 'localtime')
        AND created_at < datetime('now', '-7 days', 'localtime')
    `).get(userId);

    // 每日分布
    const dailyDistribution = db.prepare(`
      SELECT date(created_at) as date, emotion, COUNT(*) as count
      FROM emotions
      WHERE user_id = ?
        AND created_at >= datetime('now', '-7 days', 'localtime')
      GROUP BY date(created_at), emotion
      ORDER BY date(created_at)
    `).all(userId);

    // 本周共鸣统计
    const resonanceStats = db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM resonances WHERE from_user_id = ? AND created_at >= datetime('now', '-7 days', 'localtime')) as sent,
        (SELECT COUNT(*) FROM resonances WHERE to_user_id = ? AND created_at >= datetime('now', '-7 days', 'localtime')) as received
    `).get(userId, userId);

    // 最频繁的情绪
    const dominantEmotion = weeklyEmotions.length > 0 ? weeklyEmotions[0].emotion : 'peaceful';

    // 生成洞察
    const emotionInsights = INSIGHTS[dominantEmotion] || INSIGHTS.peaceful;
    const insight = emotionInsights[Math.floor(Math.random() * emotionInsights.length)];

    // 茶语金句
    const quote = TEA_QUOTES[Math.floor(Math.random() * TEA_QUOTES.length)];

    // 计算情绪丰富度（有多少种不同情绪）
    const emotionDiversity = weeklyEmotions.length;

    // 增长趋势
    const growth = weeklyTotal.count - lastWeekTotal.count;
    let trend = '持平';
    if (growth > 0) trend = '上升';
    if (growth < 0) trend = '下降';

    // 格式化情绪分布
    const emotionDistribution = weeklyEmotions.map((e) => ({
      emotion: e.emotion,
      label: EMOTION_LABELS[e.emotion] || e.emotion,
      count: e.count,
      percentage: weeklyTotal.count > 0 ? Math.round((e.count / weeklyTotal.count) * 100) : 0,
    }));

    res.json({
      success: true,
      data: {
        period: {
          start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          end: new Date().toISOString().slice(0, 10),
        },
        summary: {
          totalRecords: weeklyTotal.count,
          lastWeekRecords: lastWeekTotal.count,
          growth,
          trend,
          dominantEmotion: {
            emotion: dominantEmotion,
            label: EMOTION_LABELS[dominantEmotion] || dominantEmotion,
          },
          emotionDiversity,
        },
        emotionDistribution,
        dailyDistribution,
        resonance: {
          sent: resonanceStats.sent,
          received: resonanceStats.received,
          total: resonanceStats.sent + resonanceStats.received,
        },
        insight,
        quote,
        brand: '茶海心遇',
        slogan: '以茶会心，遇见情绪',
      },
    });
  } catch (err) {
    console.error('[周报] 错误:', err);
    res.status(500).json({ success: false, message: '生成周报失败，请稍后重试' });
  }
});

module.exports = router;
