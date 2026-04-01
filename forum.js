const { createApp, ref, computed, onMounted, nextTick, watch } = Vue;

createApp({
  setup() {
    const appReady = ref(false);
    const mainTab = ref('home');
    const goBack = () => { window.location.href = 'world.html'; };

    let lucideTimer = null;
    const refreshIcons = () => { clearTimeout(lucideTimer); lucideTimer = setTimeout(() => lucide.createIcons(), 50); };

    const DEFAULT_CATEGORIES = [
      { name: '时政', prompt: '生成关于政治、社会时事、民生话题的论坛帖子，语气犀利或关切，有不同立场的讨论', replyPrompt: '生成时政帖子下的回复，观点多元，有支持有反对，语气理性或激烈', npcIds: [] },
      { name: '闲谈', prompt: '生成日常闲聊帖子，轻松随意，话题包括生活琐事、心情感悟、随想随写', replyPrompt: '生成闲谈帖子下的回复，轻松随意，有共鸣有调侃，像真实网友聊天', npcIds: [] },
      { name: '求助', prompt: '生成求助类帖子，发帖人遇到各种困难或问题，语气困惑或焦急，需要帮助', replyPrompt: '生成求助帖子下的回复，有人给建议、有人分享经历、有人安慰，像真实热心网友', npcIds: [] },
      { name: '水聊', prompt: '生成水帖，内容简短无厘头，可以是表情包文字、无意义的感叹、随机话题', replyPrompt: '生成水帖下的回复，简短搞笑，接梗、抬杠、无厘头都行', npcIds: [] },
      { name: '教学', prompt: '生成教程类帖子，分享某种技能、知识或经验，语气耐心细致', replyPrompt: '生成教学帖子下的回复，有感谢、有追问、有补充经验的', npcIds: [] },
      { name: '警示', prompt: '生成警示类帖子，揭露骗局、分享亲身遭遇的危险或教训，语气严肃', replyPrompt: '生成警示帖子下的回复，有表示震惊的、有分享类似经历的、有感谢提醒的', npcIds: [] },
      { name: '吃瓜', prompt: '生成八卦吃瓜帖子，爆料某些八卦事件，语气神秘或兴奋，不透露真实人名', replyPrompt: '生成吃瓜帖子下的回复，有追问细节的、有分析剧情的、有表示不信的，吃瓜氛围拉满', npcIds: [] },
      { name: '娱乐', prompt: '生成娱乐圈相关帖子，讨论虚构的明星、综艺、影视，语气粉丝或路人视角', replyPrompt: '生成娱乐帖子下的回复，有粉丝力挺、有路人评价、有黑子，立场各异', npcIds: [] },
      { name: '美食', prompt: '生成美食分享帖子，描述某种食物的美味或烹饪方法，语气垂涎欲滴', replyPrompt: '生成美食帖子下的回复，有馋到的、有分享自己做法的、有推荐其他美食的', npcIds: [] },
      { name: '音乐', prompt: '生成音乐分享或讨论帖子，可以是歌词感悟、歌手讨论或乐器经验', replyPrompt: '生成音乐帖子下的回复，有共鸣的、有推歌的、有讨论歌手的', npcIds: [] },
      { name: '读书', prompt: '生成读书笔记或书评帖子，分享某本书的感悟或推荐', replyPrompt: '生成读书帖子下的回复，有共鸣感悟、有推荐其他书、有追问书名的', npcIds: [] },
      { name: '彩妆', prompt: '生成美妆护肤相关帖子，分享彩妆心得、产品测评、变美技巧', replyPrompt: '生成彩妆帖子下的回复，有求链接的、有分享同款的、有讨论效果的', npcIds: [] },
      { name: '健身', prompt: '生成健身运动相关帖子，分享训练方法、身材管理、运动感悟', replyPrompt: '生成健身帖子下的回复，有互相鼓励的、有求教程的、有分享自己计划的', npcIds: [] },
      { name: '影视', prompt: '生成影视讨论帖子，讨论虚构的电影电视剧，可以是推荐、解析或吐槽', replyPrompt: '生成影视帖子下的回复，有强推的、有剧情分析的、有不同观点的', npcIds: [] },
      { name: '动漫', prompt: '生成动漫相关帖子，讨论动画、漫画、轻小说，语气二次元风格', replyPrompt: '生成动漫帖子下的回复，二次元风格，有同好交流、有推荐、有角色讨论', npcIds: [] },
      { name: 'nsfw', prompt: '生成成人向的论坛帖子，内容可以涉及擦边话题、情感纠葛、成人生活感悟，语气大胆直接', replyPrompt: '生成nsfw帖子下的回复，大胆直接，有共鸣、有调侃、有深入讨论', npcIds: [] },
    ];

    const DEFAULT_DIM_HOT_PROMPT = `你是一个跨次元热搜榜单生成器。请生成20条来自不同虚构世界的热搜词条，必须涵盖：现实都市、古代架空、魔幻奇幻、兽世、ABO、哨兵向导、修仙、无限流、末世、星际、游戏穿越等多种次元，每条热搜来自不同的次元世界，偶有1~2条与角色或当前世界有关。每条热搜要有强烈的次元感和代入感，像真实的热搜标题。
请返回JSON数组：
[{"title":"热搜标题","dimension":"所属次元","heat":"热度数字+单位如万"}]
只返回JSON数组，不要有其他文字。`;

    const settingsForm = ref({
      forumApi: { url: '', key: '', model: '' },
      dimHotPrompt: DEFAULT_DIM_HOT_PROMPT,
      dimHotWorldBooks: [],
      categories: [],
      fixedNpcs: [],
      hotPlatformOrder: []
    });

    const apiConfig = ref({ url: '', key: '', model: '' });

    const getApiConfig = () => {
      const f = settingsForm.value.forumApi;
      if (f && f.url && f.url.trim() && f.key && f.key.trim() && f.model && f.model.trim()) {
        return { url: f.url.trim(), key: f.key.trim(), model: f.model.trim() };
      }
      return apiConfig.value;
    };

    const categories = ref([...DEFAULT_CATEGORIES]);
    const currentCat = ref('闲谈');
    const posts = ref([]);

    const currentCatPosts = computed(() =>
      posts.value.filter(p => p.cat === currentCat.value).slice().reverse()
    );

    const myProfile = ref({ name: '匿名用户', followers: 0, likes: 0 });
    const myPostsCount = computed(() => posts.value.filter(p => p.author === myProfile.value.name).length);
    const saveProfile = async () => {
      await dbSet('forumMyProfile', JSON.parse(JSON.stringify(myProfile.value)));
    };

    const currentPost = ref(null);
    const postFormShow = ref(false);
    const editingPost = ref(null);
    const postForm = ref({ title: '', content: '' });
    const postScrollRef = ref(null);

    const openPostDetail = (post) => {
      currentPost.value = post;
      quotingReply.value = null;
      replyText.value = '';
      nextTick(() => refreshIcons());
    };

    const openPostForm = () => {
      editingPost.value = null;
      postForm.value = { title: '', content: '' };
      postFormShow.value = true;
      nextTick(() => refreshIcons());
    };

    const submitPost = async () => {
      if (!postForm.value.title.trim() || !postForm.value.content.trim()) {
        alert('请填写标题和内容'); return;
      }
      postFormShow.value = false;
      if (editingPost.value) {
        const idx = posts.value.findIndex(p => p.id === editingPost.value.id);
        if (idx !== -1) {
          posts.value[idx].title = postForm.value.title;
          posts.value[idx].content = postForm.value.content;
        }
        editingPost.value = null;
      } else {
        posts.value.push({
          id: Date.now(),
          cat: currentCat.value,
          author: myProfile.value.name,
          title: postForm.value.title,
          content: postForm.value.content,
          time: Date.now(),
          likes: 0,
          likedByMe: false,
          replies: []
        });
      }
      await savePosts();
      nextTick(() => refreshIcons());
    };

    // ===== 帖子菜单 =====
    const postMenuShow = ref(false);
    const menuTarget = ref(null);

    const openPostMenu = (post) => {
      menuTarget.value = post;
      postMenuShow.value = true;
      nextTick(() => refreshIcons());
    };

    const collectFromMenu = () => {
      if (menuTarget.value) toggleCollect(menuTarget.value, 'post');
      postMenuShow.value = false;
    };

    const editFromMenu = () => {
      postMenuShow.value = false;
      editingPost.value = menuTarget.value;
      postForm.value = { title: menuTarget.value.title, content: menuTarget.value.content };
      if (currentPost.value && currentPost.value.id === menuTarget.value.id) currentPost.value = null;
      postFormShow.value = true;
      nextTick(() => refreshIcons());
    };

    const deleteFromMenu = async () => {
      if (!confirm('确定删除这个帖子？')) { postMenuShow.value = false; return; }
      const idx = posts.value.findIndex(p => p.id === menuTarget.value.id);
      if (idx !== -1) posts.value.splice(idx, 1);
      postMenuShow.value = false;
      if (currentPost.value && currentPost.value.id === menuTarget.value.id) currentPost.value = null;
      await savePosts();
    };

    // ===== 回复操作 =====
    const replyText = ref('');
    const quotingReply = ref(null);
    const replyTextareaRef = ref(null);
    const replyMenuShow = ref(false);
    const replyMenuTarget = ref(null);
    const editReplyShow = ref(false);
    const editReplyContent = ref('');
    const generatingReplies = ref(false);

    const autoResizeReply = () => {
      const el = replyTextareaRef.value;
      if (!el) return;
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 100) + 'px';
    };

    const setQuoteReply = (reply, idx) => {
      quotingReply.value = { ...reply, floor: idx + 1 };
    };

    const sendReply = async () => {
      if (!replyText.value.trim() || !currentPost.value) return;
      const reply = {
        id: Date.now(),
        content: replyText.value.trim(),
        time: Date.now(),
        isOp: currentPost.value.author === myProfile.value.name,
        likes: 0,
        likedByMe: false,
        quoteId: quotingReply.value ? quotingReply.value.id : null
      };
      if (!currentPost.value.replies) currentPost.value.replies = [];
      currentPost.value.replies.push(reply);
      replyText.value = '';
      quotingReply.value = null;
      if (replyTextareaRef.value) replyTextareaRef.value.style.height = 'auto';
      await savePosts();
      nextTick(() => {
        if (postScrollRef.value) postScrollRef.value.scrollTop = postScrollRef.value.scrollHeight;
        refreshIcons();
      });
    };

    // ===== AI生成评论 =====
    const generateReplies = async () => {
      if (!currentPost.value) return;
      const cfg = getApiConfig();
      if (!cfg.url || !cfg.key || !cfg.model) { alert('请先配置API'); return; }
      generatingReplies.value = true;

      const cat = categories.value.find(c => c.name === currentPost.value.cat);
      const replyPrompt = cat && cat.replyPrompt
        ? cat.replyPrompt
        : `生成这个帖子下真实的网友回复，语气自然口语`;

      const fixedNpcs = settingsForm.value.fixedNpcs || [];
      const randomNpcNames = ['云游四海', '匿名小透明', '路过的风', '夜半钟声', '微笑刺客', '隐形战队', '悄悄说说', '不知名网友', '深夜emo', '快乐肥宅', '五月天粉', '边走边唱', '落叶归根', '星光下的你', '打工人小李', '摸鱼专家', '社恐本社'];
      const count = Math.floor(Math.random() * 5) + 5;

      const savedWorldBooks = await dbGet('worldBooks');
      const globalInjectBooks = (savedWorldBooks || []).filter(b => b.globalInject);
      const globalInjectText = globalInjectBooks.map(b => b.content).join('。');
      const prompt = `${globalInjectText ? globalInjectText + '。' : ''}以下是一个论坛帖子：
标题：${currentPost.value.title}
内容：${currentPost.value.content}

请为这个帖子生成${count}条真实感强的网友回复。
回复风格要求：${replyPrompt}
${fixedNpcs.length ? `固定NPC参与回复：${fixedNpcs.map(n => n.name + (n.persona ? `（${n.persona}）` : '')).join('、')}` : ''}
普通网友用户名参考：${randomNpcNames.sort(() => Math.random() - 0.5).slice(0, 5).join('、')}等

每条回复要有自己的风格和立场，不要千篇一律。可以互相引用前面的回复内容（用"引用"字段填写被引用的内容原文）。
请返回JSON数组：
[{"author":"用户名","content":"回复内容（20~100字，自然口语，不用Markdown）","quote":"被引用的内容原文，没有引用则为空字符串","likes":数字}]
只返回JSON数组，不要有其他文字。`;

      try {
        const res = await fetch(`${cfg.url.replace(/\/$/, '')}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.key}` },
          body: JSON.stringify({ model: cfg.model, messages: [{ role: 'user', content: prompt }] })
        });
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content || '[]';
        const match = text.match(/\[[\s\S]*\]/);
        if (match) {
          const arr = JSON.parse(match[0]);
          if (!currentPost.value.replies) currentPost.value.replies = [];
          arr.forEach((item, i) => {
            // 处理引用：找到内容匹配的已有回复
            let quoteId = null;
            if (item.quote && item.quote.trim()) {
              const quoted = currentPost.value.replies.find(r =>
                r.content && r.content.includes(item.quote.trim().slice(0, 10))
              );
              if (quoted) quoteId = quoted.id;
            }
            currentPost.value.replies.push({
              id: Date.now() + i,
              content: item.content || '',
              time: Date.now() + i * 1000,
              isOp: item.author === currentPost.value.author,
              likes: item.likes || Math.floor(Math.random() * 30),
              likedByMe: false,
              quoteId
            });
          });
          await savePosts();
          nextTick(() => {
            if (postScrollRef.value) postScrollRef.value.scrollTop = postScrollRef.value.scrollHeight;
            refreshIcons();
          });
        } else {
          alert('评论生成格式有误，请重试');
        }
      } catch (e) {
        alert('评论生成失败：' + e.message);
      }
      generatingReplies.value = false;
    };

    const getQuoteContent = (quoteId) => {
      if (!currentPost.value || !currentPost.value.replies) return '';
      const r = currentPost.value.replies.find(r => r.id === quoteId);
      return r ? r.content.slice(0, 30) + (r.content.length > 30 ? '...' : '') : '';
    };

    const scrollToReply = (quoteId) => {
      nextTick(() => {
        const el = document.querySelector(`[data-reply-id="${quoteId}"]`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    };

    const openReplyMenu = (reply) => {
      replyMenuTarget.value = reply;
      replyMenuShow.value = true;
      nextTick(() => refreshIcons());
    };

    const collectReplyFromMenu = () => {
      if (replyMenuTarget.value) toggleCollect(replyMenuTarget.value, 'reply');
      replyMenuShow.value = false;
    };

    const editReplyFromMenu = () => {
      replyMenuShow.value = false;
      editReplyContent.value = replyMenuTarget.value.content;
      editReplyShow.value = true;
    };

    const confirmEditReply = async () => {
      if (replyMenuTarget.value) {
        replyMenuTarget.value.content = editReplyContent.value;
        await savePosts();
      }
      editReplyShow.value = false;
    };

    const deleteReplyFromMenu = async () => {
      if (!confirm('确定删除这条评论？')) { replyMenuShow.value = false; return; }
      if (currentPost.value && currentPost.value.replies) {
        const idx = currentPost.value.replies.findIndex(r => r.id === replyMenuTarget.value.id);
        if (idx !== -1) currentPost.value.replies.splice(idx, 1);
        await savePosts();
      }
      replyMenuShow.value = false;
    };

    // ===== 点赞 =====
    const likePost = async (post) => {
      post.likedByMe = !post.likedByMe;
      post.likes = (post.likes || 0) + (post.likedByMe ? 1 : -1);
      if (post.likedByMe) myProfile.value.likes = (myProfile.value.likes || 0) + 1;
      await savePosts();
      await saveProfile();
    };

    const likeReply = async (reply) => {
      reply.likedByMe = !reply.likedByMe;
      reply.likes = (reply.likes || 0) + (reply.likedByMe ? 1 : -1);
      await savePosts();
    };

    // ===== 收藏 =====
    const collections = ref([]);

    const isCollected = (id, type) => collections.value.some(c => c.id === id && c.type === type);

    const toggleCollect = async (item, type) => {
      const idx = collections.value.findIndex(c => c.id === item.id && c.type === type);
      if (idx !== -1) {
        collections.value.splice(idx, 1);
      } else {
        collections.value.push({ ...JSON.parse(JSON.stringify(item)), type, collectedAt: Date.now() });
      }
      await dbSet('forumCollections', JSON.parse(JSON.stringify(collections.value)));
    };

    // ===== 收藏/稿件页 =====
    const collectionShow = ref(false);
    const collectionType = ref('collect');
    const collectTab = ref('post');

    const collectionItems = computed(() => {
      if (collectionType.value === 'posts') {
        return posts.value.filter(p => p.author === myProfile.value.name).slice().reverse();
      }
      return collections.value.filter(c => c.type === collectTab.value).slice().reverse();
    });

    const openCollection = (type) => {
      collectionType.value = type;
      collectTab.value = 'post';
      collectionShow.value = true;
      nextTick(() => refreshIcons());
    };

    const openCollectionItem = (item) => {
      if (item.type === 'reply') return;
      const post = posts.value.find(p => p.id === item.id);
      if (post) { collectionShow.value = false; openPostDetail(post); }
    };

    // ===== AI生成帖子（含评论）=====
    const generating = ref(false);

    const generateRepliesForPost = async (post) => {
      const cfg = getApiConfig();
      if (!cfg.url || !cfg.key || !cfg.model) return;

      const cat = categories.value.find(c => c.name === post.cat);
      const replyPrompt = cat && cat.replyPrompt
        ? cat.replyPrompt
        : `生成这个帖子下真实的网友回复，语气自然口语`;

      const fixedNpcs = settingsForm.value.fixedNpcs || [];
      const randomNpcNames = ['云游四海', '匿名小透明', '路过的风', '夜半钟声', '微笑刺客', '隐形战队', '悄悄说说', '不知名网友', '深夜emo', '快乐肥宅', '五月天粉', '边走边唱', '落叶归根', '星光下的你', '打工人小李', '摸鱼专家', '社恐本社'];
      const count = Math.floor(Math.random() * 5) + 4;

      const savedWorldBooks = await dbGet('worldBooks');
      const globalInjectBooks = (savedWorldBooks || []).filter(b => b.globalInject);
      const globalInjectText = globalInjectBooks.map(b => b.content).join('。');
      const prompt = `${globalInjectText ? globalInjectText + '。' : ''}以下是一个论坛帖子：
标题：${post.title}
内容：${post.content}

请为这个帖子生成${count}条真实感强的网友回复。
回复风格要求：${replyPrompt}
${fixedNpcs.length ? `固定NPC参与回复：${fixedNpcs.map(n => n.name + (n.persona ? `（${n.persona}）` : '')).join('、')}` : ''}
普通网友用户名参考：${randomNpcNames.sort(() => Math.random() - 0.5).slice(0, 5).join('、')}等

每条回复要有自己的风格和立场，不要千篇一律。
请返回JSON数组：
[{"author":"用户名","content":"回复内容（20~100字，自然口语，不用Markdown）","likes":数字}]
只返回JSON数组，不要有其他文字。`;

      try {
        const res = await fetch(`${cfg.url.replace(/\/$/, '')}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.key}` },
          body: JSON.stringify({ model: cfg.model, messages: [{ role: 'user', content: prompt }] })
        });
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content || '[]';
        const match = text.match(/\[[\s\S]*\]/);
        if (match) {
          const arr = JSON.parse(match[0]);
          post.replies = arr.map((item, i) => ({
            id: Date.now() + i + Math.random(),
            content: item.content || '',
            time: Date.now() + i * 1000,
            isOp: item.author === post.author,
            likes: item.likes || Math.floor(Math.random() * 30),
            likedByMe: false,
            quoteId: null
          }));
        }
      } catch (e) {
        // 评论生成失败不阻断主流程
      }
    };

    const generatePosts = async () => {
      const cfg = getApiConfig();
      if (!cfg.url || !cfg.key || !cfg.model) {
        alert('请先配置API（在设置页面或 like.html 全局设置）'); return;
      }
      generating.value = true;
      const cat = categories.value.find(c => c.name === currentCat.value);
      const catPrompt = cat ? cat.prompt : `生成关于「${currentCat.value}」的论坛帖子`;
      const catWorldBookInject = getWorldBookInject(cat?.worldBookIds || []);
      const npcNames = [];
      if (cat && cat.npcIds && cat.npcIds.length) {
        const chars = await dbGet('charList') || [];
        cat.npcIds.forEach(id => {
          const c = chars.find(ch => ch.id === id);
          if (c) npcNames.push({ name: c.name, persona: c.persona || '' });
        });
      }
      const fixedNpcs = settingsForm.value.fixedNpcs || [];
      const allNpcs = [...npcNames, ...fixedNpcs];
      const randomNpcNames = ['云游四海', '匿名小透明', '路过的风', '夜半钟声', '微笑刺客', '隐形战队', '悄悄说说', '不知名网友', '深夜emo', '快乐肥宅', '五月天粉', '边走边唱', '落叶归根', '星光下的你'];
      const count = Math.floor(Math.random() * 3) + 3;
      const savedWorldBooks = await dbGet('worldBooks');
      const globalInjectBooks = (savedWorldBooks || []).filter(b => b.globalInject);
      const globalInjectText = globalInjectBooks.map(b => b.content).join('。');
      const prompt = `${globalInjectText ? globalInjectText + '。' : ''}你现在是一个真实运营的综合论坛，板块名称是「${currentCat.value}」。
请严格按照该板块主题生成${count}个真实的论坛帖子。
板块风格提示：${catPrompt}
${catWorldBookInject ? '背景设定：' + catWorldBookInject : ''}
${allNpcs.length ? `参与发帖的用户：${allNpcs.map(n => n.name + (n.persona ? `（${n.persona}）` : '')).join('、')}，以及若干随机普通网友。` : '发帖者为随机普通网友。'}
随机普通网友用户名可参考：${randomNpcNames.sort(() => Math.random() - 0.5).slice(0, 5).join('、')}等，也可自由发挥。
请返回JSON数组，格式：
[{"author":"用户名","title":"帖子标题（简洁有力，不超过20字）","content":"帖子正文（100~300字，自然口语，不使用Markdown格式）"}]
只返回JSON数组，不要有其他文字。`;

      try {
        const res = await fetch(`${cfg.url.replace(/\/$/, '')}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.key}` },
          body: JSON.stringify({ model: cfg.model, messages: [{ role: 'user', content: prompt }] })
        });
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content || '[]';
        const match = text.match(/\[[\s\S]*\]/);
        if (match) {
          const arr = JSON.parse(match[0]);
          const newPosts = arr.map((item, i) => ({
            id: Date.now() + i,
            cat: currentCat.value,
            author: item.author || '匿名网友',
            title: item.title || '无标题',
            content: item.content || '（内容生成失败）',
            time: Date.now() + i * 1000,
            likes: Math.floor(Math.random() * 60),
            likedByMe: false,
            replies: []
          }));
          // 并发为每个帖子生成评论
          await Promise.all(newPosts.map(p => generateRepliesForPost(p)));
          posts.value.push(...newPosts);
          await savePosts();
        } else {
          alert('生成内容格式有误，请重试');
        }
      } catch (e) {
        alert('生成失败：' + e.message);
      }
      generating.value = false;
      nextTick(() => refreshIcons());
    };

    // ===== 热搜 =====
    const hotTab = ref('real');
    const hotPlatform = ref('weibo');
    const hotList = ref([]);
    const hotLoading = ref(false);
    const hotError = ref('');
    const hotPlatforms = ref([
      { key: 'weibo',          label: '微博' },
      { key: 'baidu',          label: '百度' },
      { key: 'douyin',         label: '抖音' },
      { key: 'toutiao',        label: '头条' },
      { key: 'bilibili',       label: 'B站' },
      { key: 'hackernews',     label: 'HN' },
      { key: 'espn',           label: 'ESPN' },
      { key: 'lastfm',         label: '音乐热歌' },
      { key: 'lastfm_artist',  label: '热门歌手' },
      { key: 'lastfm_kpop',    label: 'Kpop' },
      { key: 'lastfm_jpop',    label: 'Jpop' },
      { key: 'lastfm_cantopop',label: '粤语流行' },
      { key: 'lastfm_mandopop',label: '国语流行' },
      { key: 'lastfm_chinese', label: '中文音乐' },
      { key: 'lastfm_korean',  label: '韩国音乐' },
      { key: 'lastfm_japanese',label: '日本音乐' },
      { key: 'lastfm_british', label: '英国音乐' },
      { key: 'lastfm_american',label: '美国音乐' },
    ]);

    // 排序后的平台列表（从设置读取）
    const hotPlatformsOrdered = computed(() => {
      const order = settingsForm.value.hotPlatformOrder;
      if (!order || !order.length) return hotPlatforms.value;
      const map = {};
      hotPlatforms.value.forEach(p => map[p.key] = p);
      const result = order.map(key => map[key]).filter(Boolean);
      // 补上不在order里的新平台
      hotPlatforms.value.forEach(p => {
        if (!order.includes(p.key)) result.push(p);
      });
      return result;
    });

    // ===== 翻译功能 =====
    const translating = ref({});
    const translations = ref({});

    const detectNeedTranslate = (text) => {
      // 检测是否包含非中文字符（日文、韩文、英文等）
      const chineseRatio = (text.match(/[\u4e00-\u9fff]/g) || []).length / text.length;
      return chineseRatio < 0.3 && text.length > 2;
    };

        const translateText = async (text, idx) => {
      if (translations.value[idx]) {
        if (translations.value[idx] === 'hide') {
          translations.value[idx] = translations.value[idx + '_cache'];
        } else {
          translations.value[idx + '_cache'] = translations.value[idx];
          translations.value[idx] = 'hide';
        }
        return;
      }
      translating.value[idx] = true;
      let result = '';
      try {
        const res = await fetch(
          `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=autodetect|zh-CN`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.responseStatus === 200 && data.responseData?.translatedText) {
            result = data.responseData.translatedText;
          }
        }
      } catch (e) {}
      translations.value[idx] = result || '翻译失败';
      translating.value[idx] = false;
    };

    const HOT_CACHE_TTL = 2 * 60 * 60 * 1000;

    const fetchHotList = async (type, force = false) => {
      const cacheKey = `hotCache_${type}`;
      const cached = await dbGet(cacheKey);
      if (!force && cached && Date.now() - cached.time < HOT_CACHE_TTL) {
        hotList.value = cached.data;
        hotError.value = '';
        return;
      }

      hotLoading.value = true;
      hotError.value = '';
      try {
        const res = await fetch(`https://hotapi-seven.vercel.app/api/hot?type=${type}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.data) && data.data.length) {
          const list = data.data.slice(0, 30).map(item => ({
            title: item.title || '',
            hot: item.hot || ''
          }));
          await dbSet(`hotCache_${type}`, { data: list, time: Date.now() });
          hotList.value = list;
        } else {
          hotError.value = '暂无数据，请稍后重试';
        }
      } catch (e) {
        hotError.value = `加载失败：${e.message}`;
      }
      hotLoading.value = false;
    };

    const switchHotPlatform = (key) => {
      hotPlatform.value = key;
      hotList.value = [];
      translations.value = {};
      fetchHotList(key);
    };
    // ===== 热搜详情 =====
    const hotDetailShow = ref(false);
    const hotDetailItem = ref(null);
    const hotDetailData = ref(null);
    const hotDetailLoading = ref(false);

    const openHotDetail = async (item) => {
      hotDetailItem.value = item;
      hotDetailData.value = null;
      hotDetailShow.value = true;
      nextTick(() => refreshIcons());
      await generateHotDetail(item);
    };

    const generateHotDetail = async (item) => {
      const cfg = getApiConfig();
      if (!cfg.url || !cfg.key || !cfg.model) {
        hotDetailData.value = { intro: '请先配置API才能生成详情', comments: [] };
        return;
      }
      hotDetailLoading.value = true;
      const platform = hotPlatforms.value.find(p => p.key === hotPlatform.value)?.label || '';
      const savedWorldBooks = await dbGet('worldBooks');
      const globalInjectBooks = (savedWorldBooks || []).filter(b => b.globalInject);
      const globalInjectText = globalInjectBooks.map(b => b.content).join('。');
      const prompt = `${globalInjectText ? globalInjectText + '。' : ''}当前热搜平台：${platform}
热搜标题：${item.title}
热度：${item.hot || '未知'}

请以这个热搜话题为基础，生成：
1. 话题简介（100~200字，概述这个话题的背景和为什么热搜，如果是外文话题请用中文描述，语气像新闻简讯）
2. 模拟网友讨论（8~12条，每条有用户名、内容、点赞数，语气真实多元，有支持有反对有调侃，根据平台风格调整语气：Reddit偏英语网络用语、韩国平台偏追星、日本平台偏二次元等，但内容统一用中文）

请返回JSON：
{
  "intro": "话题简介文字",
  "comments": [
    {"author": "用户名", "content": "评论内容", "likes": 数字},
    ...
  ]
}
只返回JSON，不要有其他文字。`;

      try {
        const res = await fetch(`${cfg.url.replace(/\/$/, '')}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.key}` },
          body: JSON.stringify({ model: cfg.model, messages: [{ role: 'user', content: prompt }] })
        });
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content || '{}';
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
          hotDetailData.value = JSON.parse(match[0]);
        } else {
          hotDetailData.value = { intro: '生成失败，请重试', comments: [] };
        }
      } catch (e) {
        hotDetailData.value = { intro: '生成失败：' + e.message, comments: [] };
      }
      hotDetailLoading.value = false;
      nextTick(() => refreshIcons());
    };

    const refreshHotDetail = () => {
      if (hotDetailItem.value) generateHotDetail(hotDetailItem.value);
    };

    const postHotToForum = async () => {
      if (!hotDetailItem.value || !hotDetailData.value) return;
      // 找到或创建热搜分类
      let hotCat = categories.value.find(c => c.name === '热搜');
      if (!hotCat) {
        hotCat = { name: '热搜', prompt: '来自各平台的热搜话题讨论', replyPrompt: '围绕热搜话题发表观点，多元立场', npcIds: [] };
        categories.value.push(hotCat);
      }
      const platform = hotPlatforms.value.find(p => p.key === hotPlatform.value)?.label || '';
      const newPost = {
        id: Date.now(),
        cat: '热搜',
        author: myProfile.value.name,
        title: `【${platform}热搜】${hotDetailItem.value.title}`,
        content: hotDetailData.value.intro || hotDetailItem.value.title,
        time: Date.now(),
        likes: 0,
        likedByMe: false,
        replies: (hotDetailData.value.comments || []).map((c, i) => ({
          id: Date.now() + i + 1,
          content: c.content || '',
          time: Date.now() + i * 1000,
          isOp: false,
          likes: c.likes || 0,
          likedByMe: false,
          quoteId: null
        }))
      };
      posts.value.push(newPost);
      await savePosts();
      hotDetailShow.value = false;
      // 切换到首页热搜分类
      mainTab.value = 'home';
      currentCat.value = '热搜';
      nextTick(() => refreshIcons());
    };

    watch(hotTab, (val) => {
      if (val === 'real') fetchHotList(hotPlatform.value);
    });

    // ===== 次元热搜 =====
    const dimHotList = ref([]);
    const dimHotLoading = ref(false);

    const generateDimensionHot = async () => {
      const cfg = getApiConfig();
      if (!cfg.url || !cfg.key || !cfg.model) { alert('请先配置API'); return; }
      dimHotLoading.value = true;
      const dimWbInject = getWorldBookInject(settingsForm.value.dimHotWorldBooks || []);
      const savedWorldBooks = await dbGet('worldBooks');
      const globalInjectBooks = (savedWorldBooks || []).filter(b => b.globalInject);
      const globalInjectText = globalInjectBooks.map(b => b.content).join('。');
      const basePrompt = settingsForm.value.dimHotPrompt || DEFAULT_DIM_HOT_PROMPT;
      const prompt = `${globalInjectText ? globalInjectText + '。' : ''}${dimWbInject ? basePrompt + '\n额外背景设定：' + dimWbInject : basePrompt}`;
      try {
        const res = await fetch(`${cfg.url.replace(/\/$/, '')}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.key}` },
          body: JSON.stringify({ model: cfg.model, messages: [{ role: 'user', content: prompt }] })
        });
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content || '[]';
        const match = text.match(/\[[\s\S]*\]/);
        if (match) {
          dimHotList.value = JSON.parse(match[0]);
          await dbSet('forumDimHotList', JSON.parse(JSON.stringify(dimHotList.value)));
        }
        else alert('次元热搜格式有误，请重试');
      } catch (e) {
        alert('次元热搜生成失败：' + e.message);
      }
      dimHotLoading.value = false;
    };

    // ===== 搜索 =====
    const searchType = ref('forum');
    const searchQuery = ref('');
    const searchLoading = ref(false);
    const searchResults = ref([]);
    const searchDone = ref(false);
    const aiSearchResult = ref('');

    const doSearch = async () => {
      if (!searchQuery.value.trim()) return;
      searchLoading.value = true;
      searchResults.value = [];
      aiSearchResult.value = '';
      searchDone.value = false;
      if (searchType.value === 'forum') {
        const q = searchQuery.value.trim().toLowerCase();
        searchResults.value = posts.value.filter(p =>
          p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q)
        );
        searchDone.value = true;
        searchLoading.value = false;
      } else {
        const cfg = getApiConfig();
        if (!cfg.url || !cfg.key || !cfg.model) {
          alert('请先配置API'); searchLoading.value = false; return;
        }
        try {
          const savedWorldBooks = await dbGet('worldBooks');
          const globalInjectBooks = (savedWorldBooks || []).filter(b => b.globalInject);
          const globalInjectText = globalInjectBooks.map(b => b.content).join('。');
          const searchContent = globalInjectText ? globalInjectText + '。' + searchQuery.value : searchQuery.value;
          const res = await fetch(`${cfg.url.replace(/\/$/, '')}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.key}` },
            body: JSON.stringify({ model: cfg.model, messages: [{ role: 'user', content: searchContent }] })
          });
          const data = await res.json();
          aiSearchResult.value = data.choices?.[0]?.message?.content || '（无回答）';
        } catch (e) {
          aiSearchResult.value = '请求失败：' + e.message;
        }
        searchLoading.value = false;
      }
    };

    // ===== 私聊 =====
    const conversations = ref([]);
    const currentConv = ref(null);
    const pmText = ref('');
    const pmBodyRef = ref(null);
    const pmTextareaRef = ref(null);

    const autoResizePM = () => {
      const el = pmTextareaRef.value;
      if (!el) return;
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 100) + 'px';
    };

    const openPM = async (authorName, sourcePost) => {
      let conv = conversations.value.find(c => c.name === authorName);
      if (!conv) {
        conv = {
          id: Date.now(),
          name: authorName,
          messages: [],
          sourcePost: sourcePost ? JSON.parse(JSON.stringify(sourcePost)) : null
        };
        conversations.value.push(conv);
        await saveConversations();
      } else if (sourcePost) {
        conv.sourcePost = JSON.parse(JSON.stringify(sourcePost));
      }
      mainTab.value = 'messages';
      await nextTick();
      currentConv.value = conv;
      nextTick(() => {
        if (pmBodyRef.value) pmBodyRef.value.scrollTop = pmBodyRef.value.scrollHeight;
        refreshIcons();
      });
    };

    const openConversation = (conv) => {
      currentConv.value = conv;
      nextTick(() => {
        if (pmBodyRef.value) pmBodyRef.value.scrollTop = pmBodyRef.value.scrollHeight;
        refreshIcons();
      });
    };
    const pmGenerating = ref(false);

    const generatePMReply = async () => {
      if (!currentConv.value) return;
      const cfg = getApiConfig();
      if (!cfg.url || !cfg.key || !cfg.model) { alert('请先配置API'); return; }
      pmGenerating.value = true;

      const conv = currentConv.value;
      const charList = await dbGet('charList') || [];
      const matchedChar = charList.find(c => c.name === conv.name);
      let systemPrompt = '';
      if (matchedChar) {
        systemPrompt = `你正在扮演角色「${matchedChar.name}」与用户私聊。${matchedChar.persona ? '你的人设：' + matchedChar.persona + '。' : ''}${matchedChar.world ? '世界观：' + matchedChar.world + '。' : ''}你在论坛上是一个普通用户，可能会隐藏自己的真实身份，也可能在熟悉后透露。`;
      } else if (conv.sourcePost) {
        systemPrompt = `你是论坛用户「${conv.name}」，正在与一个网友私聊。你在论坛上发过这样的帖子：\n标题：${conv.sourcePost.title}\n内容：${conv.sourcePost.content}\n请根据帖子内容推断你的性格、立场、背景，用符合帖子风格的语气与网友聊天。你有自己的秘密和隐藏身份，可以选择隐瞒或透露。`;
      } else {
        systemPrompt = `你是论坛用户「${conv.name}」，正在与一个网友私聊。请用自然口语风格回应，有自己的个性和立场。`;
      }
      const savedWorldBooks = await dbGet('worldBooks');
      const globalInjectBooks = (savedWorldBooks || []).filter(b => b.globalInject);
      const globalInjectText = globalInjectBooks.map(b => b.content).join('。');
      if (globalInjectText) systemPrompt = globalInjectText + '。' + systemPrompt;
      systemPrompt += '\n主动发起或继续话题，每次只说1~3句话，像真实私信一样简短自然，不要使用Markdown格式。';

      const historyMsgs = conv.messages.slice(-12).map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content
      }));

      const loadingMsg = { id: Date.now() + 1, role: 'assistant', content: '', loading: true, time: Date.now() };
      currentConv.value.messages.push(loadingMsg);
      nextTick(() => { if (pmBodyRef.value) pmBodyRef.value.scrollTop = pmBodyRef.value.scrollHeight; });

      try {
        const res = await fetch(`${cfg.url.replace(/\/$/, '')}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.key}` },
          body: JSON.stringify({ model: cfg.model, messages: [{ role: 'system', content: systemPrompt }, ...historyMsgs] })
        });
        const data = await res.json();
        const reply = data.choices?.[0]?.message?.content || '（无回复）';
        const idx = currentConv.value.messages.findIndex(m => m.id === loadingMsg.id);
        if (idx !== -1) {
          currentConv.value.messages[idx] = {
            id: Date.now() + 2, role: 'assistant', content: reply, loading: false, time: Date.now()
          };
        }
      } catch (e) {
        const idx = currentConv.value.messages.findIndex(m => m.id === loadingMsg.id);
        if (idx !== -1) {
          currentConv.value.messages[idx] = {
            id: Date.now() + 2, role: 'assistant', content: '（生成失败：' + e.message + '）', loading: false, time: Date.now()
          };
        }
      }
      await saveConversations();
      pmGenerating.value = false;
      nextTick(() => {
        if (pmBodyRef.value) pmBodyRef.value.scrollTop = pmBodyRef.value.scrollHeight;
        refreshIcons();
      });
    };

    const sendPM = async () => {
      if (!pmText.value.trim() || !currentConv.value) return;
      const cfg = getApiConfig();
      if (!cfg.url || !cfg.key || !cfg.model) { alert('请先配置API'); return; }

      const userMsg = { id: Date.now(), role: 'user', content: pmText.value.trim(), time: Date.now() };
      currentConv.value.messages.push(userMsg);
      pmText.value = '';
      if (pmTextareaRef.value) pmTextareaRef.value.style.height = 'auto';
      await saveConversations();
      nextTick(() => { if (pmBodyRef.value) pmBodyRef.value.scrollTop = pmBodyRef.value.scrollHeight; });

      const conv = currentConv.value;
      const charList = await dbGet('charList') || [];
      const matchedChar = charList.find(c => c.name === conv.name);
      let systemPrompt = '';
      if (matchedChar) {
        systemPrompt = `你正在扮演角色「${matchedChar.name}」与用户私聊。${matchedChar.persona ? '你的人设：' + matchedChar.persona + '。' : ''}${matchedChar.world ? '世界观：' + matchedChar.world + '。' : ''}你在论坛上是一个普通用户，可能会隐藏自己的真实身份，也可能在熟悉后透露。`;
      } else if (conv.sourcePost) {
        systemPrompt = `你是论坛用户「${conv.name}」，正在与一个网友私聊。你在论坛上发过这样的帖子：\n标题：${conv.sourcePost.title}\n内容：${conv.sourcePost.content}\n请根据帖子内容推断你的性格、立场、背景，用符合帖子风格的语气与网友聊天。你有自己的秘密和隐藏身份，可以选择隐瞒或透露。`;
      } else {
        systemPrompt = `你是论坛用户「${conv.name}」，正在与一个网友私聊。请用自然口语风格回应，有自己的个性和立场。`;
      }
      const savedWorldBooks = await dbGet('worldBooks');
      const globalInjectBooks = (savedWorldBooks || []).filter(b => b.globalInject);
      const globalInjectText = globalInjectBooks.map(b => b.content).join('。');
      if (globalInjectText) systemPrompt = globalInjectText + '。' + systemPrompt;
      systemPrompt += '\n每次只回复1~3句话，像真实的私信一样简短自然，不要使用Markdown格式。';

      const historyMsgs = conv.messages.slice(-12).map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content
      }));

      const loadingMsg = { id: Date.now() + 1, role: 'assistant', content: '', loading: true, time: Date.now() };
      currentConv.value.messages.push(loadingMsg);
      nextTick(() => { if (pmBodyRef.value) pmBodyRef.value.scrollTop = pmBodyRef.value.scrollHeight; });

      try {
        const res = await fetch(`${cfg.url.replace(/\/$/, '')}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.key}` },
          body: JSON.stringify({ model: cfg.model, messages: [{ role: 'system', content: systemPrompt }, ...historyMsgs] })
        });
        const data = await res.json();
        const reply = data.choices?.[0]?.message?.content || '（无回复）';
        const idx = currentConv.value.messages.findIndex(m => m.id === loadingMsg.id);
        if (idx !== -1) {
          currentConv.value.messages[idx] = {
            id: Date.now() + 2,
            role: 'assistant',
            content: reply,
            loading: false,
            time: Date.now()
          };
        }
      } catch (e) {
        const idx = currentConv.value.messages.findIndex(m => m.id === loadingMsg.id);
        if (idx !== -1) {
          currentConv.value.messages[idx] = {
            id: Date.now() + 2,
            role: 'assistant',
            content: '（消息发送失败：' + e.message + '）',
            loading: false,
            time: Date.now()
          };
        }
      }
      await saveConversations();
      nextTick(() => {
        if (pmBodyRef.value) pmBodyRef.value.scrollTop = pmBodyRef.value.scrollHeight;
        refreshIcons();
      });
    };

    const saveConversations = async () => {
      await dbSet('forumConversations', JSON.parse(JSON.stringify(conversations.value)));
    };

    // ===== 设置页 =====
    const settingsShow = ref(false);
    const expandedCats = ref([]);
    const availableChars = ref([]);
    const availableWorldBooks = ref([]);
    const availableWorldBookCats = ref([]);

    const wbCatBooks = (cat) => availableWorldBooks.value.filter(b => (b.category || '') === cat);

    const toggleCatWorldBook = (cat, bookId) => {
      if (!cat.worldBookIds) cat.worldBookIds = [];
      const idx = cat.worldBookIds.indexOf(bookId);
      if (idx === -1) cat.worldBookIds.push(bookId);
      else cat.worldBookIds.splice(idx, 1);
    };

    const toggleDimHotWorldBook = (bookId) => {
      if (!settingsForm.value.dimHotWorldBooks) settingsForm.value.dimHotWorldBooks = [];
      const idx = settingsForm.value.dimHotWorldBooks.indexOf(bookId);
      if (idx === -1) settingsForm.value.dimHotWorldBooks.push(bookId);
      else settingsForm.value.dimHotWorldBooks.splice(idx, 1);
    };

    // 获取选中世界书的内容注入文本
    const getWorldBookInject = (bookIds) => {
      if (!bookIds || !bookIds.length) return '';
      const books = availableWorldBooks.value.filter(b => bookIds.includes(b.id));
      if (!books.length) return '';
      const jailbreak = books.filter(b => b.type === 'jailbreak').map(b => b.content).join('；');
      const worldview = books.filter(b => b.type === 'worldview').map(b => b.content).join('；');
      const persona = books.filter(b => b.type === 'persona').map(b => b.content).join('；');
      const prompt = books.filter(b => b.type === 'prompt').map(b => b.content).join('；');
      let result = '';
      if (jailbreak) result += jailbreak + '。';
      if (worldview) result += '世界观补充：' + worldview + '。';
      if (persona) result += '人设补充：' + persona + '。';
      if (prompt) result += prompt + '。';
      return result;
    };

    const addCatShow = ref(false);
    const newCatName = ref('');
    const newCatPrompt = ref('');
    const forumModelList = ref([]);

    const fetchForumModels = async () => {
      const f = settingsForm.value.forumApi;
      if (!f.url || !f.key) { alert('请先填写论坛API网址和密钥'); return; }
      try {
        const res = await fetch(`${f.url.replace(/\/$/, '')}/models`, {
          headers: { Authorization: `Bearer ${f.key}` }
        });
        const data = await res.json();
        forumModelList.value = (data.data || []).map(m => m.id);
      } catch (e) {
        alert('获取模型失败：' + e.message);
      }
    };

    const openSettings = async () => {
      settingsForm.value.categories = JSON.parse(JSON.stringify(categories.value));
      if (!settingsForm.value.fixedNpcs) settingsForm.value.fixedNpcs = [];
      if (!settingsForm.value.forumApi) settingsForm.value.forumApi = { url: '', key: '', model: '' };
      if (!settingsForm.value.hotPlatformOrder || !settingsForm.value.hotPlatformOrder.length) {
        settingsForm.value.hotPlatformOrder = hotPlatforms.value.map(p => p.key);
      }
      if (!settingsForm.value.dimHotWorldBooks) settingsForm.value.dimHotWorldBooks = [];
      const chars = await dbGet('charList') || [];
      availableChars.value = chars;
      const wbs = await dbGet('worldBooks') || [];
      availableWorldBooks.value = wbs;
      const wbCats = await dbGet('worldBookCats') || [];
      availableWorldBookCats.value = wbCats;
      settingsShow.value = true;
      nextTick(() => refreshIcons());
    };

    const saveSettings = async () => {
      categories.value = JSON.parse(JSON.stringify(settingsForm.value.categories));
      await dbSet('forumSettings', JSON.parse(JSON.stringify(settingsForm.value)));
      settingsShow.value = false;
    };

    const toggleCatExpand = (name) => {
      const idx = expandedCats.value.indexOf(name);
      if (idx === -1) expandedCats.value.push(name);
      else expandedCats.value.splice(idx, 1);
      nextTick(() => refreshIcons());
    };

    const toggleCatNpc = (cat, charId) => {
      if (!cat.npcIds) cat.npcIds = [];
      const idx = cat.npcIds.indexOf(charId);
      if (idx === -1) cat.npcIds.push(charId);
      else cat.npcIds.splice(idx, 1);
    };

    const addCustomCategory = () => {
      newCatName.value = '';
      newCatPrompt.value = '';
      addCatShow.value = true;
      nextTick(() => refreshIcons());
    };

    const confirmAddCategory = async () => {
      if (!newCatName.value.trim()) return;
      const newCat = {
        name: newCatName.value.trim(),
        prompt: newCatPrompt.value.trim(),
        replyPrompt: '',
        npcIds: []
      };
      settingsForm.value.categories.push(newCat);
      categories.value.push(JSON.parse(JSON.stringify(newCat)));
      addCatShow.value = false;
      await dbSet('forumSettings', JSON.parse(JSON.stringify(settingsForm.value)));
    };
    const movePlatform = (key, dir) => {
      const order = settingsForm.value.hotPlatformOrder.length
        ? [...settingsForm.value.hotPlatformOrder]
        : hotPlatforms.value.map(p => p.key);
      const idx = order.indexOf(key);
      if (idx === -1) return;
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= order.length) return;
      order.splice(idx, 1);
      order.splice(newIdx, 0, key);
      settingsForm.value.hotPlatformOrder = order;
    };

    const resetPlatformOrder = () => {
      settingsForm.value.hotPlatformOrder = hotPlatforms.value.map(p => p.key);
    };

    // ===== 数据存储 =====
    const savePosts = async () => {
      await dbSet('forumPostsV2', JSON.parse(JSON.stringify(posts.value)));
    };

    // ===== 时间格式化 =====
    const formatTime = (ts) => {
      if (!ts) return '';
      const now = new Date();
      const d = new Date(ts);
      const diff = now - d;
      if (diff < 60000) return '刚刚';
      if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
      if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
      if (diff < 2592000000) return Math.floor(diff / 86400000) + '天前';
      return `${d.getMonth() + 1}月${d.getDate()}日`;
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

      // 加载自定义字体
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

      const [dark, api, savedPosts, savedSettings, savedConvs, savedCollections, savedProfile, charList] = await Promise.all([
        dbGet('darkMode'),
        dbGet('apiConfig'),
        dbGet('forumPostsV2'),
        dbGet('forumSettings'),
        dbGet('forumConversations'),
        dbGet('forumCollections'),
        dbGet('forumMyProfile'),
        dbGet('charList')
      ]);

      if (dark) document.body.classList.add('dark');
      if (api) apiConfig.value = api;
      if (savedPosts) posts.value = savedPosts;
      if (savedSettings) {
        settingsForm.value = {
          forumApi: { url: '', key: '', model: '' },
          dimHotPrompt: DEFAULT_DIM_HOT_PROMPT,
          categories: [],
          fixedNpcs: [],
          ...savedSettings
        };
        if (savedSettings.categories && savedSettings.categories.length) {
          categories.value = savedSettings.categories;
        }
      }
      if (savedConvs) conversations.value = savedConvs;
      if (savedCollections) collections.value = savedCollections;
      if (savedProfile) myProfile.value = savedProfile;
      if (charList) availableChars.value = charList;
      const savedDimHot = await dbGet('forumDimHotList');
      if (savedDimHot && savedDimHot.length) dimHotList.value = savedDimHot;

      fetchHotList(hotPlatform.value);
      nextTick(() => {
        refreshIcons();
        appReady.value = true;
        const mask = document.getElementById('forumLoadingMask');
        if (mask) {
          mask.classList.add('hide');
          setTimeout(() => mask.remove(), 400);
        }
      });
    });

    return {
      mainTab, goBack,
      categories, currentCat, currentCatPosts,
      myProfile, myPostsCount, saveProfile,
      currentPost, postFormShow, editingPost, postForm, postScrollRef,
      openPostDetail, openPostForm, submitPost,
      postMenuShow, menuTarget, openPostMenu, collectFromMenu, editFromMenu, deleteFromMenu,
      replyText, quotingReply, replyTextareaRef, replyMenuShow, editReplyShow, editReplyContent,
      generatingReplies, generateReplies,
      autoResizeReply, setQuoteReply, sendReply, getQuoteContent, scrollToReply,
      openReplyMenu, collectReplyFromMenu, editReplyFromMenu, confirmEditReply, deleteReplyFromMenu,
      likePost, likeReply, collections, isCollected, toggleCollect,
      collectionShow, collectionType, collectTab, collectionItems, openCollection, openCollectionItem,
      generating, generatePosts,
      hotTab, hotPlatform, hotList, hotLoading, hotError, hotPlatforms, hotPlatformsOrdered, fetchHotList, switchHotPlatform,
      hotDetailShow, hotDetailItem, hotDetailData, hotDetailLoading,
      openHotDetail, refreshHotDetail, postHotToForum,
      translating, translations, detectNeedTranslate, translateText,
      dimHotList, dimHotLoading, generateDimensionHot,
      searchType, searchQuery, searchLoading, searchResults, searchDone, aiSearchResult, doSearch,
      conversations, currentConv, pmText, pmBodyRef, pmTextareaRef,
      autoResizePM, openPM, openConversation, sendPM, pmGenerating, generatePMReply,
      settingsShow, expandedCats, availableChars, settingsForm, addCatShow, newCatName, newCatPrompt,
      forumModelList, fetchForumModels,
      openSettings, saveSettings, toggleCatExpand, toggleCatNpc, addCustomCategory, confirmAddCategory,
      availableWorldBooks, availableWorldBookCats, wbCatBooks, toggleCatWorldBook, toggleDimHotWorldBook,
      formatTime, movePlatform, resetPlatformOrder, appReady,
    };
  }
}).mount('#forum-app');
