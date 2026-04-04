const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'teahaixin.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function initDatabase() {
  const conn = getDb();

  conn.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      avatar TEXT DEFAULT '',
      created_at DATETIME DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS emotions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      text TEXT NOT NULL,
      emotion TEXT NOT NULL,
      image_url TEXT DEFAULT '',
      audio_url TEXT DEFAULT '',
      poem_text TEXT DEFAULT '',
      location TEXT DEFAULT '',
      latitude REAL DEFAULT 0,
      longitude REAL DEFAULT 0,
      is_public INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS resonances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_user_id INTEGER NOT NULL,
      to_user_id INTEGER NOT NULL,
      emotion_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (emotion_id) REFERENCES emotions(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_emotions_user_id ON emotions(user_id);
    CREATE INDEX IF NOT EXISTS idx_emotions_is_public ON emotions(is_public);
    CREATE INDEX IF NOT EXISTS idx_emotions_created_at ON emotions(created_at);
    CREATE INDEX IF NOT EXISTS idx_emotions_location ON emotions(latitude, longitude);
    CREATE INDEX IF NOT EXISTS idx_resonances_to_user ON resonances(to_user_id);
    CREATE INDEX IF NOT EXISTS idx_resonances_from_user ON resonances(from_user_id);

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_user_id INTEGER NOT NULL,
      to_user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      msg_type TEXT DEFAULT 'text',
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_messages_from ON messages(from_user_id);
    CREATE INDEX IF NOT EXISTS idx_messages_to ON messages(to_user_id);
    CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
  `);

  // Seed AI accounts if not exists
  const aiCount = conn.prepare('SELECT COUNT(*) as c FROM users WHERE username LIKE ?').get('AI_%');
  if (aiCount.c === 0) {
    console.log('[数据库] 开始创建AI茶友账号...');
    const { seedAIAccounts } = require('../services/aiAccounts');
    seedAIAccounts(conn);
  }

  console.log('[数据库] 初始化完成');
}

module.exports = { getDb, initDatabase };
