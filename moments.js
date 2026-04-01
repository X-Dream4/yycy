const { createApp, ref, computed, onMounted, nextTick } = Vue;
createApp({
  setup() {
    const allChars = ref([]);
    const allMoments = ref([]);
    const myName = ref('我');
    const myAvatar = ref('');
    const apiConfig = ref({ url: '', key: '', model: '' });
    const postShow = ref(false);
    const postContent = ref('');
    const postVisibility = ref('all');
    const postVisibilityChars = ref([]);
    const headerBgUrl = ref('');
    const editingName = ref(false);
    const editNameInput = ref('');
    const headerBgFile = ref(null);
    const avatarFile = ref(null);
    const signature = ref('');
    const editingSignature = ref(false);
    const signatureInput = ref('');
    const detailMoment = ref(null);

    // 评论长按菜单
    const commentMenuShow = ref(false);
    const commentMenuMoment = ref(null);
    const commentMenuIndex = ref(-1);
    const commentMenuPos = ref({ top: 0, left: 0 });
    const commentEditShow = ref(false);
    const commentEditText = ref('');
    let commentLongPressTimer = null;

    const goBack = () => { window.location.href = 'chat.html'; };

    const headerBg = computed(() => {
      if (headerBgUrl.value) return `background-image:url(${headerBgUrl.value})`;
      return 'background: linear-gradient(135deg, #2a2a3a, #1a1a2a)';
    });

    const myAvatarStyle = computed(() => myAvatar.value ? `background-image:url(${myAvatar.value})` : '');

    const formatTime = (ts) => {
      if (!ts) return '';
      const now = new Date();
      const d = new Date(ts);
      const diff = now - d;
      if (diff < 60000) return '刚刚';
      if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
      if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
      if (diff < 2592000000) return Math.floor(diff / 86400000) + '天前';
      return `${d.getMonth()+1}月${d.getDate()}日`;
    };

    const visibilityLabel = (moment) => {
      if (moment.visibility === 'self') return '仅自己';
      if (moment.visibility === 'only') return '部分可见';
      if (moment.visibility === 'except') return '部分不可见';
      return '所有人';
    };

    const visibilityIcon = (moment) => {
      if (moment.visibility === 'self') return 'lock';
      if (moment.visibility === 'only') return 'users';
      if (moment.visibility === 'except') return 'user-x';
      return 'globe';
    };

    const canSeeMoment = (moment) => {
      if (moment.authorType === 'me') return true;
      if (moment.visibility === 'self') return false;
      if (moment.visibility === 'only') return moment.visibilityChars && moment.visibilityChars.includes('me');
      if (moment.visibility === 'except') return !moment.visibilityChars || !moment.visibilityChars.includes('me');
      return true;
    };

    const visibleMoments = computed(() => allMoments.value.filter(m => canSeeMoment(m)).slice().sort((a, b) => b.time - a.time));

    const toggleVisibilityChar = (id) => {
      const idx = postVisibilityChars.value.indexOf(id);
      if (idx === -1) postVisibilityChars.value.push(id);
      else postVisibilityChars.value.splice(idx, 1);
    };

    const openPost = () => {
      postContent.value = '';
      postVisibility.value = 'all';
      postVisibilityChars.value = [];
      postShow.value = true;
      nextTick(() => lucide.createIcons());
    };

    const submitPost = async () => {
      if (!postContent.value.trim()) return;
      const moment = {
        id: Date.now(),
        authorType: 'me',
        content: postContent.value.trim(),
        visibility: postVisibility.value,
        visibilityChars: JSON.parse(JSON.stringify(postVisibilityChars.value)),
        time: Date.now(),
        likes: 0,
        likedChars: [],
        likedByMe: false,
        comments: [],
        menuOpen: false,
        commentInput: ''
      };
      allMoments.value.unshift(moment);
      await saveMoments();
      postShow.value = false;
      nextTick(() => lucide.createIcons());
    };

    const toggleMenu = (moment) => {
      moment.menuOpen = !moment.menuOpen;
      nextTick(() => lucide.createIcons());
    };

    const submitComment = async (moment) => {
      if (!moment.commentInput || !moment.commentInput.trim()) return;
      if (!moment.comments) moment.comments = [];
      moment.comments.push({ name: myName.value, text: moment.commentInput.trim(), time: Date.now() });
      moment.commentInput = '';
      await saveMoments();
    };

    const deleteMoment = async (moment) => {
      if (!confirm('确定删除这条动态？')) return;
      const idx = allMoments.value.findIndex(m => m.id === moment.id);
      if (idx !== -1) { allMoments.value.splice(idx, 1); await saveMoments(); }
      nextTick(() => lucide.createIcons());
    };

    const getMomentDisplayName = (moment) => {
      if (moment.authorType === 'me') return myName.value;
      const char = allChars.value.find(c => c.id === moment.charId);
      return char?.name || moment.charName || '未知';
    };

    const getMomentAvatarUrl = (moment) => {
      if (moment.authorType === 'me') return myAvatar.value;
      const char = allChars.value.find(c => c.id === moment.charId);
      return char?.avatar || '';
    };

    const getMomentAvatarStyle = (moment) => {
      const url = getMomentAvatarUrl(moment);
      return url ? `background-image:url(${url})` : '';
    };

    const saveMoments = async () => {
      await dbSet('moments', JSON.parse(JSON.stringify(allMoments.value.map(m => {
        const { menuOpen, commentInput, dotMenuOpen, ...rest } = m;
        return rest;
      }))));
    };

    const triggerHeaderBg = () => { headerBgFile.value.click(); };
    const uploadHeaderBg = (e) => { const file = e.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = async (evt) => { headerBgUrl.value = evt.target.result; await dbSet('momentsBg', headerBgUrl.value); e.target.value = ''; }; reader.readAsDataURL(file); };
    const triggerAvatar = () => { avatarFile.value.click(); };
    const uploadAvatar = (e) => { const file = e.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = async (evt) => { myAvatar.value = evt.target.result; const s = (await dbGet('mySettings_global')) || {}; s.avatar = myAvatar.value; await dbSet('mySettings_global', s); e.target.value = ''; }; reader.readAsDataURL(file); };
    const startEditName = () => { editNameInput.value = myName.value; editingName.value = true; nextTick(() => { const el = document.getElementById('name-edit-input'); if (el) el.focus(); }); };
    const confirmEditName = async () => { if (!editNameInput.value.trim()) return; myName.value = editNameInput.value.trim(); editingName.value = false; const s = (await dbGet('mySettings_global')) || {}; s.name = myName.value; await dbSet('mySettings_global', s); };
    const startEditSignature = () => { signatureInput.value = signature.value; editingSignature.value = true; nextTick(() => { const el = document.querySelector('.moments-signature-edit'); if (el) el.focus(); }); };
    const confirmSignature = async () => { signature.value = signatureInput.value.trim(); editingSignature.value = false; const s = (await dbGet('mySettings_global')) || {}; s.signature = signature.value; await dbSet('mySettings_global', s); };
    const toggleDotMenu = (moment) => { const wasOpen = moment.dotMenuOpen; allMoments.value.forEach(m => { m.dotMenuOpen = false; }); moment.dotMenuOpen = !wasOpen; nextTick(() => lucide.createIcons()); };
    const closeDotMenu = (moment) => { moment.dotMenuOpen = false; };
    const togglePin = async (moment) => { moment.pinned = !moment.pinned; await saveMoments(); nextTick(() => lucide.createIcons()); };
    const openDetail = (moment) => { detailMoment.value = moment; nextTick(() => lucide.createIcons()); };
    const pinnedMoments = computed(() => allMoments.value.filter(m => m.pinned));
    const toggleLike = async (moment) => { moment.likedByMe = !moment.likedByMe; if (!moment.likedChars) moment.likedChars = []; if (moment.likedByMe) { if (!moment.likedChars.includes(myName.value)) moment.likedChars.push(myName.value); } else { moment.likedChars = moment.likedChars.filter(n => n !== myName.value); } await saveMoments(); };

    // ===== 评论长按菜单 =====
    const onCommentTouchStart = (moment, ci, e) => {
      const touch = e.touches[0];
      commentLongPressTimer = setTimeout(() => {
        // 只允许操作自己的评论
        const comment = moment.comments[ci];
        if (!comment || comment.name !== myName.value) return;
        commentMenuMoment.value = moment;
        commentMenuIndex.value = ci;
        commentMenuPos.value = { top: touch.clientY, left: touch.clientX };
        commentMenuShow.value = true;
        nextTick(() => lucide.createIcons());
      }, 500);
    };

    const onCommentTouchEnd = () => { clearTimeout(commentLongPressTimer); };
    const onCommentTouchMove = () => { clearTimeout(commentLongPressTimer); };

    const onCommentMouseDown = (moment, ci, e) => {
      commentLongPressTimer = setTimeout(() => {
        const comment = moment.comments[ci];
        if (!comment || comment.name !== myName.value) return;
        commentMenuMoment.value = moment;
        commentMenuIndex.value = ci;
        commentMenuPos.value = { top: e.clientY, left: e.clientX };
        commentMenuShow.value = true;
        nextTick(() => lucide.createIcons());
      }, 500);
    };

    const onCommentMouseUp = () => { clearTimeout(commentLongPressTimer); };

    const closeCommentMenu = () => {
      commentMenuShow.value = false;
      commentMenuMoment.value = null;
      commentMenuIndex.value = -1;
    };

    const deleteComment = async () => {
      const moment = commentMenuMoment.value;
      const ci = commentMenuIndex.value;
      if (!moment || ci < 0) return;
      moment.comments.splice(ci, 1);
      await saveMoments();
      closeCommentMenu();
    };

    const openEditComment = () => {
      const moment = commentMenuMoment.value;
      const ci = commentMenuIndex.value;
      if (!moment || ci < 0) return;
      commentEditText.value = moment.comments[ci].text;
      commentEditShow.value = true;
      commentMenuShow.value = false;
      nextTick(() => lucide.createIcons());
    };

    const confirmEditComment = async () => {
      if (!commentEditText.value.trim()) return;
      const moment = commentMenuMoment.value;
      const ci = commentMenuIndex.value;
      if (!moment || ci < 0) return;
      moment.comments[ci].text = commentEditText.value.trim();
      await saveMoments();
      commentEditShow.value = false;
      closeCommentMenu();
    };

    onMounted(async () => {
      const savedGlobalCss = await dbGet('globalCss');
      if (savedGlobalCss) {
        let el = document.getElementById('global-custom-css');
        if (!el) { el = document.createElement('style'); el.id = 'global-custom-css'; document.head.appendChild(el); }
        el.textContent = savedGlobalCss;
      }
      const dark = await dbGet('darkMode');
      if (dark) document.body.classList.add('dark');
      const savedFont = await dbGet('customFont');
      if (savedFont && savedFont.src) { let style = document.getElementById('custom-font-style'); if (!style) { style = document.createElement('style'); style.id = 'custom-font-style'; document.head.appendChild(style); } style.textContent = `@font-face { font-family: 'CustomGlobalFont'; src: url('${savedFont.src}'); } * { font-family: 'CustomGlobalFont', -apple-system, 'PingFang SC', 'Helvetica Neue', sans-serif !important; }`; }
      const [charList, randomCharList, api, savedMoments] = await Promise.all([dbGet('charList'), dbGet('randomCharList'), dbGet('apiConfig'), dbGet('moments')]);
      const chars = [...(charList || []), ...(randomCharList || [])];
      for (const char of chars) { const beauty = await dbGet(`chatBeauty_${char.id}`); if (beauty && beauty.charAvatar) char.avatar = beauty.charAvatar; }
      allChars.value = chars;
      if (api) apiConfig.value = api;
      if (savedMoments) {
        allMoments.value = savedMoments.map(m => ({ ...m, menuOpen: false, commentInput: '', dotMenuOpen: false }));
      }
      const mySettings = await dbGet('mySettings_global');
      if (mySettings) { myName.value = mySettings.name || '我'; myAvatar.value = mySettings.avatar || ''; signature.value = mySettings.signature || ''; }
      const wallpaper = await dbGet('wallpaper');
      const momentsBg = await dbGet('momentsBg');
      if (momentsBg) headerBgUrl.value = momentsBg;
      else if (wallpaper) headerBgUrl.value = wallpaper;
      setTimeout(() => { lucide.createIcons(); }, 50);
    });

    return {
      allChars, allMoments, visibleMoments, myName, myAvatar, myAvatarStyle, headerBg,
      postShow, postContent, postVisibility, postVisibilityChars,
      formatTime, visibilityLabel, visibilityIcon, toggleVisibilityChar,
      openPost, submitPost, toggleMenu, submitComment, deleteMoment, goBack,
      editingName, editNameInput, headerBgFile, avatarFile,
      triggerHeaderBg, uploadHeaderBg, triggerAvatar, uploadAvatar,
      startEditName, confirmEditName, toggleLike,
      signature, editingSignature, signatureInput, startEditSignature, confirmSignature,
      toggleDotMenu, closeDotMenu, togglePin, openDetail, detailMoment, pinnedMoments,
      getMomentDisplayName, getMomentAvatarUrl, getMomentAvatarStyle,
      commentMenuShow, commentMenuMoment, commentMenuIndex, commentMenuPos,
      commentEditShow, commentEditText,
      onCommentTouchStart, onCommentTouchEnd, onCommentTouchMove,
      onCommentMouseDown, onCommentMouseUp,
      closeCommentMenu, deleteComment, openEditComment, confirmEditComment,
    };
  }
}).mount('#moments-app');
