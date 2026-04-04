/* ============================================
   茶海心遇 - TeaHaiXin PWA Application
   ============================================ */

(function () {
  'use strict';

  // ─── Constants ──────────────────────────────────
  const STORAGE_KEY = 'teahaixin_data';
  // API地址：优先使用localStorage中的自定义地址，否则使用HuggingFace Spaces后端
  const API_BASE = localStorage.getItem('teahaixin_api') || 'https://rao5201-teahaixin-api.hf.space';
  const EMOTIONS = {
    happy:    { label: '喜悦', emoji: '😊', color: '#FFD700', prompt: 'golden sunlight through cherry blossoms, warm happy scene, watercolor chinese painting' },
    sad:      { label: '忧伤', emoji: '😢', color: '#4A90E2', prompt: 'rain falling on lotus pond, melancholy blue tones, misty chinese ink painting' },
    angry:    { label: '愤怒', emoji: '😤', color: '#E74C3C', prompt: 'dramatic stormy red sky over mountains, fierce energy, bold chinese calligraphy art' },
    peaceful: { label: '平静', emoji: '😌', color: '#2ECC71', prompt: 'serene bamboo forest with morning mist, zen garden, peaceful chinese landscape painting' },
    anxious:  { label: '焦虑', emoji: '😰', color: '#95A5A6', prompt: 'tangled tree branches in grey fog, restless atmosphere, abstract chinese ink wash' },
    romantic: { label: '浪漫', emoji: '🥰', color: '#FF69B4', prompt: 'pink peach blossoms floating on moonlit water, romantic dreamy chinese painting' }
  };

  const POEMS = {
    happy: [
      '春风得意马蹄疾，\n一日看尽长安花。\n心随白云自在飞，\n茶香满盏笑颜开。',
      '日出东方金光照，\n万物欣然迎朝阳。\n一杯清茶映笑靥，\n人间值得细品尝。',
      '喜鹊枝头报好音，\n碧空如洗万里晴。\n且把欢喜入茶盏，\n与君共饮此刻心。',
      '繁花似锦满庭芳，\n清风拂面暖洋洋。\n手捧香茗轻浅笑，\n幸福原来在身旁。'
    ],
    sad: [
      '细雨湿衣看不见，\n闲花落地听无声。\n独坐茶亭思往事，\n一缕愁绪绕心生。',
      '秋风萧瑟叶飘零，\n月照空庭影独行。\n茶已凉透人未归，\n相思化作满天星。',
      '窗外梧桐细雨声，\n杯中明月照孤影。\n心事如茶沉且苦，\n待到天明方觉轻。',
      '落花有意水无情，\n独倚栏杆望远行。\n一盏苦茶千般味，\n道尽人间离别情。'
    ],
    angry: [
      '怒发冲冠凭栏处，\n潇潇雨歇抬望眼。\n且将烈火煮新茶，\n化作清风散九天。',
      '风卷残云雷声起，\n山河震动浪涛急。\n胸中块垒化茶烟，\n静待云开见月明。',
      '烈焰焚心难自抑，\n苍天不解意中急。\n一碗浓茶压怒火，\n风平浪静待可期。'
    ],
    peaceful: [
      '竹影横斜水清浅，\n茶烟袅袅入青山。\n无事此静坐也好，\n半日浮生半日闲。',
      '晨起无事挂心头，\n清风明月自悠悠。\n一壶好茶三两盏，\n人间至味是清欢。',
      '白云深处有人家，\n门前流水映落霞。\n闲煮岩泉烹新茗，\n不问世事只煎茶。',
      '山静日长仁者寿，\n松间明月石上泉。\n一盏清茶知冷暖，\n岁月从容自安然。'
    ],
    anxious: [
      '心似蛛网千丝绕，\n夜半辗转梦难安。\n且饮一杯定心茶，\n风雨之后见晴天。',
      '忧思如麻理还乱，\n前路迷蒙雾茫茫。\n静坐片刻品清茶，\n心安之处即故乡。',
      '万绪千头难理清，\n坐立不安夜未明。\n且把焦虑煮成茶，\n慢品方知味渐轻。'
    ],
    romantic: [
      '月上柳梢头，\n人约黄昏后。\n一盏相思茶，\n甜入心间久。',
      '春水初生春林初盛，\n春风十里不如你。\n愿以香茗为信物，\n此情绵绵无绝期。',
      '你是人间四月天，\n笑响点亮了四面风。\n轻灵在春的光艳中，\n你是一树一树的花开。',
      '相遇如茶初入水，\n沉浮之间渐生香。\n愿化清风伴你侧，\n从此春暖与花常。'
    ]
  };

  // Keywords for emotion detection
  const KEYWORDS = {
    happy: ['开心','快乐','高兴','幸福','喜','棒','好','美','笑','阳光','明媚','温暖','甜','爱','赞',
            'happy','joy','glad','great','good','love','wonderful','amazing','excited','beautiful',
            '太好了','耶','哈哈','完成','成功','达成','庆祝','感恩','满足','惊喜'],
    sad: ['难过','伤心','悲','哭','泪','思念','想念','离别','孤独','寂寞','失去','遗憾',
          'sad','cry','miss','lonely','lost','tears','sorrow','grief','heartbreak',
          '低落','沮丧','忧愁','惆怅','凄凉','落寞','心碎','无助'],
    angry: ['生气','愤怒','烦','恨','气','火','怒','讨厌','受够','不公','欺负',
            'angry','hate','mad','furious','annoyed','rage','irritated',
            '暴躁','恼火','气死','崩溃','混蛋','可恶','不满','委屈'],
    peaceful: ['平静','安宁','静','淡','闲','慢','舒适','放松','自在','安心','禅','冥想',
               'peace','calm','quiet','relax','serene','zen','gentle','still',
               '宁静','恬淡','悠然','从容','清净','安详','惬意','舒服'],
    anxious: ['焦虑','紧张','担心','害怕','恐惧','不安','压力','烦躁','忐忑','慌',
              'anxious','nervous','worry','fear','stress','panic','uneasy','tense',
              '失眠','迷茫','彷徨','困扰','无措','煎熬','惶恐'],
    romantic: ['爱','恋','喜欢','心动','浪漫','甜蜜','温柔','牵手','拥抱','亲','想你',
               'love','romantic','crush','heart','sweet','kiss','darling','adore',
               '怦然','暧昧','相思','眷恋','倾心','钟情','缘分','遇见']
  };

  const AUDIO_URLS = {
    happy: 'https://cdn.pixabay.com/audio/2022/10/18/audio_a12a067cfc.mp3',
    sad: 'https://cdn.pixabay.com/audio/2022/01/20/audio_d1718ab41b.mp3',
    angry: 'https://cdn.pixabay.com/audio/2021/08/08/audio_dc39537e1a.mp3',
    peaceful: 'https://cdn.pixabay.com/audio/2022/03/15/audio_115fe72651.mp3',
    anxious: 'https://cdn.pixabay.com/audio/2022/05/16/audio_4e2bfab09c.mp3',
    romantic: 'https://cdn.pixabay.com/audio/2022/08/31/audio_419263edd1.mp3'
  };

  const AUDIO_LABELS = {
    happy: '欢快旋律',
    sad: '淡淡忧伤',
    angry: '激昂乐章',
    peaceful: '自然宁静',
    anxious: '舒缓解压',
    romantic: '浪漫时光'
  };

  // ─── State ──────────────────────────────────
  let state = loadState();
  let currentResult = null;

  function defaultState() {
    return { username: '', password: '', token: '', history: [], joinDate: null, isRegistered: false };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? { ...defaultState(), ...JSON.parse(raw) } : defaultState();
    } catch { return defaultState(); }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  // ─── API helpers ──────────────────────────────
  async function apiCall(path, method = 'GET', body = null) {
    if (!API_BASE) return null;
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (state.token) opts.headers['Authorization'] = 'Bearer ' + state.token;
    if (body) opts.body = JSON.stringify(body);
    try {
      const res = await fetch(API_BASE + path, opts);
      return await res.json();
    } catch (e) {
      console.log('[API] 离线或服务不可用:', e.message);
      return null;
    }
  }

  // ─── Local user DB (fallback when no backend) ──
  const USERS_KEY = 'teahaixin_users';
  function getLocalUsers() {
    try { return JSON.parse(localStorage.getItem(USERS_KEY) || '{}'); } catch { return {}; }
  }
  function saveLocalUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }
  // Simple hash for local password storage (NOT cryptographically secure, just basic obfuscation)
  function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const c = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + c;
      hash |= 0;
    }
    return 'h_' + Math.abs(hash).toString(36);
  }

  // ─── DOM helpers ──────────────────────────────
  const $ = s => document.querySelector(s);
  const $$ = s => document.querySelectorAll(s);

  function showToast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2200);
  }

  function showConfirm(msg) {
    return new Promise(resolve => {
      const overlay = document.createElement('div');
      overlay.className = 'confirm-overlay';
      overlay.innerHTML = `
        <div class="confirm-dialog">
          <p>${msg}</p>
          <div class="confirm-actions">
            <button class="btn btn-ghost" data-action="cancel">取消</button>
            <button class="btn btn-primary btn-sm" data-action="ok">确定</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      overlay.addEventListener('click', e => {
        const action = e.target.dataset.action;
        if (action) { overlay.remove(); resolve(action === 'ok'); }
      });
    });
  }

  // ─── Navigation ──────────────────────────────
  function navigate(screen, pushState = true) {
    $$('.screen').forEach(s => s.classList.remove('active'));
    const el = $(`#screen-${screen}`);
    if (el) el.classList.add('active');

    // Nav visibility
    const showNav = ['home', 'history', 'profile', 'chat'].includes(screen);
    $('#bottom-nav').style.display = showNav ? 'flex' : 'none';

    // Nav active state
    $$('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.screen === screen));

    if (pushState) location.hash = screen;
    window.scrollTo(0, 0);

    // Screen-specific init
    if (screen === 'home') initHome();
    if (screen === 'history') renderHistory();
    if (screen === 'profile') renderProfile();
    if (screen === 'chat') loadContacts();
  }

  function handleHash() {
    const hash = location.hash.slice(1) || '';
    if (!hash || hash === 'welcome') {
      navigate(state.username ? 'home' : 'welcome', false);
    } else if (['home', 'history', 'profile', 'result', 'chat', 'chatroom'].includes(hash)) {
      if (!state.username && hash !== 'welcome') {
        navigate('welcome', false);
      } else {
        navigate(hash, false);
      }
    }
  }

  // ─── Welcome Screen ──────────────────────────
  function initWelcome() {
    const form = $('#welcome-form');
    const input = $('#username-input');
    const btnGuest = $('#btn-guest');

    // Add password field dynamically if not exists
    if (!$('#password-input')) {
      const pwGroup = document.createElement('div');
      pwGroup.className = 'input-group';
      pwGroup.innerHTML = `
        <input type="password" id="password-input" placeholder="设置密码（至少6位）" maxlength="30" autocomplete="off">
        <span class="input-hint">登录时需要密码验证</span>`;
      input.parentElement.after(pwGroup);

      // Toggle login/register
      const toggleDiv = document.createElement('div');
      toggleDiv.className = 'auth-toggle';
      toggleDiv.innerHTML = `<button type="button" id="btn-toggle-auth" class="btn-link">已有账号？点击登录</button>`;
      pwGroup.after(toggleDiv);

      let isRegister = true;
      $('#btn-toggle-auth').addEventListener('click', () => {
        isRegister = !isRegister;
        $('#btn-toggle-auth').textContent = isRegister ? '已有账号？点击登录' : '没有账号？点击注册';
        $('#btn-enter').querySelector('span').textContent = isRegister ? '注册并进入' : '登录';
        $('#password-input').placeholder = isRegister ? '设置密码（至少6位）' : '输入密码';
      });

      // Update submit button text
      $('#btn-enter').querySelector('span').textContent = '注册并进入';
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = input.value.trim();
      const pw = $('#password-input').value;
      const isRegister = $('#btn-enter').querySelector('span').textContent.includes('注册');

      if (!name) { showToast('请输入用户名'); input.focus(); return; }
      if (name.length < 2) { showToast('用户名至少2个字符'); return; }
      if (!pw) { showToast('请输入密码'); $('#password-input').focus(); return; }
      if (isRegister && pw.length < 6) { showToast('密码至少6位'); return; }

      // Try backend first
      if (API_BASE) {
        const endpoint = isRegister ? '/api/user/register' : '/api/user/login';
        const result = await apiCall(endpoint, 'POST', { username: name, password: pw });
        if (result && result.success) {
          state.username = result.data.user.username;
          state.token = result.data.token;
          state.isRegistered = true;
          if (!state.joinDate) state.joinDate = Date.now();
          saveState();
          showToast(isRegister ? '注册成功，欢迎！' : '登录成功！');
          navigate('home');
          return;
        } else if (result) {
          showToast(result.message || '操作失败');
          return;
        }
        // If API unreachable, fall through to local mode
      }

      // Local mode (no backend)
      const users = getLocalUsers();
      if (isRegister) {
        if (users[name]) { showToast('用户名已存在'); return; }
        users[name] = { password: simpleHash(pw), avatar: '🍵', joinDate: Date.now() };
        saveLocalUsers(users);
        state.username = name;
        state.isRegistered = true;
        if (!state.joinDate) state.joinDate = Date.now();
        saveState();
        showToast('注册成功，欢迎来到茶海心遇！');
        navigate('home');
      } else {
        if (!users[name]) { showToast('用户名不存在'); return; }
        if (users[name].password !== simpleHash(pw)) { showToast('密码错误'); return; }
        state.username = name;
        state.isRegistered = true;
        if (!state.joinDate) state.joinDate = users[name].joinDate || Date.now();
        saveState();
        showToast('登录成功！');
        navigate('home');
      }
    });

    btnGuest.addEventListener('click', () => {
      state.username = '茶友';
      state.isRegistered = false;
      if (!state.joinDate) state.joinDate = Date.now();
      saveState();
      navigate('home');
    });
  }

  // ─── Home Screen ──────────────────────────────
  function initHome() {
    const hour = new Date().getHours();
    let greeting;
    if (hour < 6) greeting = '夜深了';
    else if (hour < 9) greeting = '早安';
    else if (hour < 12) greeting = '上午好';
    else if (hour < 14) greeting = '中午好';
    else if (hour < 18) greeting = '下午好';
    else if (hour < 22) greeting = '晚上好';
    else greeting = '夜深了';

    $('#greeting-time').textContent = greeting;
    $('#greeting-name').textContent = state.username || '茶友';

    // Recent entries
    const recent = state.history.slice(0, 3);
    const recentSection = $('#home-recent');
    const recentList = $('#recent-list');
    if (recent.length > 0) {
      recentSection.style.display = 'block';
      recentList.innerHTML = recent.map(r => {
        const em = EMOTIONS[r.emotion] || EMOTIONS.peaceful;
        const d = new Date(r.timestamp);
        const dateStr = `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
        return `<div class="recent-card" data-id="${r.id}">
          <span class="recent-emoji">${em.emoji}</span>
          <div class="recent-info">
            <div class="recent-text">${escapeHtml(r.inputText)}</div>
            <div class="recent-date">${dateStr}</div>
          </div>
        </div>`;
      }).join('');
    } else {
      recentSection.style.display = 'none';
    }
  }

  function setupHome() {
    const textarea = $('#emotion-input');
    const counter = $('#char-count');
    const btnGenerate = $('#btn-generate');

    textarea.addEventListener('input', () => {
      const len = textarea.value.length;
      counter.textContent = len;
      btnGenerate.disabled = len === 0;
    });

    // Mood chips
    $('#mood-chips').addEventListener('click', e => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      textarea.value = chip.dataset.text;
      textarea.dispatchEvent(new Event('input'));
      textarea.focus();
    });

    // Generate
    btnGenerate.addEventListener('click', () => {
      const text = textarea.value.trim();
      if (!text) return;
      generateResult(text);
    });

    // Recent card click
    $('#recent-list').addEventListener('click', e => {
      const card = e.target.closest('.recent-card');
      if (!card) return;
      const record = state.history.find(r => r.id === card.dataset.id);
      if (record) {
        currentResult = record;
        showResult(record);
        navigate('result');
      }
    });
  }

  // ─── Emotion Analysis ──────────────────────────
  function analyzeEmotion(text) {
    const lower = text.toLowerCase();
    const scores = {};
    for (const [emotion, keywords] of Object.entries(KEYWORDS)) {
      scores[emotion] = 0;
      for (const kw of keywords) {
        if (lower.includes(kw.toLowerCase())) {
          scores[emotion] += kw.length; // longer match = stronger signal
        }
      }
    }
    const max = Math.max(...Object.values(scores));
    if (max === 0) return 'peaceful'; // default
    const top = Object.entries(scores).filter(([, v]) => v === max);
    return top[Math.floor(Math.random() * top.length)][0];
  }

  // ─── Result Generation ──────────────────────────
  async function generateResult(text) {
    const btn = $('#btn-generate');
    btn.classList.add('loading');
    btn.disabled = true;

    let emotion, poem, imageUrl, audioUrl;

    // Try backend API first
    if (API_BASE) {
      const apiResult = await apiCall('/api/generate', 'POST', { text });
      if (apiResult && apiResult.success) {
        const d = apiResult.data;
        emotion = d.emotion;
        poem = d.poemText || d.poem_text || '';
        imageUrl = d.imageUrl || d.image_url || '';
        audioUrl = d.audioUrl || d.audio_url || '';
      }
    }

    // Fallback to local generation
    if (!emotion) {
      emotion = analyzeEmotion(text);
      const em = EMOTIONS[emotion];
      const poems = POEMS[emotion];
      poem = poems[Math.floor(Math.random() * poems.length)];
      const imagePrompt = `${em.prompt}, tea ceremony, emotional, artistic, high quality`;
      imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt)}?width=512&height=512&nologo=true&seed=${Date.now()}`;
      audioUrl = AUDIO_URLS[emotion] || '';
    }

    const result = {
      id: 'r_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      timestamp: Date.now(),
      inputText: text,
      emotion: emotion,
      poemText: poem,
      imageUrl: imageUrl,
      audioUrl: AUDIO_URLS[emotion] || ''
    };

    currentResult = result;
    showResult(result);
    navigate('result');

    btn.classList.remove('loading');
    btn.disabled = false;
  }

  function showResult(result) {
    const em = EMOTIONS[result.emotion];

    // Image
    const imgWrapper = $('.result-image-wrapper');
    const img = $('#result-image');
    imgWrapper.classList.add('loading');
    img.src = '';
    img.onload = () => imgWrapper.classList.remove('loading');
    img.onerror = () => {
      imgWrapper.classList.remove('loading');
      img.src = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect fill="#1a1a2e" width="512" height="512"/><text x="256" y="240" text-anchor="middle" font-size="64" fill="${em.color}">${em.emoji}</text><text x="256" y="310" text-anchor="middle" font-size="24" fill="#8a82b0" font-family="sans-serif">画作加载中...</text></svg>`)}`;
    };
    img.src = result.imageUrl;

    // Badge
    $('#result-badge').textContent = `${em.emoji} ${em.label}`;
    $('#result-badge').style.color = em.color;

    // Poem
    $('#result-poem').textContent = result.poemText;

    // Input echo
    $('#result-input-text').textContent = result.inputText;

    // Audio
    const audioSection = $('#result-audio-section');
    const audio = $('#result-audio');
    if (result.audioUrl) {
      audioSection.style.display = 'block';
      $('#audio-label').textContent = AUDIO_LABELS[result.emotion] || '氛围音乐';
      audio.src = result.audioUrl;
    } else {
      audioSection.style.display = 'none';
    }

    // Update save button state
    const saved = state.history.some(h => h.id === result.id);
    $('#btn-save-result').textContent = saved ? '✓ 已收藏' : '收藏心语';
    $('#btn-save-result').disabled = saved;
  }

  function setupResult() {
    $('#btn-back-result').addEventListener('click', () => {
      const audio = $('#result-audio');
      audio.pause();
      audio.currentTime = 0;
      navigate('home');
    });

    $('#btn-save-result').addEventListener('click', () => {
      if (!currentResult) return;
      if (!state.history.some(h => h.id === currentResult.id)) {
        state.history.unshift(currentResult);
        saveState();
        // Also save to backend if connected
        if (API_BASE && state.token) {
          apiCall('/api/generate/save', 'POST', {
            text: currentResult.inputText,
            emotion: currentResult.emotion,
            image_url: currentResult.imageUrl,
            audio_url: currentResult.audioUrl,
            poem_text: currentResult.poemText,
          });
        }
        showToast('已收藏到心语历程');
        $('#btn-save-result').textContent = '✓ 已收藏';
        $('#btn-save-result').disabled = true;
      }
    });

    $('#btn-share-result').addEventListener('click', async () => {
      if (!currentResult) return;
      const em = EMOTIONS[currentResult.emotion];
      const shareData = {
        title: '茶海心遇 - 心语',
        text: `${em.emoji} ${em.label}\n\n${currentResult.poemText}\n\n— 茶海心遇 · 以茶会心，遇见情绪`
      };
      if (navigator.share) {
        try { await navigator.share(shareData); } catch {}
      } else {
        try {
          await navigator.clipboard.writeText(shareData.text);
          showToast('已复制到剪贴板');
        } catch {
          showToast('分享功能不可用');
        }
      }
    });

    $('#btn-another').addEventListener('click', () => {
      const audio = $('#result-audio');
      audio.pause();
      audio.currentTime = 0;
      $('#emotion-input').value = '';
      $('#char-count').textContent = '0';
      $('#btn-generate').disabled = true;
      navigate('home');
    });
  }

  // ─── History Screen ──────────────────────────
  function renderHistory() {
    const list = $('#history-list');
    const empty = $('#history-empty');

    if (state.history.length === 0) {
      list.style.display = 'none';
      empty.style.display = 'block';
      return;
    }

    empty.style.display = 'none';
    list.style.display = 'flex';
    list.innerHTML = state.history.map((r, i) => {
      const em = EMOTIONS[r.emotion] || EMOTIONS.peaceful;
      const d = new Date(r.timestamp);
      const dateStr = `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
      const excerpt = r.poemText.replace(/\n/g, ' ').slice(0, 60);
      return `<div class="history-card" data-id="${r.id}" style="animation-delay:${i * 0.05}s">
        <img class="history-thumb" src="${r.imageUrl}" alt="" loading="lazy"
             onerror="this.src='data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'><rect fill='%231a1a2e' width='64' height='64'/><text x='32' y='38' text-anchor='middle' font-size='24'>${em.emoji}</text></svg>`)}'">
        <div class="history-body">
          <div class="history-meta">
            <span class="history-emotion-tag" style="background:${em.color}22;color:${em.color}">${em.emoji} ${em.label}</span>
            <span class="history-date">${dateStr}</span>
          </div>
          <div class="history-excerpt">${escapeHtml(excerpt)}</div>
        </div>
      </div>`;
    }).join('');
  }

  function setupHistory() {
    $('#history-list').addEventListener('click', e => {
      const card = e.target.closest('.history-card');
      if (!card) return;
      const record = state.history.find(r => r.id === card.dataset.id);
      if (record) {
        currentResult = record;
        showResult(record);
        navigate('result');
      }
    });

    $('#btn-clear-history').addEventListener('click', async () => {
      if (state.history.length === 0) { showToast('暂无历史记录'); return; }
      const ok = await showConfirm('确定清除所有心语记录吗？<br>此操作无法撤销。');
      if (ok) {
        state.history = [];
        saveState();
        renderHistory();
        showToast('历史记录已清除');
      }
    });

    $('#btn-first-entry').addEventListener('click', () => navigate('home'));
  }

  // ─── Profile Screen ──────────────────────────
  function renderProfile() {
    $('#profile-name').textContent = state.username || '茶友';
    if (state.joinDate) {
      const d = new Date(state.joinDate);
      $('#profile-joined').textContent = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日加入`;
    }

    const total = state.history.length;
    $('#stat-total').textContent = total;

    // Most frequent emotion
    if (total > 0) {
      const counts = {};
      for (const r of state.history) {
        counts[r.emotion] = (counts[r.emotion] || 0) + 1;
      }
      const topEmotion = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
      const em = EMOTIONS[topEmotion];
      $('#stat-frequent').textContent = em.emoji + em.label;

      // Streak
      const days = new Set(state.history.map(r => new Date(r.timestamp).toDateString()));
      let streak = 0;
      const today = new Date();
      for (let i = 0; i < 365; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        if (days.has(d.toDateString())) streak++;
        else break;
      }
      $('#stat-streak').textContent = streak;

      // Chart
      renderEmotionChart(counts, total);
    } else {
      $('#stat-frequent').textContent = '-';
      $('#stat-streak').textContent = '0';
      $('#emotion-chart').innerHTML = '<p style="font-size:0.85rem;color:var(--text-muted);text-align:center;padding:20px 0;">记录心语后查看情绪统计</p>';
    }
  }

  function renderEmotionChart(counts, total) {
    const chart = $('#emotion-chart');
    const maxCount = Math.max(...Object.values(counts), 1);
    chart.innerHTML = Object.entries(EMOTIONS).map(([key, em]) => {
      const count = counts[key] || 0;
      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
      const barWidth = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
      return `<div class="chart-row">
        <span class="chart-label">${em.emoji} ${em.label}</span>
        <div class="chart-bar-bg">
          <div class="chart-bar" style="width:${barWidth}%;background:${em.color};"></div>
        </div>
        <span class="chart-count">${count}</span>
      </div>`;
    }).join('');
  }

  function setupProfile() {
    $('#btn-logout').addEventListener('click', async () => {
      const ok = await showConfirm('退出后将清除所有数据，确定吗？');
      if (ok) {
        localStorage.removeItem(STORAGE_KEY);
        state = defaultState();
        currentResult = null;
        navigate('welcome');
      }
    });
  }

  // ─── Bottom Nav ──────────────────────────────
  function setupNav() {
    $$('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const screen = item.dataset.screen;
        if (screen) navigate(screen);
      });
    });
  }

  // ─── Chat System ──────────────────────────────
  let currentChat = null; // { id, username, avatar, displayName }
  let chatPolling = null;

  async function loadContacts() {
    if (!state.token) {
      $('#chat-contacts').innerHTML = '<div class="empty-state"><div class="empty-icon">🔒</div><p class="empty-title">请先登录</p><p class="empty-desc">注册或登录后即可与AI茶友聊天</p></div>';
      return;
    }
    const result = await apiCall('/api/chat/contacts');
    if (!result || !result.success) {
      $('#chat-contacts').innerHTML = '<div class="empty-state"><div class="empty-icon">🍵</div><p class="empty-title">暂无茶友</p></div>';
      return;
    }
    const contacts = result.data.contacts;
    if (contacts.length === 0) {
      $('#chat-contacts-empty').style.display = 'block';
      $('#chat-contacts').style.display = 'none';
      return;
    }
    $('#chat-contacts-empty').style.display = 'none';
    $('#chat-contacts').style.display = 'flex';
    $('#chat-contacts').innerHTML = contacts.map(c => {
      const unread = c.unread > 0 ? `<span class="contact-unread">${c.unread > 99 ? '99+' : c.unread}</span>` : '';
      const lastMsg = c.last_message ? escapeHtml(c.last_message).slice(0, 30) : c.bio || '点击开始聊天';
      const timeStr = c.last_time ? formatChatTime(c.last_time) : '';
      return `<div class="contact-card" data-id="${c.id}" data-name="${escapeHtml(c.displayName)}" data-avatar="${c.avatar || '🍵'}">
        <div class="contact-avatar">${c.avatar || '🍵'}</div>
        <div class="contact-body">
          <div class="contact-top">
            <span class="contact-name">${escapeHtml(c.displayName)}</span>
            <span class="contact-time">${timeStr}</span>
          </div>
          <div class="contact-bottom">
            <span class="contact-last">${lastMsg}</span>
            ${unread}
          </div>
        </div>
      </div>`;
    }).join('');
  }

  function formatChatTime(str) {
    const d = new Date(str.replace(' ', 'T'));
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
    if (diff < 86400000) return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }

  async function openChat(contactId, name, avatar) {
    currentChat = { id: contactId, displayName: name, avatar: avatar };
    $('#chatroom-name').textContent = name;
    $('#chatroom-avatar').textContent = avatar;
    $('#chatroom-status').textContent = '在线';
    $('#chatroom-messages').innerHTML = '<div class="chat-loading">加载中...</div>';
    navigate('chatroom');

    const result = await apiCall(`/api/chat/messages/${contactId}`);
    if (result && result.success) {
      renderMessages(result.data.messages);
    } else {
      $('#chatroom-messages').innerHTML = '<div class="chat-welcome"><p>开始与 ' + escapeHtml(name) + ' 聊天吧 🍵</p></div>';
    }

    // Start polling for new messages
    stopChatPolling();
    chatPolling = setInterval(() => pollNewMessages(), 3000);
  }

  function renderMessages(messages) {
    const container = $('#chatroom-messages');
    if (!messages || messages.length === 0) {
      container.innerHTML = '<div class="chat-welcome"><p>开始聊天吧 🍵</p></div>';
      return;
    }
    container.innerHTML = messages.map(m => {
      const cls = m.is_mine ? 'msg-mine' : 'msg-other';
      const time = formatChatTime(m.created_at);
      return `<div class="chat-msg ${cls}">
        ${!m.is_mine ? `<span class="msg-avatar">${currentChat.avatar}</span>` : ''}
        <div class="msg-bubble">
          <div class="msg-text">${escapeHtml(m.content)}</div>
          <div class="msg-time">${time}</div>
        </div>
      </div>`;
    }).join('');
    container.scrollTop = container.scrollHeight;
  }

  function appendMessage(msg) {
    const container = $('#chatroom-messages');
    // Remove welcome message if exists
    const welcome = container.querySelector('.chat-welcome, .chat-loading');
    if (welcome) welcome.remove();

    const cls = msg.is_mine ? 'msg-mine' : 'msg-other';
    const time = formatChatTime(msg.created_at || new Date().toISOString());
    const div = document.createElement('div');
    div.className = `chat-msg ${cls}`;
    div.dataset.id = msg.id || '';
    div.innerHTML = `
      ${!msg.is_mine ? `<span class="msg-avatar">${currentChat.avatar}</span>` : ''}
      <div class="msg-bubble">
        <div class="msg-text">${escapeHtml(msg.content)}</div>
        <div class="msg-time">${time}</div>
      </div>`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  let lastMsgId = 0;
  async function pollNewMessages() {
    if (!currentChat) return;
    const result = await apiCall(`/api/chat/messages/${currentChat.id}?limit=5`);
    if (result && result.success && result.data.messages.length > 0) {
      const msgs = result.data.messages;
      const newMsgs = msgs.filter(m => m.id > lastMsgId && !m.is_mine);
      if (newMsgs.length > 0) {
        newMsgs.forEach(m => {
          if (!document.querySelector(`.chat-msg[data-id="${m.id}"]`)) {
            appendMessage(m);
          }
        });
        lastMsgId = Math.max(...msgs.map(m => m.id));
        $('#chatroom-typing').style.display = 'none';
      }
    }
  }

  function stopChatPolling() {
    if (chatPolling) { clearInterval(chatPolling); chatPolling = null; }
  }

  async function sendMessage() {
    const input = $('#chat-input');
    const text = input.value.trim();
    if (!text || !currentChat) return;

    input.value = '';
    input.style.height = 'auto';
    $('#btn-chat-send').disabled = true;

    // Show user message immediately
    appendMessage({ content: text, is_mine: 1, created_at: new Date().toISOString() });

    // Show typing indicator
    setTimeout(() => {
      $('#chatroom-typing').style.display = 'flex';
    }, 500);

    const result = await apiCall('/api/chat/send', 'POST', {
      to_user_id: currentChat.id,
      content: text
    });

    if (result && result.success && result.data.message) {
      lastMsgId = Math.max(lastMsgId, result.data.message.id || 0);
    }
  }

  function setupChat() {
    // Contact list click
    $('#chat-contacts').addEventListener('click', e => {
      const card = e.target.closest('.contact-card');
      if (!card) return;
      const id = parseInt(card.dataset.id);
      const name = card.dataset.name;
      const avatar = card.dataset.avatar;
      lastMsgId = 0;
      openChat(id, name, avatar);
    });

    // Back button
    $('#btn-back-chat').addEventListener('click', () => {
      stopChatPolling();
      currentChat = null;
      navigate('chat');
    });

    // Send button
    $('#btn-chat-send').addEventListener('click', sendMessage);

    // Chat input
    const chatInput = $('#chat-input');
    chatInput.addEventListener('input', () => {
      $('#btn-chat-send').disabled = chatInput.value.trim().length === 0;
      // Auto-resize
      chatInput.style.height = 'auto';
      chatInput.style.height = Math.min(chatInput.scrollHeight, 100) + 'px';
    });
    chatInput.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    // Search
    let searchTimer;
    $('#chat-search').addEventListener('input', e => {
      clearTimeout(searchTimer);
      const q = e.target.value.trim();
      if (!q) { loadContacts(); return; }
      searchTimer = setTimeout(async () => {
        const result = await apiCall(`/api/chat/search?q=${encodeURIComponent(q)}`);
        if (result && result.success) {
          const users = result.data.users;
          $('#chat-contacts').innerHTML = users.map(u => `
            <div class="contact-card" data-id="${u.id}" data-name="${escapeHtml(u.displayName)}" data-avatar="${u.avatar || '🍵'}">
              <div class="contact-avatar">${u.avatar || '🍵'}</div>
              <div class="contact-body">
                <div class="contact-top"><span class="contact-name">${escapeHtml(u.displayName)}</span></div>
                <div class="contact-bottom"><span class="contact-last">点击开始聊天</span></div>
              </div>
            </div>`).join('') || '<div class="empty-state"><p>未找到茶友</p></div>';
        }
      }, 300);
    });
  }

  // ─── Utilities ──────────────────────────────
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ─── PWA / Service Worker ──────────────────────
  function registerSW() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
  }

  // Install prompt
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    // Could show a custom install button here
  });

  // ─── Init ──────────────────────────────────
  function init() {
    registerSW();
    initWelcome();
    setupHome();
    setupResult();
    setupHistory();
    setupProfile();
    setupChat();
    setupNav();
    handleHash();
    window.addEventListener('hashchange', handleHash);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
