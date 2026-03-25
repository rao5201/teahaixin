require('dotenv').config();

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { initDatabase } = require('./config/database');

const generateRoutes = require('./routes/generate');
const userRoutes = require('./routes/user');
const mapRoutes = require('./routes/map');
const resonanceRoutes = require('./routes/resonance');
const reportRoutes = require('./routes/report');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// --------------- 中间件 ---------------
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 将 socket.io 实例挂载到 app 上，供路由使用
app.set('io', io);

// --------------- 路由 ---------------
app.use('/api/generate', generateRoutes);
app.use('/api/user', userRoutes);
app.use('/api/map', mapRoutes);
app.use('/api/resonance', resonanceRoutes);
app.use('/api/report', reportRoutes);

// 健康检查
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    brand: '茶海心遇',
    slogan: '以茶会心，遇见情绪',
    timestamp: new Date().toISOString(),
  });
});

// 404 处理
app.use((_req, res) => {
  res.status(404).json({ success: false, message: '接口不存在' });
});

// 全局错误处理
app.use((err, _req, res, _next) => {
  console.error('[服务器错误]', err);
  res.status(500).json({ success: false, message: '服务器内部错误，请稍后重试' });
});

// --------------- Socket.IO ---------------
const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log(`[Socket] 用户连接: ${socket.id}`);

  socket.on('register', (userId) => {
    if (userId) {
      onlineUsers.set(String(userId), socket.id);
      console.log(`[Socket] 用户 ${userId} 已注册，在线用户数: ${onlineUsers.size}`);
    }
  });

  socket.on('disconnect', () => {
    for (const [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        console.log(`[Socket] 用户 ${userId} 断开连接`);
        break;
      }
    }
  });
});

// 导出在线用户映射供路由使用
app.set('onlineUsers', onlineUsers);

// --------------- 初始化 & 启动 ---------------
initDatabase();

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log('========================================');
  console.log('  茶海心遇 (TeaHaiXin) 后端服务');
  console.log('  以茶会心，遇见情绪');
  console.log(`  运行端口: ${PORT}`);
  console.log(`  启动时间: ${new Date().toLocaleString('zh-CN')}`);
  console.log('========================================');
});

module.exports = { app, server, io };
