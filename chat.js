const { createApp, ref, computed, onMounted, nextTick } = Vue;

createApp({
  setup() {
    const menuOpen = ref(false);
    const menuBtnRef = ref(null);
    const charList = ref([]);
    const roomList = ref([]);
    const randomCharList = ref([]);
    const connectCharShow = ref(false);
    const connectRoomShow = ref(false);
    const newChar = ref({ name: '', world: '', persona: '', avatar: '' });
    const newRoom = ref({ name: '', members: [] });

    // ===== 长按菜单 =====
    const pressMenuShow = ref(false);
    const pressMenuItem = ref(null);
    const pressMenuType = ref(''); // 'char' | 'room' | 'random'
    let pressTimer = null;
    let pressMoved = false;

    const onItemTouchStart = (item, type, e) => {
      pressMoved = false;
      pressTimer = setTimeout(() => {
        if (!pressMoved) {
          pressMenuItem.value = item;
          pressMenuType.value = type;
          pressMenuShow.value = true;
        }
      }, 500);
    };
    const onItemTouchMove = () => { pressMoved = true; clearTimeout(pressTimer); };
    const onItemTouchEnd = () => { clearTimeout(pressTimer); };
    const onItemMouseDown = (item, type) => {
      pressMoved = false;
      pressTimer = setTimeout(() => {
        pressMenuItem.value = item;
        pressMenuType.value = type;
        pressMenuShow.value = true;
      }, 500);
    };
    const onItemMouseUp = () => { clearTimeout(pressTimer); };
    const closePressMenu = () => { pressMenuShow.value = false; pressMenuItem.value = null; };

    const togglePin = async () => {
      const item = pressMenuItem.value;
      const type = pressMenuType.value;
      item.pinned = !item.pinned;
      if (type === 'char') await dbSet('charList', JSON.parse(JSON.stringify(charList.value)));
      else if (type === 'room') await dbSet('roomList', JSON.parse(JSON.stringify(roomList.value)));
      else if (type === 'random') await dbSet('randomCharList', JSON.parse(JSON.stringify(randomCharList.value)));
      closePressMenu();
    };

    const deleteItem = async () => {
      const item = pressMenuItem.value;
      const type = pressMenuType.value;
      if (!confirm(`确定要删除「${item.name}」吗？所有聊天记录将被永久删除`)) return;
      if (type === 'char') {
        charList.value = charList.value.filter(x => x.id !== item.id);
        await dbSet('charList', JSON.parse(JSON.stringify(charList.value)));
      } else if (type === 'room') {
        roomList.value = roomList.value.filter(x => x.id !== item.id);
        await dbSet('roomList', JSON.parse(JSON.stringify(roomList.value)));
      } else if (type === 'random') {
        randomCharList.value = randomCharList.value.filter(x => x.id !== item.id);
        await dbSet('randomCharList', JSON.parse(JSON.stringify(randomCharList.value)));
      }
      closePressMenu();
    };

    // ===== 排序 =====
    const sortedCharList = computed(() => {
      return [...charList.value].sort((a, b) => {
        if (!!b.pinned !== !!a.pinned) return b.pinned ? 1 : -1;
        return (b.lastTime || b.id || 0) - (a.lastTime || a.id || 0);
      });
    });

    const sortedRoomList = computed(() => {
      return [...roomList.value]
        .filter(r => !r.isSocialRoom)
        .sort((a, b) => {
          if (!!b.pinned !== !!a.pinned) return b.pinned ? 1 : -1;
          return (b.lastTime || b.id || 0) - (a.lastTime || a.id || 0);
        });
    });

    const sortedRandomList = computed(() => {
      return [...randomCharList.value].sort((a, b) => {
        if (!!b.pinned !== !!a.pinned) return b.pinned ? 1 : -1;
        return (b.lastTime || b.id || 0) - (a.lastTime || a.id || 0);
      });
    });

    let lucideTimer = null;
    const refreshIcons = () => { clearTimeout(lucideTimer); lucideTimer = setTimeout(() => { lucide.createIcons(); setTimeout(() => lucide.createIcons(), 200); }, 50); };
    const applyAvatarToList = async (list) => {
      await Promise.all((list || []).map(async (c) => {
        const beauty = await dbGet(`chatBeauty_${c.id}`);
        if (beauty?.charAvatar) c.avatar = beauty.charAvatar;
        else if (beauty?.avatar) c.avatar = beauty.avatar;
        else if (!c.avatar) c.avatar = '';
      }));
    };

    const toggleMenu = () => { menuOpen.value = !menuOpen.value; };
    const openConnectChar = () => { menuOpen.value = false; newChar.value = { name: '', world: '', persona: '', avatar: '' }; connectCharShow.value = true; nextTick(() => refreshIcons()); };
    const openConnectRoom = () => { menuOpen.value = false; newRoom.value = { name: '', members: [] }; connectRoomShow.value = true; nextTick(() => refreshIcons()); };
    const goRandom = () => { menuOpen.value = false; window.location.href = 'random.html'; };
    const goToWorldbook = () => { menuOpen.value = false; window.location.href = 'worldbook.html'; };
    const goBack = () => { window.location.href = 'index.html'; };

    const confirmConnectChar = async () => {
      if (!newChar.value.name.trim()) { alert('请输入备注名'); return; }
      connectCharShow.value = false;
      const char = { id: Date.now(), name: newChar.value.name.trim(), world: newChar.value.world.trim(), persona: newChar.value.persona.trim(), avatar: '', lastMsg: '', lastTime: Date.now(), pinned: false, messages: [] };
      charList.value.push(char);
      await dbSet('charList', JSON.parse(JSON.stringify(charList.value)));
      nextTick(() => refreshIcons());
    };

    const confirmConnectRoom = async () => {
      if (!newRoom.value.name.trim()) { alert('请输入聊天室名称'); return; }
      if (!newRoom.value.members.length) { alert('请至少选择一个角色'); return; }
      connectRoomShow.value = false;
      const room = { id: Date.now(), name: newRoom.value.name.trim(), members: JSON.parse(JSON.stringify(newRoom.value.members)), lastMsg: '', lastTime: Date.now(), pinned: false, messages: [] };
      roomList.value.push(room);
      await dbSet('roomList', JSON.parse(JSON.stringify(roomList.value)));
      nextTick(() => refreshIcons());
    };

    const toggleMember = (c) => {
      const idx = newRoom.value.members.findIndex(m => m.id === c.id);
      if (idx === -1) { newRoom.value.members.push(c); } else { newRoom.value.members.splice(idx, 1); }
    };

    const enterChat = (c) => { window.location.href = `chatroom.html?id=${c.id}&type=char`; };
    const enterRoom = (r) => { window.location.href = `groupchat.html?id=${r.id}`; };
    const enterRandomChat = (c) => { window.location.href = `chatroom.html?id=${c.id}&type=char`; };

    const deleteRandomChar = async (c) => {
      if (!confirm(`确定要删除「${c.name}」吗？所有聊天记录将被永久删除`)) return;
      randomCharList.value = randomCharList.value.filter(x => x.id !== c.id);
      await dbSet('randomCharList', JSON.parse(JSON.stringify(randomCharList.value)));
    };

    const handleOutsideClick = (e) => {
      if (menuOpen.value && menuBtnRef.value && !menuBtnRef.value.contains(e.target)) { menuOpen.value = false; }
      if (pressMenuShow.value) { closePressMenu(); }
    };

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

      const [dark, wp, chars, rooms] = await Promise.all([
        dbGet('darkMode'), dbGet('wallpaper'), dbGet('charList'), dbGet('roomList')
      ]);

      if (dark) document.body.classList.add('dark');
      const pageWp = await dbGet('wallpaper_chat');
      const globalOn = await dbGet('wallpaperGlobal');
      const finalWp = pageWp || (globalOn ? wp : '');
      if (finalWp) { document.body.style.backgroundImage = `url(${finalWp})`; document.body.style.backgroundSize = 'cover'; document.body.style.backgroundPosition = 'center'; }
      charList.value = chars || [];
      roomList.value = rooms || [];

      await applyAvatarToList(charList.value);

      const randomChars = await dbGet('randomCharList');
      randomCharList.value = randomChars || [];
      await applyAvatarToList(randomCharList.value);

      window.addEventListener('focus', async () => {
        const [newChars, newRooms, newRandomChars] = await Promise.all([
          dbGet('charList'), dbGet('roomList'), dbGet('randomCharList')
        ]);
        charList.value = newChars || [];
        roomList.value = newRooms || [];
        randomCharList.value = newRandomChars || [];
        await applyAvatarToList(charList.value);
        await applyAvatarToList(randomCharList.value);
        nextTick(() => refreshIcons());
      });

      nextTick(() => refreshIcons());
      document.addEventListener('click', handleOutsideClick);
      setTimeout(() => { lucide.createIcons(); refreshIcons(); }, 100);
      setTimeout(() => { lucide.createIcons(); }, 500);
    });

    return {
      menuOpen, menuBtnRef, charList, roomList, randomCharList,
      sortedCharList, sortedRoomList, sortedRandomList,
      connectCharShow, connectRoomShow, newChar, newRoom,
      toggleMenu, openConnectChar, openConnectRoom, goRandom, goBack, goToWorldbook,
      confirmConnectChar, confirmConnectRoom, toggleMember,
      enterChat, enterRoom, enterRandomChat, deleteRandomChar,
      pressMenuShow, pressMenuItem, pressMenuType,
      onItemTouchStart, onItemTouchMove, onItemTouchEnd,
      onItemMouseDown, onItemMouseUp,
      closePressMenu, togglePin, deleteItem,
    };
  }
}).mount('#chat-app');
