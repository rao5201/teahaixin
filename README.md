# 茶海心遇 (TeaHaiXin)

> 以茶会心，遇见情绪

一款 **AI 驱动的情绪可视化社交 APP**，将你的心情转化为唯美的视觉卡片与音乐。在数字茶室中，与共鸣的灵魂相遇。

---

## 项目简介

茶海心遇是一个全栈移动端社交应用，核心理念是"让每一份情绪都被看见、被听见、被珍惜"。用户输入一段文字描述当前心情，AI 会自动进行情绪分析，生成对应的视觉艺术卡片和匹配音乐，同时可以在"灵魂共振"功能中找到此刻与你情绪相似的人，开启温暖的连接。

---

## 技术栈

| 层级 | 技术 |
|------|------|
| **前端** | React Native (Expo ~49.0)、React Navigation、AsyncStorage |
| **后端** | Node.js + Express 4.x |
| **数据库** | SQLite (better-sqlite3) |
| **实时通信** | Socket.IO |
| **AI 服务** | Free AI APIs (HuggingFace 等) |
| **认证** | JWT (jsonwebtoken) + bcryptjs |
| **官网** | 纯 HTML/CSS/JS 单页面 |

---

## 项目结构

```
teahaixin/
├── backend/                    # 后端服务
│   ├── config/
│   │   └── database.js         # SQLite 数据库初始化与配置
│   ├── middleware/
│   │   └── auth.js             # JWT 认证中间件
│   ├── routes/
│   │   ├── generate.js         # AI 情绪分析 & 卡片生成
│   │   ├── user.js             # 用户注册 / 登录 / 个人信息
│   │   ├── map.js              # 城市情绪地图（附近情绪记录）
│   │   ├── resonance.js        # 灵魂共振匹配
│   │   └── report.js           # 每周情绪报告
│   ├── services/
│   │   └── freeAI.js           # 免费 AI API 封装
│   ├── data/                   # SQLite 数据库文件（运行时生成）
│   ├── .env.example            # 环境变量示例
│   ├── server.js               # 服务入口（Express + Socket.IO）
│   ├── package.json
│   └── package-lock.json
├── frontend/                   # React Native (Expo) 前端
│   ├── screens/
│   │   ├── AuthScreen.js       # 登录 / 注册
│   │   ├── HomeScreen.js       # 首页（情绪输入）
│   │   ├── ResultScreen.js     # AI 生成结果展示
│   │   ├── MapScreen.js        # 城市情绪地图
│   │   └── ProfileScreen.js    # 个人中心
│   ├── components/
│   │   └── AudioPlayer.js      # 音频播放器组件
│   ├── assets/                 # 静态资源
│   ├── App.js                  # 应用入口 & 导航配置
│   ├── app.json                # Expo 配置
│   └── package.json
├── website/                    # 官方宣传网站
│   └── index.html              # 单页响应式官网
├── .gitignore
└── README.md
```

---

## 快速开始

### 前置条件

- Node.js >= 16
- npm 或 yarn
- Expo CLI（`npm install -g expo-cli`）

### 1. 启动后端

```bash
# 进入后端目录
cd backend

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，设置以下变量：
#   PORT=3001
#   JWT_SECRET=你的密钥
#   HF_TOKEN=你的 HuggingFace Token（可选，用于 AI 图片生成）

# 启动服务（开发模式，支持热重载）
npm run dev

# 或生产模式
npm start
```

后端默认运行在 `http://localhost:3001`，可通过 `GET /api/health` 验证服务状态。

### 2. 启动前端

```bash
# 进入前端目录
cd frontend

# 安装依赖
npm install

# 启动 Expo 开发服务器
npm start

# 在特定平台运行
npm run android    # Android
npm run ios        # iOS
npm run web        # Web
```

> 注意：前端需要连接后端 API，请确保后端已启动，并在前端代码中配置正确的 API 地址。

---

## API 文档

后端基础地址：`http://localhost:3001/api`

### 健康检查

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 服务健康检查 |

### 用户模块 `/api/user`

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | `/register` | 否 | 用户注册（username, password） |
| POST | `/login` | 否 | 用户登录，返回 JWT Token |
| GET | `/profile` | 是 | 获取当前用户信息 |

### AI 生成模块 `/api/generate`

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | `/` | 否 | 输入心情文字，AI 返回情绪分析 + 视觉卡片 + 匹配音乐 |

请求体：
```json
{
  "text": "今天阳光很好，心情很平静"
}
```

### 情绪地图模块 `/api/map`

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/nearby` | 是 | 获取附近的情绪记录（query: latitude, longitude, radius） |

### 灵魂共振模块 `/api/resonance`

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | `/find` | 是 | 寻找情绪共鸣者（body: emotion, limit） |

### 情绪报告模块 `/api/report`

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/weekly` | 是 | 获取每周情绪分析报告 |

> 需要认证的接口请在请求头中携带：`Authorization: Bearer <token>`

---

## 功能特性

- **AI 情绪分析** - 输入文字，AI 精准识别喜悦、忧伤、平静、焦虑等多维情绪状态
- **情绪视觉卡片** - 将无形的情绪转化为唯美的视觉艺术卡片
- **情绪音乐匹配** - 根据心境智能匹配背景音乐，用声音拥抱感受
- **灵魂共振匹配** - 通过 AI 情绪图谱匹配，连接此刻与你感受相似的灵魂
- **城市情绪地图** - 热力图呈现城市的情绪脉搏，感受同一片天空下的喜怒哀乐
- **每周情绪报告** - AI 总结情绪变化趋势，发现内心深处的情绪规律
- **实时通信** - Socket.IO 支持在线状态与实时消息推送
- **暗色主题 UI** - 沉浸式深色界面设计，舒适的视觉体验
- **官方宣传网站** - 响应式单页官网，含动画效果与产品展示

---

## 应用截图

> 截图待补充。启动应用后可体验以下界面：

| 登录/注册 | 心语首页 | AI 生成结果 | 城市情绪地图 | 个人中心 |
|-----------|---------|-------------|-------------|---------|
| 即将添加 | 即将添加 | 即将添加 | 即将添加 | 即将添加 |

---

## 环境变量说明

参考 `backend/.env.example`：

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `PORT` | 否 | 3001 | 后端服务端口 |
| `JWT_SECRET` | 是 | - | JWT 签名密钥 |
| `HF_TOKEN` | 否 | - | HuggingFace API Token（用于 AI 图片生成） |

---

## 许可证

本项目基于 [MIT License](https://opensource.org/licenses/MIT) 开源。

---

<p align="center">
  <b>茶海心遇</b> - 以茶会心，遇见情绪<br>
  Made with heart
</p>
