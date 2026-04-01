const { createApp, ref, computed, onMounted } = Vue;

createApp({
  setup() {
    const currentTab = ref('home');
    const tabTitles = { home: '涟波', discover: '发现', publish: '发布', messages: '消息', mine: '我的' };
    const allChars = ref([]);
    const posts = ref([]);
    const generating = ref(false);
    const profileChar = ref(null);
    const profileTab = ref('posts');
    const commentPost = ref(null);
    const commentText = ref('');
    const viewingImage = ref(null);
    const showNewPost = ref(false);
    const newPostContent = ref('');
    const newPostTag = ref('');
    const newPostTags = ref([]);
    const apiConfig = ref({ url: '', key: '', model: '' });

    const sortedPosts = computed(() => [...posts.value].sort((a, b) => b.time - a.time));
    const myPosts = computed(() => posts.value.filter(p => p.charId === 'me').sort((a, b) => b.time - a.time));
    const hotTopics = computed(() => {
      const tagCount = {};
      posts.value.forEach(p => { (p.tags || []).forEach(t => { tagCount[t] = (tagCount[t] || 0) + 1; }); });
      return Object.entries(tagCount).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([tag, count]) => ({ tag, count }));
    });

    const goBack = () => { window.location.href = 'index.html'; };

    const getCharAvatarUrl = (charId) => {
      if (!charId || charId === 'me') return '';
      const char = allChars.value.find(c => c.id === charId);
      return char?.avatar || '';
    };

    const getCharAvatar = (charId) => {
      const url = getCharAvatarUrl(charId);
      return url ? { backgroundImage: `url(${url})` } : {};
    };

    const openCharProfile = (char) => {
      profileChar.value = char;
      profileTab.value = 'posts';
    };

    const openCharProfileById = (charId) => {
      if (!charId || charId === 'me') return;
      const char = allChars.value.find(c => c.id === charId);
      if (char) openCharProfile(char);
    };

    const getCharPosts = (charId) => posts.value.filter(p => p.charId === charId).sort((a, b) => b.time - a.time);
    const getCharPostCount = (charId) => getCharPosts(charId).length;
    const getCharPhotos = (charId) => {
      const imgs = [];
      getCharPosts(charId).forEach(p => { if (p.images && p.images.length) imgs.push(...p.images); });
      return imgs;
    };

    const likePost = async (post) => {
      post.liked = !post.liked;
      post.likes = (post.likes || 0) + (post.liked ? 1 : -1);
      await savePosts();
    };

    const retweetPost = async (post) => {
      post.retweets = (post.retweets || 0) + 1;
      await savePosts();
    };

    const openComments = (post) => {
      commentPost.value = post;
    };

    const submitComment = async () => {
      if (!commentText.value.trim() || !commentPost.value) return;
      if (!commentPost.value.comments) commentPost.value.comments = [];
      commentPost.value.comments.push({
        authorName: '我',
        charId: 'me',
        content: commentText.value.trim(),
        time: Date.now()
      });
      commentText.value = '';
      await savePosts();
    };

    const openImage = (img) => { viewingImage.value = img; };

    const openNewPost = () => {
      newPostContent.value = '';
      newPostTags.value = [];
      newPostTag.value = '';
      showNewPost.value = true;
    };

    const addTag = () => {
      const t = newPostTag.value.trim().replace(/^#/, '');
      if (t && !newPostTags.value.includes(t)) newPostTags.value.push(t);
      newPostTag.value = '';
    };

    const submitPost = async () => {
      if (!newPostContent.value.trim()) return;
      const post = {
        id: Date.now(),
        charId: 'me',
        authorName: '我',
        content: newPostContent.value.trim(),
        tags: [...newPostTags.value],
        type: newPostTags.value.length ? 'topic' : 'text',
        time: Date.now(),
        likes: 0,
        liked: false,
        retweets: 0,
        comments: []
      };
      posts.value.push(post);
      await savePosts();
      newPostContent.value = '';
      newPostTags.value = [];
      showNewPost.value = false;
      currentTab.value = 'home';
    };

    const generatePost = async () => {
      if (!apiConfig.value.url || !apiConfig.value.key || !apiConfig.value.model) {
        alert('请先在设置里配置API'); return;
      }
      if (!allChars.value.length) { alert('还没有连接任何角色'); return; }
      generating.value = true;
      const char = allChars.value[Math.floor(Math.random() * allChars.value.length)];
      const prompt = `你是${char.name}。${char.persona ? '人设：' + char.persona + '。' : ''}${char.world ? '世界观：' + char.world + '。' : ''}
请以${char.name}的身份，在涟波社交App上发一条真实的动态。要求：
1. 口语化，像真实发帖一样自然
2. 内容基于角色人设和日常生活
3. 可以带1-3个话题标签
4. 字数50-150字

请返回JSON格式：
{"content":"动态正文","tags":["话题1","话题2"]}
只返回JSON，不要其他文字。`;
      try {
        const res = await fetch(`${apiConfig.value.url.replace(/\/$/, '')}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiConfig.value.key}` },
          body: JSON.stringify({ model: apiConfig.value.model, messages: [{ role: 'user', content: prompt }] })
        });
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content || '{}';
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          const post = {
            id: Date.now(),
            charId: char.id,
            authorName: char.name,
            content: parsed.content || '',
            tags: parsed.tags || [],
            type: (parsed.tags && parsed.tags.length) ? 'topic' : 'text',
            time: Date.now(),
            likes: Math.floor(Math.random() * 30),
            liked: false,
            retweets: Math.floor(Math.random() * 10),
            comments: []
          };
          posts.value.push(post);
          await savePosts();
        }
      } catch (e) {
        alert('生成失败：' + e.message);
      }
      generating.value = false;
    };

    const filterByTopic = (tag) => {
      currentTab.value = 'home';
    };

    const savePosts = async () => {
      await dbSet('sharePosts', JSON.parse(JSON.stringify(posts.value)));
    };

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

    onMounted(async () => {
      const savedGlobalCss = await dbGet('globalCss');
      if (savedGlobalCss) {
        let el = document.getElementById('global-custom-css');
        if (!el) { el = document.createElement('style'); el.id = 'global-custom-css'; document.head.appendChild(el); }
        el.textContent = savedGlobalCss;
      }
      const savedFont = await dbGet('customFont');
      if (savedFont && savedFont.src) {
        let style = document.getElementById('custom-font-style');
        if (!style) { style = document.createElement('style'); style.id = 'custom-font-style'; document.head.appendChild(style); }
        style.textContent = `@font-face { font-family: 'CustomGlobalFont'; src: url('${savedFont.src}'); } * { font-family: 'CustomGlobalFont', -apple-system, 'PingFang SC', 'Helvetica Neue', sans-serif !important; }`;
      }
      const dark = await dbGet('darkMode');
      if (dark) document.body.classList.add('dark');
      const pageWp = await dbGet('wallpaper_share');
      const globalOn = await dbGet('wallpaperGlobal');
      const globalWp = await dbGet('wallpaper');
      const finalWp = pageWp || (globalOn ? globalWp : '');
      if (finalWp) { document.body.style.backgroundImage = `url(${finalWp})`; document.body.style.backgroundSize = 'cover'; document.body.style.backgroundPosition = 'center'; }

      const [charList, randomCharList, api, savedPosts] = await Promise.all([
        dbGet('charList'), dbGet('randomCharList'), dbGet('apiConfig'), dbGet('sharePosts')
      ]);

      const chars = [...(charList || []), ...(randomCharList || [])];
      for (const char of chars) {
        const beauty = await dbGet(`chatBeauty_${char.id}`);
        if (beauty && beauty.charAvatar) char.avatar = beauty.charAvatar;
      }
      allChars.value = chars;

      if (api) apiConfig.value = api;
      if (savedPosts) posts.value = savedPosts;

      setTimeout(() => { lucide.createIcons(); }, 50);
      setTimeout(() => { lucide.createIcons(); }, 250);
      setTimeout(() => { lucide.createIcons(); }, 500);
    });

    return {
      currentTab, tabTitles, allChars, posts, generating,
      profileChar, profileTab, commentPost, commentText,
      viewingImage, showNewPost, newPostContent, newPostTag, newPostTags,
      sortedPosts, myPosts, hotTopics,
      goBack, getCharAvatar, getCharAvatarUrl,
      openCharProfile, openCharProfileById,
      getCharPosts, getCharPostCount, getCharPhotos,
      likePost, retweetPost, openComments, submitComment,
      openImage, openNewPost, addTag, submitPost, generatePost,
      filterByTopic, formatTime,
    };
  }
}).mount('#share-app');
