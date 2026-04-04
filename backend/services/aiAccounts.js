/**
 * AI 茶友账号生成与管理
 * 创建1000个AI虚拟茶友，用于自动聊天回复
 */
const bcrypt = require('bcryptjs');

// ─── 茶文化主题名字库 ───
const SURNAMES = [
  '云','风','雨','雪','月','星','花','叶','竹','松','柳','梅','兰','菊','荷',
  '泉','溪','湖','海','山','石','玉','翠','青','碧','紫','金','银','白','墨',
  '清','静','雅','慧','灵','幽','妙','芳','秀','婉','素','淡','暖','柔','明'
];

const TEA_NAMES = [
  '龙井','碧螺','铁观音','普洱','大红袍','毛尖','银针','瓜片','毛峰','云雾',
  '正山','金骏','滇红','祁红','岩茶','白牡丹','寿眉','茉莉','桂花','玫瑰',
  '菊花','薄荷','柠檬','蜜桃','青梅','桃花','杏仁','莲子','百合','枸杞'
];

const NATURE_WORDS = [
  '晨露','暮雨','清风','明月','朝霞','晚照','春芽','夏荷','秋枫','冬雪',
  '烟霞','云岚','溪声','鸟语','花香','竹影','松涛','梅韵','兰心','菊韵',
  '茶韵','茗香','禅意','诗意','墨香','琴音','棋韵','书香','画意','歌声',
  '星辰','银河','彩虹','微风','细雨','阳光','月光','萤火','流云','飞雪',
  '碧波','清泉','幽谷','深林','远山','近水','高原','平湖','小桥','流水'
];

const PERSONALITIES = [
  '温暖','开朗','文艺','安静','幽默','睿智','浪漫','率真','随和','热情',
  '淡然','优雅','活泼','沉稳','细腻','豁达','乐观','内敛','洒脱','真诚'
];

const AVATARS = [
  '🍵','🌸','🌿','🎋','🌺','🌻','🌷','🌹','🍃','🌊',
  '🏔️','🌙','⭐','🦋','🐦','🌈','🎑','🍂','❄️','🔥',
  '💎','🎭','🎨','📚','🎵','🌞','🌝','🍀','🌴','🎐'
];

const BIO_TEMPLATES = [
  '喜欢在{time}泡一杯{tea}，{hobby}',
  '一个{personality}的茶友，最爱{tea}的味道',
  '{nature}时分，{tea}相伴，{hobby}',
  '与{tea}为伴，在{nature}中寻找{personality}',
  '人生如茶，{personality}是我的底色',
];

const HOBBIES = [
  '听雨声入眠','看云卷云舒','写几行小诗','弹一曲古琴','画一幅水墨',
  '读一本好书','听一首老歌','散步在林间','冥想片刻','整理花草',
  '烹茶待友','独坐窗前','仰望星空','细品人生','随心而行'
];

const TIMES = ['清晨','午后','黄昏','月夜','雨天','雪日','春日','秋夕'];

/**
 * 生成唯一的AI用户名
 */
function generateAIName(index) {
  const s = SURNAMES[index % SURNAMES.length];
  const n = NATURE_WORDS[Math.floor(index / SURNAMES.length) % NATURE_WORDS.length];
  // Add suffix for uniqueness
  const suffix = index > (SURNAMES.length * NATURE_WORDS.length)
    ? String(Math.floor(index / (SURNAMES.length * NATURE_WORDS.length)) + 1)
    : '';
  return `AI_${s}${n}${suffix}`;
}

/**
 * 生成AI账号的个性签名
 */
function generateBio(index) {
  const tpl = BIO_TEMPLATES[index % BIO_TEMPLATES.length];
  return tpl
    .replace('{tea}', TEA_NAMES[index % TEA_NAMES.length])
    .replace('{nature}', NATURE_WORDS[(index * 3) % NATURE_WORDS.length])
    .replace('{personality}', PERSONALITIES[index % PERSONALITIES.length])
    .replace('{time}', TIMES[index % TIMES.length])
    .replace('{hobby}', HOBBIES[index % HOBBIES.length]);
}

/**
 * 批量创建1000个AI茶友账号
 */
function seedAIAccounts(db) {
  const AI_COUNT = 1000;
  const passwordHash = bcrypt.hashSync('ai_teahaixin_2024', 10);

  const insert = db.prepare(`
    INSERT OR IGNORE INTO users (username, password, avatar)
    VALUES (?, ?, ?)
  `);

  const insertMany = db.transaction(() => {
    for (let i = 0; i < AI_COUNT; i++) {
      const username = generateAIName(i);
      const avatar = AVATARS[i % AVATARS.length];
      insert.run(username, passwordHash, avatar);
    }
  });

  insertMany();
  const count = db.prepare('SELECT COUNT(*) as c FROM users WHERE username LIKE ?').get('AI_%');
  console.log(`[AI账号] 已创建 ${count.c} 个AI茶友账号`);
}

/**
 * 获取随机的AI用户列表
 */
function getRandomAIUsers(db, count = 20, excludeIds = []) {
  const excludeStr = excludeIds.length ? `AND id NOT IN (${excludeIds.join(',')})` : '';
  return db.prepare(`
    SELECT id, username, avatar FROM users
    WHERE username LIKE 'AI_%' ${excludeStr}
    ORDER BY RANDOM() LIMIT ?
  `).all(count);
}

/**
 * 判断用户是否为AI账号
 */
function isAIUser(db, userId) {
  const user = db.prepare('SELECT username FROM users WHERE id = ?').get(userId);
  return user && user.username.startsWith('AI_');
}

module.exports = { seedAIAccounts, getRandomAIUsers, isAIUser, generateBio, PERSONALITIES, TEA_NAMES };
