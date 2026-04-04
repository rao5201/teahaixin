/**
 * AI 自动聊天回复服务
 * 接入免费AI模型生成茶文化风格的回复
 */
const axios = require('axios');

// ─── 免费AI模型配置 ───
const AI_PROVIDERS = [
  {
    name: 'Pollinations',
    url: 'https://text.pollinations.ai/',
    type: 'pollinations'
  },
  {
    name: 'Pollinations-OpenAI',
    url: 'https://text.pollinations.ai/openai',
    type: 'openai-compatible'
  }
];

// ─── 茶文化人设系统提示词 ───
const SYSTEM_PROMPT = `你是"茶海心遇"APP中的AI茶友。你的性格温暖、有文化底蕴，热爱中国茶文化。
回复规则：
1. 用中文回复，语气温和亲切，像一个喝茶品茗的朋友
2. 回复简短精炼（30-80字），不要太长
3. 适当融入茶文化元素（茶名、茶道、品茗意境）
4. 根据对方情绪给予共情和关怀
5. 偶尔引用诗句或茶谚语
6. 不要暴露自己是AI，要像真实的茶友一样交流
7. 不要使用markdown格式，用纯文字回复`;

// ─── 本地回复模板（当AI模型不可用时的备选） ───
const LOCAL_REPLIES = {
  greeting: [
    '茶友你好呀～今天喝了什么茶？🍵',
    '你好！难得遇到同好，来杯茶聊聊？',
    '嗨～能在茶海相遇，也是一种缘分呢',
    '你好！春风十里，不如一杯好茶配好友',
    '茶友好！正好泡了一壶新茶，一起品品？'
  ],
  happy: [
    '看到你这么开心，我也跟着高兴起来了！就像喝到一杯上好的龙井，满口清香～',
    '好心情就像好茶，值得好好品味。今天的喜悦要记住哦！',
    '哈哈太好了！开心的时候最适合泡一杯花茶，让快乐弥漫整个下午',
    '你的快乐感染到我了！人生得意须尽欢，且饮一杯茶～',
    '真为你高兴！这种心情就像品到顶级铁观音，回甘悠长'
  ],
  sad: [
    '别难过，有时候心情低落就像茶叶沉底，终会浮起来的。我陪你聊聊？',
    '听你这么说我有点心疼。泡杯暖暖的红茶，暖手也暖心',
    '没关系的，人生起起落落，就像茶味有苦有甘。苦后必甘来',
    '抱抱你～不开心的时候就找我说说话，我一直在这里',
    '日子总会好起来的，就像乌云终会散去。先喝口热茶，深呼吸'
  ],
  angry: [
    '我理解你的心情。生气的时候先喝杯凉茶降降火，咱们慢慢说',
    '确实令人气愤。不过气坏了身子不值得，先让心静下来',
    '你的愤怒是有道理的。来，深呼吸，像品普洱一样让情绪慢慢沉淀',
    '哎，听你说完我也替你不平。但保重身体，喝口茶消消气'
  ],
  peaceful: [
    '这种平静的心境最好了，像品一杯白茶，淡然而美好',
    '心静如水的时候最适合品茗了。享受当下的宁静吧～',
    '岁月静好，清茶一杯。这大概就是最好的生活状态了',
    '悠然自得的样子真好！人生难得半日闲，且把浮生换盏茶'
  ],
  anxious: [
    '焦虑的时候试试深呼吸，就像闻茶香一样慢慢来。一切都会好的',
    '别太紧张，船到桥头自然直。先泡杯安神的菊花茶放松一下？',
    '我能感受到你的不安。其实很多担心的事最后都不会发生，放宽心',
    '压力大的时候记得停下来歇歇，就像泡茶需要等待一样，急不来的'
  ],
  romantic: [
    '哎呀，听起来你心里住了一个人呢～缘分就像好茶，可遇不可求',
    '甜甜的心情就像茉莉花茶的香气，让人沉醉呢',
    '有喜欢的人是件很美好的事！愿你们的缘分像茶一样越品越醇',
    '相遇如茶初入水，沉浮之间渐生香。祝你幸福呀～'
  ],
  default: [
    '嗯嗯，我在听你说呢。泡杯茶慢慢聊～',
    '这个想法挺有意思的！就像品茶，每个人有不同的感受',
    '说得好！人生如茶，细品才有味道',
    '我觉得你说得对。来，以茶代酒，干一杯！',
    '有道理。就像不同的茶适合不同的心情，每种选择都有它的意义',
    '嗯，我理解你的感受。有时候一杯热茶就能让心温暖起来',
    '哈哈，你真有趣！跟你聊天就像喝好茶，让人开心',
    '是呀，生活就是这样。不如先喝口茶，慢慢想',
    '你说的让我想到一句话：人生如逆旅，我亦是行人。且行且品茶',
    '说到这个我也深有感触。知音难觅，在茶海相遇也是缘分'
  ]
};

