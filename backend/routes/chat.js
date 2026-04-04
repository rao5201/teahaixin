/**
 * 聊天路由 - 用户与AI茶友的对话
 */
const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { getRandomAIUsers, isAIUser, generateBio, PERSONALITIES } = require('../services/aiAccounts');
const { getAIReply, getTypingDelay } = require('../services/aiChat');

/**
 * GET /contacts - 获取茶友列表（AI茶友）
 */
router.get('/contacts', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    // Get AI users who have chatted with this user, plus some random new ones
    const chatted = db.prepare(`
      SELECT DISTINCT u.id, u.username, u.avatar,
        (SELECT content FROM messages WHERE
          (from_user_id = u.id AND to_user_id = ?)
          OR (from_user_id = ? AND to_user_id = u.id)
          ORDER BY created_at DESC LIMIT 1
        ) as last_message,
        (SELECT created_at FROM messages WHERE
          (from_user_id = u.id AND to_user_id = ?)
          OR (from_user_id = ? AND to_user_id = u.id)
          ORDER BY created_at DESC LIMIT 1
        ) as last_time,
        (SELECT COUNT(*) FROM messages WHERE
          from_user_id = u.id AND to_user_id = ? AND is_read = 0
        ) as unread
      FROM users u
      WHERE u.username LIKE 'AI_%'
        AND EXISTS (
          SELECT 1 FROM messages m
          WHERE (m.from_user_id = u.id AND m.to_user_id = ?)
            OR (m.from_user_id = ? AND m.to_user_id = u.id)
        )
      ORDER BY last_time DESC
    `).all(userId, userId, userId, userId, userId, userId, userId);

    // If not enough contacts, add random AI users
    const chattedIds = chatted.map(c => c.id);
    let newContacts = [];
    if (chatted.length < limit) {
      newContacts = getRandomAIUsers(db, limit - chatted.length, [...chattedIds, userId]);
      newContacts = newContacts.map(u => ({
        ...u,
        last_message: null,
        last_time: null,
        unread: 0
      }));
    }

    const all = [...chatted, ...newContacts].slice(offset, offset + limit);

    // Add personality info
    const contacts = all.map((c, i) => ({
      ...c,
      displayName: c.username.replace('AI_', ''),
      personality: PERSONALITIES[(c.id || i) % PERSONALITIES.length],
      bio: generateBio((c.id || i) % 100)
    }));

    res.json({ success: true, data: { contacts, page, hasMore: all.length === limit } });
  } catch (err) {
    console.error('[聊天] 获取联系人失败:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

/**
 * GET /messages/:contactId - 获取与某个茶友的聊天记录
 */
router.get('/messages/:contactId', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;
    const contactId = parseInt(req.params.contactId);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;
    const offset = (page - 1) * limit;

    const messages = db.prepare(`
      SELECT m.*,
        CASE WHEN m.from_user_id = ? THEN 1 ELSE 0 END as is_mine,
        u.username as from_username, u.avatar as from_avatar
      FROM messages m
      JOIN users u ON u.id = m.from_user_id
      WHERE (m.from_user_id = ? AND m.to_user_id = ?)
        OR (m.from_user_id = ? AND m.to_user_id = ?)
      ORDER BY m.created_at DESC
      LIMIT ? OFFSET ?
    `).all(userId, userId, contactId, contactId, userId, limit, offset);

    // Mark as read
    db.prepare(`
      UPDATE messages SET is_read = 1
      WHERE from_user_id = ? AND to_user_id = ? AND is_read = 0
    `).run(contactId, userId);

    // Get contact info
    const contact = db.prepare('SELECT id, username, avatar FROM users WHERE id = ?').get(contactId);

    res.json({
      success: true,
      data: {
        messages: messages.reverse(),
        contact: contact ? {
          ...contact,
          displayName: (contact.username || '').replace('AI_', ''),
          isAI: (contact.username || '').startsWith('AI_')
        } : null,
        page,
        hasMore: messages.length === limit
      }
    });
  } catch (err) {
    console.error('[聊天] 获取消息失败:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

/**
 * POST /send - 发送消息
 */
router.post('/send', authMiddleware, async (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.id;
    const { to_user_id, content } = req.body;

    if (!to_user_id || !content || !content.trim()) {
      return res.status(400).json({ success: false, message: '消息不能为空' });
    }

    const text = content.trim().slice(0, 1000);

    // Save user message
    const result = db.prepare(`
      INSERT INTO messages (from_user_id, to_user_id, content, msg_type)
      VALUES (?, ?, ?, 'text')
    `).run(userId, to_user_id, text);

    const userMsg = {
      id: result.lastInsertRowid,
      from_user_id: userId,
      to_user_id: to_user_id,
      content: text,
      msg_type: 'text',
      is_mine: 1,
      created_at: new Date().toISOString().replace('T', ' ').slice(0, 19)
    };

    // Check if target is AI user - if so, trigger auto-reply
    if (isAIUser(db, to_user_id)) {
      const aiUser = db.prepare('SELECT id, username FROM users WHERE id = ?').get(to_user_id);

      // Get recent conversation for context
      const history = db.prepare(`
        SELECT m.content,
          CASE WHEN m.from_user_id = ? THEN 0 ELSE 1 END as is_from_ai
        FROM messages m
        WHERE (m.from_user_id = ? AND m.to_user_id = ?)
          OR (m.from_user_id = ? AND m.to_user_id = ?)
        ORDER BY m.created_at DESC LIMIT 10
      `).all(to_user_id, userId, to_user_id, to_user_id, userId);

      // Generate AI reply asynchronously
      const delay = getTypingDelay(text.length);

      // Send typing indicator via Socket.IO if available
      const io = req.app.get('io');
      const onlineUsers = req.app.get('onlineUsers');
      const userSocketId = onlineUsers ? onlineUsers.get(String(userId)) : null;

      if (io && userSocketId) {
        io.to(userSocketId).emit('typing', { userId: to_user_id, username: aiUser.username });
      }

      // Reply after delay
      setTimeout(async () => {
        try {
          const aiReply = await getAIReply(text, aiUser.username, history.reverse());

          // Save AI reply
          const aiResult = db.prepare(`
            INSERT INTO messages (from_user_id, to_user_id, content, msg_type)
            VALUES (?, ?, ?, 'text')
          `).run(to_user_id, userId, aiReply);

          const aiMsg = {
            id: aiResult.lastInsertRowid,
            from_user_id: to_user_id,
            to_user_id: userId,
            content: aiReply,
            msg_type: 'text',
            is_mine: 0,
            from_username: aiUser.username,
            created_at: new Date().toISOString().replace('T', ' ').slice(0, 19)
          };

          // Send via Socket.IO
          if (io && userSocketId) {
            io.to(userSocketId).emit('new_message', aiMsg);
            io.to(userSocketId).emit('stop_typing', { userId: to_user_id });
          }
        } catch (err) {
          console.error('[AI回复] 生成失败:', err);
        }
      }, delay);
    }

    res.json({ success: true, data: { message: userMsg } });
  } catch (err) {
    console.error('[聊天] 发送失败:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

/**
 * GET /unread - 获取未读消息数
 */
router.get('/unread', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const result = db.prepare(`
      SELECT COUNT(*) as count FROM messages
      WHERE to_user_id = ? AND is_read = 0
    `).get(req.user.id);
    res.json({ success: true, data: { unread: result.count } });
  } catch (err) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

/**
 * GET /search - 搜索茶友
 */
router.get('/search', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const q = (req.query.q || '').trim();
    if (!q) return res.json({ success: true, data: { users: [] } });

    const users = db.prepare(`
      SELECT id, username, avatar FROM users
      WHERE username LIKE ? AND username LIKE 'AI_%'
      LIMIT 20
    `).all(`%${q}%`);

    const result = users.map(u => ({
      ...u,
      displayName: u.username.replace('AI_', ''),
      isAI: true
    }));

    res.json({ success: true, data: { users: result } });
  } catch (err) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

module.exports = router;
