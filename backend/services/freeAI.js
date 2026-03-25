const axios = require('axios');

// --------------- 情绪关键词库（中英文） ---------------
const EMOTION_KEYWORDS = {
  happy: {
    zh: ['开心', '快乐', '高兴', '幸福', '喜悦', '兴奋', '愉快', '欢乐', '满足', '棒', '好运', '甜', '笑', '哈哈', '太好了', '美好', '庆祝', '感恩', '温馨', '阳光'],
    en: ['happy', 'joy', 'glad', 'excited', 'wonderful', 'great', 'amazing', 'love', 'smile', 'laugh', 'celebrate', 'good', 'fantastic', 'awesome', 'blessed'],
  },
  sad: {
    zh: ['难过', '伤心', '悲伤', '哭', '痛苦', '失落', '孤独', '寂寞', '心痛', '思念', '怀念', '遗憾', '可惜', '委屈', '泪', '忧伤', '落寞', '心碎', '离别', '想念'],
    en: ['sad', 'cry', 'pain', 'lonely', 'miss', 'lost', 'hurt', 'sorrow', 'tear', 'grief', 'heartbreak', 'regret', 'depressed', 'melancholy', 'blue'],
  },
  angry: {
    zh: ['生气', '愤怒', '烦', '讨厌', '恨', '怒', '火大', '暴躁', '不满', '气死', '受不了', '抓狂', '崩溃', '无语', '烦躁', '恼火', '郁闷', '窝火', '憋屈', '不爽'],
    en: ['angry', 'hate', 'furious', 'annoyed', 'mad', 'rage', 'frustrated', 'irritated', 'upset', 'outraged', 'disgusted', 'fed up'],
  },
  peaceful: {
    zh: ['平静', '安宁', '淡然', '宁静', '放松', '舒适', '惬意', '自在', '从容', '悠然', '闲适', '恬静', '安详', '坦然', '释然', '清净', '静心', '禅', '茶', '冥想'],
    en: ['peaceful', 'calm', 'serene', 'relaxed', 'quiet', 'tranquil', 'gentle', 'still', 'zen', 'meditation', 'harmony', 'balanced', 'content', 'ease'],
  },
  anxious: {
    zh: ['焦虑', '紧张', '担心', '害怕', '恐惧', '不安', '忧虑', '慌', '惶恐', '压力', '失眠', '煎熬', '忐忑', '彷徨', '迷茫', '纠结', '头疼', '烦恼', '困扰', '无助'],
    en: ['anxious', 'worried', 'nervous', 'scared', 'fear', 'stress', 'panic', 'insomnia', 'overwhelmed', 'confused', 'helpless', 'uneasy', 'tense', 'dread'],
  },
  romantic: {
    zh: ['浪漫', '爱', '恋', '心动', '甜蜜', '暧昧', '温柔', '牵手', '拥抱', '亲吻', '告白', '约会', '情人', '相恋', '陪伴', '守护', '深情', '眷恋', '倾心', '钟情'],
    en: ['romantic', 'love', 'crush', 'sweet', 'tender', 'hug', 'kiss', 'date', 'darling', 'affection', 'devotion', 'passion', 'adore', 'cherish', 'beloved'],
  },
};

