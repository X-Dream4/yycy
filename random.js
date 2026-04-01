const { createApp, ref, computed, onMounted, nextTick } = Vue;

createApp({
  setup() {

    const appReady = ref(false);
    const mainTab = ref('discover');
    const apiConfig = ref({ url: '', key: '', model: '' });

    let lucideTimer = null;
    const refreshIcons = () => { clearTimeout(lucideTimer); lucideTimer = setTimeout(() => { lucide.createIcons(); setTimeout(() => lucide.createIcons(), 200); }, 50); };

    const goBack = () => { window.location.href = 'chat.html'; };

    // ===== 次元类型 =====
    const typeOptions = ref([
      { name: '现代都市', prompt: '', isBuiltin: true },
      { name: '古代架空', prompt: '', isBuiltin: true },
      { name: '魔法奇幻', prompt: '', isBuiltin: true },
      { name: '末世',     prompt: '', isBuiltin: true },
      { name: '星际',     prompt: '', isBuiltin: true },
      { name: '修仙',     prompt: '', isBuiltin: true },
      { name: '游戏穿越', prompt: '', isBuiltin: true },
      { name: '兽世',     prompt: '', isBuiltin: true },
      { name: 'ABO',      prompt: '', isBuiltin: true },
      { name: '无限流',   prompt: '', isBuiltin: true },
      { name: '其他',     prompt: '', isBuiltin: true },
    ]);

    // ===== 性格风格 =====
    const styleOptions = ref([
      { name: '随机', isBuiltin: true },
      { name: '偏甜', isBuiltin: true },
      { name: '傲娇', isBuiltin: true },
      { name: '偏冷', isBuiltin: true },
      { name: '腹黑', isBuiltin: true },
      { name: '温柔', isBuiltin: true },
      { name: '病娇', isBuiltin: true },
      { name: '元气', isBuiltin: true },
    ]);

    const dicebearStyles = [
      { label: '卡通人物', value: 'avataaars' },
      { label: '可爱风',   value: 'big-ears' },
      { label: '插画风',   value: 'lorelei' },
      { label: '冒险者',   value: 'adventurer' },
      { label: '拟人风',   value: 'personas' },
    ];

    // ===== 自定义输入框状态 =====
    const newTypeName = ref('');
    const newStyleName = ref('');
    const expandedTypePrompts = ref({});

    const addCustomType = () => {
      const name = newTypeName.value.trim();
      if (!name) return;
      if (typeOptions.value.some(t => t.name === name)) { alert('该类型已存在'); return; }
      typeOptions.value.push({ name, prompt: '', isBuiltin: false });
      newTypeName.value = '';
    };

    const removeCustomType = (name) => {
      typeOptions.value = typeOptions.value.filter(t => t.name !== name);
      settingsForm.value.typePrefs = settingsForm.value.typePrefs.filter(n => n !== name);
      if (settingsForm.value.defaultFilter === name) settingsForm.value.defaultFilter = '全部';
    };

    const addCustomStyle = () => {
      const name = newStyleName.value.trim();
      if (!name) return;
      if (styleOptions.value.some(s => s.name === name)) { alert('该风格已存在'); return; }
      styleOptions.value.push({ name, isBuiltin: false });
      newStyleName.value = '';
    };

    const removeCustomStyle = (name) => {
      styleOptions.value = styleOptions.value.filter(s => s.name !== name);
      settingsForm.value.stylePrefs = settingsForm.value.stylePrefs.filter(n => n !== name);
    };

    const toggleTypePrompt = (name) => {
      expandedTypePrompts.value[name] = !expandedTypePrompts.value[name];
      nextTick(() => refreshIcons());
    };

    // ===== 默认 Prompt 模板 =====
    const DEFAULT_PROMPT = `请生成 {{count}} 个用于跨次元交友的角色卡。
{{types}}
{{style}}
{{worldTemplate}}
{{personaTemplate}}
{{extra}}
{{imagePromptTemplate}}

每个角色必须包含以下字段：
- name：角色名（2-4个字，有特色）
- world：世界观背景（80字以内，简洁有画面感）
- persona：性格人设（80字以内，突出个性）
- type：次元类型（从以下选项选一个：{{typeNames}}）
- tags：性格标签（2到4个词的数组，如["傲娇","腹黑"]）
- imagePrompt：生图提示词（英文，如无需求可省略此字段）

请只返回 JSON 数组，不要有其他任何文字，格式：
[{"name":"","world":"","persona":"","type":"","tags":[],"imagePrompt":""}]`;

    // ===== 设置 =====
    const settingsShow = ref(false);
    const settings = ref({
      avatarMode: 'gradient',
      dicebearStyle: 'lorelei',
      pollinationsPromptTemplate: 'portrait of {{name}}, {{type}} style, anime, soft lighting, detailed face',
      customImgUrl: '',
      customImgKey: '',
      customImgModel: 'dall-e-3',
      customImgPromptTemplate: 'portrait of {{name}}, {{type}} style, anime, soft lighting',
      typePrefs: [],
      genCount: 4,
      stylePrefs: ['随机'],
      worldTemplate: '',
      personaTemplate: '',
      extraPrompt: '',
      imagePromptTemplate: '请同时用英文输出适合该角色的生图提示词，二次元动漫风格，包含外貌特征、发色、服装，不超过80词，放在 imagePrompt 字段里。',
      useCustomPrompt: false,
      customPrompt: DEFAULT_PROMPT,
      showTypeBadge: true,
      showTags: true,
      defaultFilter: '全部',
      featuredCount: 5,
      typeOptions: [],
      styleOptions: [],
    });

    const settingsForm = ref(JSON.parse(JSON.stringify(settings.value)));

    const openSettings = () => {
      settingsForm.value = JSON.parse(JSON.stringify(settings.value));
      if (settingsForm.value.typeOptions && settingsForm.value.typeOptions.length) {
        typeOptions.value = settingsForm.value.typeOptions;
      }
      if (settingsForm.value.styleOptions && settingsForm.value.styleOptions.length) {
        styleOptions.value = settingsForm.value.styleOptions;
      }
      expandedTypePrompts.value = {};
      settingsShow.value = true;
      nextTick(() => refreshIcons());
    };

    const saveSettings = async () => {
      settingsForm.value.typeOptions = JSON.parse(JSON.stringify(typeOptions.value));
      settingsForm.value.styleOptions = JSON.parse(JSON.stringify(styleOptions.value));
      settings.value = JSON.parse(JSON.stringify(settingsForm.value));
      activeFilter.value = settings.value.defaultFilter;
      await dbSet('randomSettings', JSON.parse(JSON.stringify(settings.value)));
      settingsShow.value = false;
    };

    const resetCustomPrompt = () => { settingsForm.value.customPrompt = DEFAULT_PROMPT; };

    const toggleTypePref = (name) => {
      const idx = settingsForm.value.typePrefs.indexOf(name);
      if (idx === -1) settingsForm.value.typePrefs.push(name);
      else settingsForm.value.typePrefs.splice(idx, 1);
    };

    const toggleStylePref = (name) => {
      const idx = settingsForm.value.stylePrefs.indexOf(name);
      if (idx === -1) settingsForm.value.stylePrefs.push(name);
      else settingsForm.value.stylePrefs.splice(idx, 1);
    };

    // ===== 已连接角色 =====
    const randomCharList = ref([]);

    const isConnected = (id) => randomCharList.value.some(c => c.id === id);

    const connectChar = async (char) => {
      if (isConnected(char.id)) return;
      const newChar = {
        id: char.id || Date.now(),
        name: char.name,
        world: char.world || '',
        persona: char.persona || '',
        avatar: char.avatar || '',
        lastMsg: '',
        messages: [],
        source: 'random',
        type: char.type || '',
        tags: char.tags || [],
        imagePrompt: char.imagePrompt || '',
      };
      randomCharList.value.push(newChar);
      await dbSet('randomCharList', JSON.parse(JSON.stringify(randomCharList.value)));
      tempChars.value = tempChars.value.filter(c => c.id !== char.id);
      await dbSet('randomTempChars', JSON.parse(JSON.stringify(tempChars.value)));
      if (currentCard.value && currentCard.value.id === char.id) advanceCard();
      detailChar.value = null;
    };

    // ===== 临时角色池 =====
    const tempChars = ref([]);
    const skippedIds = ref(new Set());

    // ===== 卡片池 =====
    const cardPool = ref([]);
    const cardLoading = ref(false);
    const flyLeft = ref(false);
    const flyRight = ref(false);
    const cardFlipped = ref(false);

    const currentCard = computed(() => cardPool.value[0] || null);

    const buildCardPool = () => {
      const skipped = skippedIds.value;
      const connected = new Set(randomCharList.value.map(c => c.id));
      cardPool.value = tempChars.value.filter(c => !skipped.has(c.id) && !connected.has(c.id));
    };

    const advanceCard = () => {
      cardFlipped.value = false;
      cardPool.value.shift();
    };

    const doSkip = async () => {
      if (!currentCard.value || cardLoading.value) return;
      const id = currentCard.value.id;
      flyLeft.value = true;
      await new Promise(r => setTimeout(r, 360));
      flyLeft.value = false;
      cardFlipped.value = false;
      skippedIds.value.add(id);
      await dbSet('randomSkippedIds', [...skippedIds.value]);
      advanceCard();
    };

    const doConnect = async () => {
      if (!currentCard.value || cardLoading.value) return;
      const char = currentCard.value;
      flyRight.value = true;
      await new Promise(r => setTimeout(r, 360));
      flyRight.value = false;
      await connectChar(char);
    };

    // ===== 拖拽与点击区分 =====
    const isDragging = ref(false);
    const dragX = ref(0);
    const dragDir = ref('');
    let startX = 0;
    let startY = 0;
    let hasMoved = false;

    const cardDragStyle = computed(() => {
      if (!isDragging.value) return {};
      const rotate = dragX.value * 0.06;
      return { transform: `translateX(${dragX.value}px) rotate(${rotate}deg)` };
    });

    // 点击翻转（仅有图模式且未拖拽时触发）
    const onCardClick = () => {
      if (hasMoved) return;
      if (settings.value.avatarMode === 'none') return;
      cardFlipped.value = !cardFlipped.value;
    };

    const onCardMouseDown = (e) => {
      startX = e.clientX;
      startY = e.clientY;
      hasMoved = false;
      isDragging.value = false;
      dragX.value = 0;
      dragDir.value = '';
      const onMove = (e) => {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        if (!hasMoved && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
          hasMoved = true;
          isDragging.value = true;
        }
        if (isDragging.value) {
          dragX.value = dx;
          dragDir.value = dx > 40 ? 'right' : dx < -40 ? 'left' : '';
        }
      };
      const onUp = async () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        if (!isDragging.value) return;
        isDragging.value = false;
        const dx = dragX.value;
        dragX.value = 0;
        dragDir.value = '';
        if (dx > 80) await doConnect();
        else if (dx < -80) await doSkip();
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    };

    const onCardTouchStart = (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      hasMoved = false;
      isDragging.value = false;
      dragX.value = 0;
      dragDir.value = '';
    };

    const onCardTouchMove = (e) => {
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;
      if (!hasMoved && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
        hasMoved = true;
        isDragging.value = true;
      }
      if (isDragging.value) {
        dragX.value = dx;
        dragDir.value = dx > 40 ? 'right' : dx < -40 ? 'left' : '';
      }
    };

    const onCardTouchEnd = async () => {
      if (!isDragging.value) return;
      isDragging.value = false;
      const dx = dragX.value;
      dragX.value = 0;
      dragDir.value = '';
      if (dx > 80) await doConnect();
      else if (dx < -80) await doSkip();
    };

    // ===== 头像生成 =====
    const buildAvatarUrl = (char) => {
      const mode = settings.value.avatarMode;
      if (mode === 'none' || mode === 'gradient' || mode === 'manual') return '';

      if (mode === 'dicebear') {
        const style = settings.value.dicebearStyle || 'lorelei';
        return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(char.name)}`;
      }

      const buildPrompt = (template, c) => template
        .replace(/\{\{name\}\}/g, c.name)
        .replace(/\{\{type\}\}/g, c.type || '')
        .replace(/\{\{tags\}\}/g, (c.tags || []).join(', '))
        .replace(/\{\{imagePrompt\}\}/g, c.imagePrompt || '');

      if (mode === 'pollinations') {
        const tmpl = settings.value.pollinationsPromptTemplate || 'portrait of {{name}}, {{type}} style, anime, soft lighting';
        const prompt = buildPrompt(tmpl, char);
        return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=400&height=400&nologo=true&seed=${char.id % 9999}`;
      }

      return '';
    };

    const generateAvatarForChar = async (char) => {
      const url = buildAvatarUrl(char);
      if (!url) return;

      if (settings.value.avatarMode === 'custom') {
        const cfg = settings.value;
        if (!cfg.customImgUrl || !cfg.customImgKey) return;
        const tmpl = cfg.customImgPromptTemplate || 'portrait of {{name}}, {{type}} style, anime';
        const prompt = tmpl
          .replace(/\{\{name\}\}/g, char.name)
          .replace(/\{\{type\}\}/g, char.type || '')
          .replace(/\{\{tags\}\}/g, (char.tags || []).join(', '))
          .replace(/\{\{imagePrompt\}\}/g, char.imagePrompt || '');
        try {
          const res = await fetch(`${cfg.customImgUrl.replace(/\/$/, '')}/images/generations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.customImgKey}` },
            body: JSON.stringify({ model: cfg.customImgModel || 'dall-e-3', prompt, n: 1, size: '512x512' })
          });
          const data = await res.json();
          const imgUrl = data.data?.[0]?.url || '';
          if (imgUrl) char.avatar = imgUrl;
        } catch (e) { /* 生成失败静默处理，保留渐变色占位 */ }
        return;
      }

      // dicebear 和 pollinations 直接用 URL，浏览器懒加载
      char.avatar = url;
    };

    // ===== AI 生成角色 =====
    const gridLoading = ref(false);

    const buildPrompt = (count) => {
      const typeNames = typeOptions.value.map(t => t.name).join('、');

      if (settings.value.useCustomPrompt) {
        const typeStr = settings.value.typePrefs.length
          ? `次元类型偏好：${settings.value.typePrefs.join('、')}`
          : '次元类型：随机';
        const styleStr = settings.value.stylePrefs.length && !settings.value.stylePrefs.includes('随机')
          ? `性格风格偏向：${settings.value.stylePrefs.join('、')}`
          : '';
        return settings.value.customPrompt
          .replace('{{count}}', count)
          .replace('{{types}}', typeStr)
          .replace('{{style}}', styleStr)
          .replace('{{typeNames}}', typeNames)
          .replace('{{worldTemplate}}', settings.value.worldTemplate ? `世界观背景参考：${settings.value.worldTemplate}` : '')
          .replace('{{personaTemplate}}', settings.value.personaTemplate ? `人设风格参考：${settings.value.personaTemplate}` : '')
          .replace('{{extra}}', settings.value.extraPrompt || '')
          .replace('{{imagePromptTemplate}}', settings.value.imagePromptTemplate || '');
      }

      const typeStr = settings.value.typePrefs.length
        ? `次元类型偏好：${settings.value.typePrefs.join('、')}，请优先生成这些类型的角色。`
        : '次元类型：随机，可以是任何类型。';
      const styleStr = settings.value.stylePrefs.length && !settings.value.stylePrefs.includes('随机')
        ? `性格风格偏向：${settings.value.stylePrefs.join('、')}。`
        : '性格风格：随机，不限制。';
      const worldPart = settings.value.worldTemplate ? `世界观背景参考方向：${settings.value.worldTemplate}\n` : '';
      const personaPart = settings.value.personaTemplate ? `人设风格参考方向：${settings.value.personaTemplate}\n` : '';
      const extraPart = settings.value.extraPrompt ? `额外要求：${settings.value.extraPrompt}\n` : '';
      const imgPromptPart = settings.value.imagePromptTemplate ? `${settings.value.imagePromptTemplate}\n` : '';

      const selectedTypes = settings.value.typePrefs.length
        ? settings.value.typePrefs
        : typeOptions.value.map(t => t.name);
      const typePromptParts = selectedTypes.map(name => {
        const t = typeOptions.value.find(t => t.name === name);
        return t && t.prompt ? `【${name}专属设定】${t.prompt}` : '';
      }).filter(Boolean).join('\n');

      return `请生成 ${count} 个用于跨次元交友的角色卡。
${typeStr}
${styleStr}
${worldPart}${personaPart}${typePromptParts ? typePromptParts + '\n' : ''}${extraPart}${imgPromptPart}
每个角色必须包含以下字段：
- name：角色名（2-4个字，有特色）
- world：世界观背景（80字以内，简洁有画面感）
- persona：性格人设（80字以内，突出个性）
- type：次元类型（从以下选项选一个：${typeNames}）
- tags：性格标签（2到4个词的数组）
- imagePrompt：生图提示词（英文，如无需求可省略）

请只返回 JSON 数组，不要有其他任何文字，格式：
[{"name":"","world":"","persona":"","type":"","tags":[],"imagePrompt":""}]`;
    };

    const generateCards = async () => {
      if (!apiConfig.value.url || !apiConfig.value.key || !apiConfig.value.model) {
        alert('请先在喜欢页面的设置里配置 API');
        return;
      }
      if (mainTab.value === 'discover') cardLoading.value = true;
      else gridLoading.value = true;

      const count = parseInt(settings.value.genCount) || 4;
      let prompt = buildPrompt(count);

      try {
        const savedWorldBooks = await dbGet('worldBooks');
        const globalInjectBooks = (savedWorldBooks || []).filter(b => b.globalInject);
        const globalInjectText = globalInjectBooks.map(b => b.content).join('。');
        if (globalInjectText) {
          prompt = globalInjectText + '。' + prompt;
        }

        const res = await fetch(`${apiConfig.value.url.replace(/\/$/, '')}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiConfig.value.key}` },
          body: JSON.stringify({ model: apiConfig.value.model, messages: [{ role: 'user', content: prompt }] })
        });
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content || '[]';
        const match = text.match(/\[[\s\S]*\]/);
        if (match) {
          const arr = JSON.parse(match[0]);
          const newChars = arr.map((c, i) => ({
            id: Date.now() + i,
            name: c.name || '未知角色',
            world: c.world || '',
            persona: c.persona || '',
            type: c.type || '其他',
            tags: Array.isArray(c.tags) ? c.tags : [],
            avatar: '',
            source: 'ai',
            imagePrompt: c.imagePrompt || '',
          }));

          // 第一个角色同步生成头像，其余懒加载
          if (newChars.length > 0) {
            await generateAvatarForChar(newChars[0]);
          }
          for (let i = 1; i < newChars.length; i++) {
            generateAvatarForChar(newChars[i]); // 不 await，懒加载
          }

          tempChars.value.push(...newChars);
          await dbSet('randomTempChars', JSON.parse(JSON.stringify(tempChars.value)));
          buildCardPool();
        } else {
          alert('AI 返回格式有误，请重试');
        }
      } catch (e) {
        alert('生成失败：' + e.message);
      }

      cardLoading.value = false;
      gridLoading.value = false;
    };

    // ===== 走廊 Tab =====
    const activeFilter = ref('全部');

    const allCorridorChars = computed(() => {
      const connected = new Set(randomCharList.value.map(c => c.id));
      return [
        ...randomCharList.value,
        ...tempChars.value.filter(c => !connected.has(c.id))
      ];
    });

    const filteredGridChars = computed(() => {
      if (activeFilter.value === '全部') return allCorridorChars.value;
      return allCorridorChars.value.filter(c => c.type === activeFilter.value);
    });

    const featuredChars = computed(() => {
      const count = parseInt(settings.value.featuredCount) || 5;
      return allCorridorChars.value.slice(0, count);
    });

    // ===== 详情抽屉 =====
    const detailChar = ref(null);
    const detailAvatarUrl = ref('');

    const openDetail = (char) => {
      detailChar.value = char;
      detailAvatarUrl.value = char.avatar || '';
      nextTick(() => refreshIcons());
    };

    const applyDetailAvatar = async () => {
      if (!detailChar.value || !detailAvatarUrl.value.trim()) return;
      detailChar.value.avatar = detailAvatarUrl.value.trim();
      // 同步到 tempChars 或 randomCharList
      const inTemp = tempChars.value.find(c => c.id === detailChar.value.id);
      if (inTemp) { inTemp.avatar = detailChar.value.avatar; await dbSet('randomTempChars', JSON.parse(JSON.stringify(tempChars.value))); }
      const inConnected = randomCharList.value.find(c => c.id === detailChar.value.id);
      if (inConnected) { inConnected.avatar = detailChar.value.avatar; await dbSet('randomCharList', JSON.parse(JSON.stringify(randomCharList.value))); }
    };

    const regenAvatar = async (char) => {
      char.avatar = '';
      await generateAvatarForChar(char);
      const inTemp = tempChars.value.find(c => c.id === char.id);
      if (inTemp) { inTemp.avatar = char.avatar; await dbSet('randomTempChars', JSON.parse(JSON.stringify(tempChars.value))); }
      const inConnected = randomCharList.value.find(c => c.id === char.id);
      if (inConnected) { inConnected.avatar = char.avatar; await dbSet('randomCharList', JSON.parse(JSON.stringify(randomCharList.value))); }
    };

    // ===== 卡片背景样式 =====
    const gradients = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
      'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
      'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)',
      'linear-gradient(135deg, #d4fc79 0%, #96e6a1 100%)',
      'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',
    ];

    const noImgColors = [
      '#4a4a8a', '#8a4a4a', '#3a7a5a', '#7a5a3a', '#3a5a7a', '#6a3a7a', '#7a6a3a', '#3a6a6a', '#7a3a5a', '#5a3a7a',
    ];

    const getCardBgStyle = (char) => {
      if (!char) return {};
      if (char.avatar) return { backgroundImage: `url(${char.avatar})` };
      const idx = Math.abs((char.id || 0) % gradients.length);
      return { background: gradients[idx] };
    };

    const getNoImgStyle = (char) => {
      if (!char) return {};
      const idx = Math.abs((char.id || 0) % noImgColors.length);
      return { background: noImgColors[idx], color: '#fff' };
    };

    // ===== 数据管理 =====
    const clearSkipped = async () => {
      skippedIds.value = new Set();
      await dbSet('randomSkippedIds', []);
      buildCardPool();
    };
    // ===== 自定义生图 API 获取模型 =====
    const imgModelList = ref([]);
    const showImgModelDrop = ref(false);

    const fetchImgModels = async () => {
      const url = settingsForm.value.customImgUrl;
      const key = settingsForm.value.customImgKey;
      if (!url || !key) { alert('请先填写自定义生图 API 地址和 Key'); return; }
      try {
        const res = await fetch(`${url.replace(/\/$/, '')}/models`, {
          headers: { Authorization: `Bearer ${key}` }
        });
        const data = await res.json();
        imgModelList.value = (data.data || []).map(m => m.id);
        if (!imgModelList.value.length) alert('未获取到模型列表');
      } catch (e) {
        alert('获取模型失败：' + e.message);
      }
    };
    const deleteChar = async (char) => {
      if (!confirm(`确定删除「${char.name}」吗？`)) return;
      tempChars.value = tempChars.value.filter(c => c.id !== char.id);
      await dbSet('randomTempChars', JSON.parse(JSON.stringify(tempChars.value)));
      randomCharList.value = randomCharList.value.filter(c => c.id !== char.id);
      await dbSet('randomCharList', JSON.parse(JSON.stringify(randomCharList.value)));
      buildCardPool();
      detailChar.value = null;
    };

    const clearTempChars = async () => {
      tempChars.value = [];
      await dbSet('randomTempChars', []);
      buildCardPool();
    };

    // ===== 初始化 =====
    onMounted(async () => {
      const savedGlobalCss = await dbGet('globalCss');
      if (savedGlobalCss) {
        let el = document.getElementById('global-custom-css');
        if (!el) { el = document.createElement('style'); el.id = 'global-custom-css'; document.head.appendChild(el); }
        el.textContent = savedGlobalCss;
      }
if (typeof listenForNotifications === 'function') listenForNotifications();
if (typeof requestNotifyPermission === 'function') requestNotifyPermission();

      const savedFont = await dbGet('customFont');
      if (savedFont && savedFont.src) {
        let style = document.getElementById('custom-font-style');
        if (!style) { style = document.createElement('style'); style.id = 'custom-font-style'; document.head.appendChild(style); }
        style.textContent = `@font-face { font-family: 'CustomGlobalFont'; src: url('${savedFont.src}'); } * { font-family: 'CustomGlobalFont', -apple-system, 'PingFang SC', 'Helvetica Neue', sans-serif !important; }`;
      }
      const savedFontSize = await dbGet('customFontSize');
      if (savedFontSize) {
        let fsStyle = document.getElementById('custom-fontsize-style');
        if (!fsStyle) { fsStyle = document.createElement('style'); fsStyle.id = 'custom-fontsize-style'; document.head.appendChild(fsStyle); }
        fsStyle.textContent = `* { font-size: ${savedFontSize}px !important; }`;
      }

      const [dark, wp, api, savedSettings, savedTemp, savedSkipped, savedRandom] = await Promise.all([
        dbGet('darkMode'), dbGet('wallpaper'), dbGet('apiConfig'),
        dbGet('randomSettings'), dbGet('randomTempChars'),
        dbGet('randomSkippedIds'), dbGet('randomCharList'),
      ]);

      if (dark) document.body.classList.add('dark');
      const pageWp = await dbGet('wallpaper_random');
      const globalOn = await dbGet('wallpaperGlobal');
      const finalWp = pageWp || (globalOn ? wp : '');
      if (finalWp) { document.body.style.backgroundImage = `url(${finalWp})`; document.body.style.backgroundSize = 'cover'; document.body.style.backgroundPosition = 'center'; }
      if (api) apiConfig.value = api;

      if (savedSettings) {
        settings.value = { ...settings.value, ...savedSettings };
        if (savedSettings.typeOptions && savedSettings.typeOptions.length) {
          typeOptions.value = savedSettings.typeOptions;
        }
        if (savedSettings.styleOptions && savedSettings.styleOptions.length) {
          styleOptions.value = savedSettings.styleOptions;
        }
        activeFilter.value = settings.value.defaultFilter;
      }

      if (savedTemp) tempChars.value = savedTemp;
      if (savedSkipped) skippedIds.value = new Set(savedSkipped);
      if (savedRandom) randomCharList.value = savedRandom;

      buildCardPool();

      setTimeout(() => {
        try { refreshIcons(); } catch(e) {}
        try { lucide.createIcons(); } catch(e) {}
        appReady.value = true;
        const mask = document.getElementById('loadingMask');
        if (mask) { mask.classList.add('hide'); setTimeout(() => mask.remove(), 400); }
      }, 100);
      setTimeout(() => { try { lucide.createIcons(); } catch(e) {} }, 500);
    });

    return {
      appReady, mainTab, goBack,
      typeOptions, styleOptions, dicebearStyles,
      newTypeName, newStyleName, expandedTypePrompts,
      addCustomType, removeCustomType,
      addCustomStyle, removeCustomStyle,
      toggleTypePrompt,
      settingsShow, settings, settingsForm,
      openSettings, saveSettings, resetCustomPrompt,
      toggleTypePref, toggleStylePref,
      randomCharList, isConnected, connectChar,
      tempChars, cardPool, cardLoading,
      flyLeft, flyRight, cardFlipped, currentCard, cardDragStyle,
      isDragging, dragDir,
      onCardClick, onCardMouseDown, onCardTouchStart, onCardTouchMove, onCardTouchEnd,
      doSkip, doConnect, generateCards,
      gridLoading, activeFilter,
      allCorridorChars, filteredGridChars, featuredChars,
      detailChar, detailAvatarUrl, openDetail, applyDetailAvatar, regenAvatar,
      getCardBgStyle, getNoImgStyle,
      clearSkipped, clearTempChars, deleteChar,
      imgModelList, showImgModelDrop, fetchImgModels,
    };
  }
}).mount('#random-app');
