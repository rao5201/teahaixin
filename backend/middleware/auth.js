const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'teahaixin-secret-key-2024';
const TOKEN_EXPIRY = '7d';

/**
 * 生成 JWT 令牌
 */
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

/**
 * JWT 认证中间件
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: '请先登录' });
  }

  const token = authHeader.slice(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: '登录已过期，请重新登录' });
    }
    return res.status(401).json({ success: false, message: '认证失败，请重新登录' });
  }
}

module.exports = { generateToken, authMiddleware };