// --------------- 诗句库 ---------------
const POEMS = {
  happy: [
    '春风得意马蹄疾，一日看尽长安花。',
    '却看妻子愁何在，漫卷诗书喜欲狂。',
    '两岸猿声啼不住，轻舟已过万重山。',
    '晴空一鹤排云上，便引诗情到碧霄。',
    '人逢喜事精神爽，月到中秋分外明。',
    '好雨知时节，当春乃发生。',
  ],
  sad: [
    '问君能有几多愁，恰似一江春水向东流。',
    '感时花溅泪，恨别鸟惊心。',
    '抽刀断水水更流，举杯消愁愁更愁。',
    '此情可待成追忆，只是当时已惘然。',
    '十年生死两茫茫，不思量，自难忘。',
    '物是人非事事休，欲语泪先流。',
  ],
  angry: [
    '怒发冲冠，凭栏处、潇潇雨歇。',
    '大江东去，浪淘尽，千古风流人物。',
    '壮志饥餐胡虏肉，笑谈渴饮匈奴血。',
    '黄沙百战穿金甲，不破楼兰终不还。',
    '会挽雕弓如满月，西北望，射天狼。',
    '男儿何不带吴钩，收取关山五十州。',
  ],
  peaceful: [
    '采菊东篱下，悠然见南山。',
    '明月松间照，清泉石上流。',
    '空山新雨后，天气晚来秋。',
    '人闲桂花落，夜静春山空。',
    '竹外桃花三两枝，春江水暖鸭先知。',
    '独坐幽篁里，弹琴复长啸。',
  ],
  anxious: [
    '白发三千丈，缘愁似个长。',
    '剪不断，理还乱，是离愁。',
    '花自飘零水自流，一种相思，两处闲愁。',
    '寻寻觅觅，冷冷清清，凄凄惨惨戚戚。',
    '问世间，情为何物，直教生死相许。',
    '何当共剪西窗烛，却话巴山夜雨时。',
  ],
  romantic: [
    '两情若是久长时，又岂在朝朝暮暮。',
    '在天愿作比翼鸟，在地愿为连理枝。',
    '身无彩凤双飞翼，心有灵犀一点通。',
    '曾经沧海难为水，除却巫山不是云。',
    '衣带渐宽终不悔，为伊消得人憔悴。',
    '愿得一心人，白头不相离。',
  ],
};

// --------------- 视觉提示词 ---------------
const VISUAL_PROMPTS = {
  happy: [
    'beautiful sunrise over mountains, golden light, vibrant colors, joyful atmosphere, tea garden',
    'cherry blossoms in full bloom, pink petals floating, warm sunlight, peaceful garden',
    'colorful hot air balloons over green meadow, blue sky, celebration, happiness',
  ],
  sad: [
    'rainy window with water drops, misty city view, melancholic blue tones, lonely atmosphere',
    'autumn leaves falling in empty park, foggy morning, solitude, nostalgic mood',
    'single candle in dark room, warm glow, contemplative mood, quiet evening',
  ],
  angry: [
    'dramatic thunderstorm over ocean, lightning bolts, powerful waves, intense atmosphere',
    'erupting volcano with fiery lava, dark sky, raw power, dramatic landscape',
    'fierce wind bending trees, dark clouds gathering, storm approaching, dramatic sky',
  ],
  peaceful: [
    'zen garden with raked sand patterns, bamboo, still water reflection, tranquil atmosphere',
    'misty mountain temple at dawn, tea ceremony setup, serene landscape, peaceful morning',
    'calm lake reflecting snow mountains, pine trees, morning mist, perfect stillness',
  ],
  anxious: [
    'winding path through dense fog, mysterious forest, uncertain journey, moody atmosphere',
    'abstract swirling patterns, deep blue and purple, turbulent waters, dreamlike quality',
    'maze-like city streets at twilight, neon reflections, urban solitude, contemplative mood',
  ],
  romantic: [
    'couple silhouette at sunset beach, warm golden light, romantic atmosphere, gentle waves',
    'moonlit garden with roses, fairy lights, romantic evening, dreamy atmosphere',
    'two cups of tea by window, rain outside, warm interior, intimate moment, cozy',
  ],
};

