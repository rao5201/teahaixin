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
  `);

  console.log('[数据库] 初始化完成');
}

module.exports = { getDb, initDatabase };