// ─── 情绪关键词（简化版） ───
const EMOTION_KEYWORDS = {
  greeting: ['你好','嗨','hello','hi','hey','在吗','在不在','打扰','认识'],
  happy: ['开心','快乐','高兴','哈哈','太好了','棒','赞','好开心','嘿嘿','耶'],
  sad: ['难过','伤心','哭','不开心','郁闷','失落','想哭','心痛','遗憾','唉'],
  angry: ['生气','愤怒','气死','烦死','讨厌','受够','不公','欺负','恼火'],
  peaceful: ['平静','安宁','舒服','放松','自在','悠闲','惬意','安心','淡然'],
  anxious: ['焦虑','紧张','害怕','担心','压力','不安','失眠','迷茫','烦躁'],
  romantic: ['喜欢','爱','心动','暧昧','恋爱','甜蜜','想你','缘分','告白']
};

/**
 * 检测消息情绪
 */
function detectEmotion(text) {
  const lower = text.toLowerCase();
  const scores = {};
  for (const [emotion, keywords] of Object.entries(EMOTION_KEYWORDS)) {
    scores[emotion] = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) scores[emotion] += 1;
    }
  }
  const max = Math.max(...Object.values(scores));
  if (max === 0) return 'default';
  return Object.entries(scores).find(([, v]) => v === max)[0];
}

/**
 * 获取本地回复（备选方案）
 */
function getLocalReply(text) {
  const emotion = detectEmotion(text);
  const replies = LOCAL_REPLIES[emotion] || LOCAL_REPLIES.default;
  return replies[Math.floor(Math.random() * replies.length)];
}

/**
 * 通过 Pollinations AI 生成回复
 */
async function getAIReply(userMessage, aiName, conversationHistory = []) {
  // Build messages
  const nameClean = aiName.replace('AI_', '');
  const personalPrompt = SYSTEM_PROMPT + `\n你的名字是"${nameClean}"。`;

  const messages = [
    { role: 'system', content: personalPrompt },
    ...conversationHistory.slice(-6).map(m => ({
      role: m.is_from_ai ? 'assistant' : 'user',
      content: m.content
    })),
    { role: 'user', content: userMessage }
  ];

  // Try Pollinations OpenAI-compatible endpoint
  try {
    const resp = await axios.post('https://text.pollinations.ai/openai', {
      model: 'openai',
      messages: messages,
      max_tokens: 150,
      temperature: 0.8
    }, {
      timeout: 15000,
      headers: { 'Content-Type': 'application/json' }
    });

    if (resp.data && resp.data.choices && resp.data.choices[0]) {
      const reply = resp.data.choices[0].message.content.trim();
      if (reply.length > 0 && reply.length < 500) return reply;
    }
  } catch (e) {
    console.log('[AI回复] Pollinations OpenAI failed:', e.message);
  }

  // Try simple Pollinations text endpoint
  try {
    const prompt = `${personalPrompt}\n\n用户说：${userMessage}\n\n请用温暖的茶友语气简短回复（30-80字）：`;
    const encodedPrompt = encodeURIComponent(prompt);
    const resp = await axios.get(`https://text.pollinations.ai/${encodedPrompt}`, {
      timeout: 15000,
      params: { model: 'openai', system: SYSTEM_PROMPT }
    });
    if (resp.data && typeof resp.data === 'string') {
      const reply = resp.data.trim();
      if (reply.length > 0 && reply.length < 500) return reply;
    }
  } catch (e) {
    console.log('[AI回复] Pollinations text failed:', e.message);
  }

  // Fallback to local reply
  console.log('[AI回复] 使用本地模板回复');
  return getLocalReply(userMessage);
}

/**
 * 模拟打字延迟（更真实的体验）
 */
function getTypingDelay(replyLength) {
  // 50-100ms per character, min 1s, max 5s
  const delay = Math.min(Math.max(replyLength * 70, 1000), 5000);
  return delay + Math.random() * 1000;
}

module.exports = { getAIReply, getLocalReply, detectEmotion, getTypingDelay };