// --------------- 音频 URL 映射 ---------------
const AUDIO_URLS = {
  happy: [
    'https://cdn.pixabay.com/audio/2022/10/18/audio_5c496bba09.mp3',
    'https://cdn.pixabay.com/audio/2022/08/02/audio_884fe92c21.mp3',
    'https://cdn.pixabay.com/audio/2021/11/13/audio_cb4b537385.mp3',
  ],
  sad: [
    'https://cdn.pixabay.com/audio/2022/01/20/audio_d6a6f8d03a.mp3',
    'https://cdn.pixabay.com/audio/2022/09/15/audio_57e0341445.mp3',
    'https://cdn.pixabay.com/audio/2022/02/07/audio_0e0d3da849.mp3',
  ],
  angry: [
    'https://cdn.pixabay.com/audio/2022/10/09/audio_018aadf264.mp3',
    'https://cdn.pixabay.com/audio/2022/03/09/audio_c610d8e31e.mp3',
    'https://cdn.pixabay.com/audio/2021/08/04/audio_0625c1539c.mp3',
  ],
  peaceful: [
    'https://cdn.pixabay.com/audio/2022/08/31/audio_419263abb3.mp3',
    'https://cdn.pixabay.com/audio/2022/06/07/audio_b9bd4170e4.mp3',
    'https://cdn.pixabay.com/audio/2022/05/13/audio_257112549f.mp3',
  ],
  anxious: [
    'https://cdn.pixabay.com/audio/2022/03/10/audio_d65d387fa5.mp3',
    'https://cdn.pixabay.com/audio/2022/01/18/audio_d0a13f69d2.mp3',
    'https://cdn.pixabay.com/audio/2021/10/25/audio_3f8a5e611b.mp3',
  ],
  romantic: [
    'https://cdn.pixabay.com/audio/2022/11/09/audio_4fbc7b7ed1.mp3',
    'https://cdn.pixabay.com/audio/2022/02/22/audio_d1718ab41b.mp3',
    'https://cdn.pixabay.com/audio/2022/10/25/audio_3483e5cfc2.mp3',
  ],
};

// --------------- 动画配置 ---------------
const ANIMATION_CONFIGS = {
  happy: {
    type: 'particles',
    color: '#FFD700',
    background: 'linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 50%, #FFCC80 100%)',
    particleCount: 30,
    speed: 1.5,
    shape: 'star',
    description: '金色星光粒子飘散',
  },
  sad: {
    type: 'rain',
    color: '#5C6BC0',
    background: 'linear-gradient(135deg, #E8EAF6 0%, #C5CAE9 50%, #9FA8DA 100%)',
    particleCount: 50,
    speed: 0.8,
    shape: 'drop',
    description: '蓝色雨滴缓缓落下',
  },
  angry: {
    type: 'fire',
    color: '#F44336',
    background: 'linear-gradient(135deg, #FFEBEE 0%, #FFCDD2 50%, #EF9A9A 100%)',
    particleCount: 25,
    speed: 2.0,
    shape: 'flame',
    description: '红色火焰跳动',
  },
  peaceful: {
    type: 'float',
    color: '#66BB6A',
    background: 'linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 50%, #A5D6A7 100%)',
    particleCount: 15,
    speed: 0.5,
    shape: 'leaf',
    description: '绿色茶叶悠然飘落',
  },
  anxious: {
    type: 'wave',
    color: '#AB47BC',
    background: 'linear-gradient(135deg, #F3E5F5 0%, #E1BEE7 50%, #CE93D8 100%)',
    particleCount: 20,
    speed: 1.2,
    shape: 'spiral',
    description: '紫色漩涡缓缓旋转',
  },
  romantic: {
    type: 'hearts',
    color: '#EC407A',
    background: 'linear-gradient(135deg, #FCE4EC 0%, #F8BBD0 50%, #F48FB1 100%)',
    particleCount: 20,
    speed: 1.0,
    shape: 'heart',
    description: '粉色心形缓缓飘起',
  },
};

// --------------- 情绪标签（中文） ---------------
const EMOTION_LABELS = {
  happy: '喜悦',
  sad: '忧伤',
  angry: '愤怒',
  peaceful: '平和',
  anxious: '焦虑',
  romantic: '浪漫',
};

// =============== FreeAIService ===============

class FreeAIService {
  constructor() {
    this.hfToken = process.env.HF_TOKEN || '';
  }

  // ---------- 情绪分析 ----------

  analyzeEmotion(text) {
    if (!text || typeof text !== 'string') {
      return { emotion: 'peaceful', confidence: 0.5, label: '平和' };
    }

    const lower = text.toLowerCase();
    const scores = {};

    for (const [emotion, keywords] of Object.entries(EMOTION_KEYWORDS)) {
      let score = 0;
      const allKeywords = [...keywords.zh, ...keywords.en];

      for (const kw of allKeywords) {
        if (lower.includes(kw.toLowerCase())) {
          // 中文关键词权重更高
          score += keywords.zh.includes(kw) ? 2 : 1;
        }
      }
      scores[emotion] = score;
    }

    const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);

    if (totalScore === 0) {
      return { emotion: 'peaceful', confidence: 0.5, label: '平和' };
    }

    let topEmotion = 'peaceful';
    let topScore = 0;
    for (const [emotion, score] of Object.entries(scores)) {
      if (score > topScore) {
        topScore = score;
        topEmotion = emotion;
      }
    }

    const confidence = Math.min(0.95, 0.5 + (topScore / totalScore) * 0.45);

    return {
      emotion: topEmotion,
      confidence: Math.round(confidence * 100) / 100,
      label: EMOTION_LABELS[topEmotion],
      scores,
    };
  }

  // ---------- HuggingFace 情绪分析（可选） ----------

  async analyzeEmotionHF(text) {
    if (!this.hfToken) {
      return this.analyzeEmotion(text);
    }

    try {
      const response = await axios.post(
        'https://api-inference.huggingface.co/models/j-hartmann/emotion-english-distilroberta-base',
        { inputs: text },
        {
          headers: { Authorization: `Bearer ${this.hfToken}` },
          timeout: 10000,
        }
      );

      const results = response.data;
      if (!Array.isArray(results) || !Array.isArray(results[0])) {
        return this.analyzeEmotion(text);
      }

      const hfToLocal = {
        joy: 'happy',
        sadness: 'sad',
        anger: 'angry',
        fear: 'anxious',
        surprise: 'happy',
        disgust: 'angry',
        neutral: 'peaceful',
      };

      const top = results[0][0];
      const mapped = hfToLocal[top.label] || 'peaceful';

      return {
        emotion: mapped,
        confidence: Math.round(top.score * 100) / 100,
        label: EMOTION_LABELS[mapped],
        source: 'huggingface',
      };
    } catch (err) {
      console.warn('[FreeAI] HuggingFace API 调用失败，降级到本地分析:', err.message);
      return this.analyzeEmotion(text);
    }
  }

  // ---------- 图片生成 ----------

  async generateImageFree(prompt) {
    try {
      const encodedPrompt = encodeURIComponent(prompt);
      const seed = Math.floor(Math.random() * 100000);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=512&seed=${seed}&nologo=true`;

      // 验证 URL 可访问
      await axios.head(imageUrl, { timeout: 15000 });

      return { success: true, url: imageUrl };
    } catch (err) {
      console.warn('[FreeAI] Pollinations 图片生成失败:', err.message);
      return { success: false, url: '' };
    }
  }

  // ---------- 音频 URL ----------

  generateAudioFree(emotion) {
    const urls = AUDIO_URLS[emotion] || AUDIO_URLS.peaceful;
    const url = urls[Math.floor(Math.random() * urls.length)];
    return { success: true, url };
  }

  // ---------- 动画效果 ----------

  generateAnimationEffect(emotion) {
    return ANIMATION_CONFIGS[emotion] || ANIMATION_CONFIGS.peaceful;
  }

  // ---------- 诗句 ----------

  generatePoem(emotion) {
    const poems = POEMS[emotion] || POEMS.peaceful;
    return poems[Math.floor(Math.random() * poems.length)];
  }

  // ---------- 视觉提示词 ----------

  generateVisualPrompt(emotion) {
    const prompts = VISUAL_PROMPTS[emotion] || VISUAL_PROMPTS.peaceful;
    return prompts[Math.floor(Math.random() * prompts.length)];
  }

  // ---------- 完整生成流水线 ----------

  async generateCompleteResponse(userText) {
    // 1. 情绪分析
    const emotionResult = this.hfToken
      ? await this.analyzeEmotionHF(userText)
      : this.analyzeEmotion(userText);

    const { emotion } = emotionResult;

    // 2. 生成诗句
    const poem = this.generatePoem(emotion);

    // 3. 获取视觉提示词并生成图片
    const visualPrompt = this.generateVisualPrompt(emotion);
    const imageResult = await this.generateImageFree(visualPrompt);

    // 4. 获取音频
    const audioResult = this.generateAudioFree(emotion);

    // 5. 获取动画配置
    const animation = this.generateAnimationEffect(emotion);

    return {
      emotion: emotionResult,
      poem,
      image: imageResult,
      audio: audioResult,
      animation,
      visualPrompt,
      brand: '茶海心遇',
      generatedAt: new Date().toISOString(),
    };
  }
}

module.exports = new FreeAIService();
