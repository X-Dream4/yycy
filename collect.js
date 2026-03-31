const { createApp, ref, computed, onMounted } = Vue;

createApp({
  setup() {
    const allChars = ref([]);
    const allRooms = ref([]);
    const collects = ref([]);
    const currentChar = ref(null);
    const currentRoom = ref(null);
    const currentType = ref('all');
    const viewMode = ref('chars');

    const goBack = () => { window.location.href = 'index.html'; };
const htmlPreviewContent = ref(null);
const previewHtml = (content) => { htmlPreviewContent.value = content; };

    const typeLabel = (type) => ({
      message: '消息', whisper: '心声', peek: '窥探',
      mirror: '时境', summary: '总结', theater: '剧场'
    }[type] || type);

    const charGroups = computed(() => {
      const groups = {};
      collects.value.filter(c => c.charId != null && c.sourceType !== 'room').forEach(item => {
        const key = item.charId;
        if (!groups[key]) {
          const char = allChars.value.find(c => c.id == key);
          groups[key] = { char: char || { id: key, name: item.charName || '未知角色', avatar: '' }, items: [], total: 0 };
        }
        groups[key].items.push(item);
        groups[key].total++;
      });
      return Object.values(groups).sort((a, b) => b.total - a.total);
    });

    const roomGroups = computed(() => {
      const groups = {};
      collects.value.filter(c => c.sourceType === 'room').forEach(item => {
        const key = item.roomId;
        if (!groups[key]) {
          const room = allRooms.value.find(r => r.id == key);
          groups[key] = { room: room || { id: key, name: item.roomName || '未知聊天室' }, items: [], total: 0 };
        }
        groups[key].items.push(item);
        groups[key].total++;
      });
      return Object.values(groups).sort((a, b) => b.total - a.total);
    });

    const filteredCollects = computed(() => {
      let items = [];
      if (currentChar.value) {
        items = collects.value.filter(c => c.charId == currentChar.value.id && c.sourceType !== 'room');
      } else if (currentRoom.value) {
        items = collects.value.filter(c => c.roomId == currentRoom.value.id && c.sourceType === 'room');
      }
      if (currentType.value !== 'all') items = items.filter(c => c.type === currentType.value);
      return items.sort((a, b) => b.time - a.time);
    });

    const openChar = (char) => { currentChar.value = char; currentRoom.value = null; currentType.value = 'all'; };
    const openRoom = (room) => { currentRoom.value = room; currentChar.value = null; currentType.value = 'all'; };
    const goBackList = () => { currentChar.value = null; currentRoom.value = null; };

    const currentTitle = computed(() => {
      if (currentChar.value) return currentChar.value.name + ' 的收藏';
      if (currentRoom.value) return currentRoom.value.name + ' 的收藏';
      return '收藏';
    });

    const deleteCollect = async (item) => {
      if (!confirm('确定删除这条收藏？')) return;
      collects.value = collects.value.filter(c => c.id !== item.id);
      await dbSet('collects', JSON.parse(JSON.stringify(collects.value)));
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
      const savedFont = await dbGet('customFont');
      if (savedFont && savedFont.src) {
        let style = document.getElementById('custom-font-style');
        if (!style) { style = document.createElement('style'); style.id = 'custom-font-style'; document.head.appendChild(style); }
        style.textContent = `@font-face { font-family: 'CustomGlobalFont'; src: url('${savedFont.src}'); } * { font-family: 'CustomGlobalFont', -apple-system, 'PingFang SC', 'Helvetica Neue', sans-serif !important; }`;
      }
      const dark = await dbGet('darkMode');
      if (dark) document.body.classList.add('dark');
      const pageWp = await dbGet('wallpaper_collect');
      const globalOn = await dbGet('wallpaperGlobal');
      const globalWp = await dbGet('wallpaper');
      const finalWp = pageWp || (globalOn ? globalWp : '');
      if (finalWp) { document.body.style.backgroundImage = `url(${finalWp})`; document.body.style.backgroundSize = 'cover'; document.body.style.backgroundPosition = 'center'; }

      const [charList, randomCharList, roomList, savedCollects] = await Promise.all([
        dbGet('charList'), dbGet('randomCharList'), dbGet('roomList'), dbGet('collects')
      ]);

      const chars = [...(charList || []), ...(randomCharList || [])];
      for (const char of chars) {
        const beauty = await dbGet(`chatBeauty_${char.id}`);
        if (beauty && beauty.charAvatar) char.avatar = beauty.charAvatar;
      }
      allChars.value = chars;
      allRooms.value = roomList || [];
      if (savedCollects) collects.value = savedCollects;

      setTimeout(() => { lucide.createIcons(); }, 50);
      setTimeout(() => { lucide.createIcons(); }, 250);
      setTimeout(() => { lucide.createIcons(); }, 500);
    });

    return {
      allChars, allRooms, collects, currentChar, currentRoom, currentType, viewMode,
      charGroups, roomGroups, filteredCollects, currentTitle,
      goBack, goBackList, openChar, openRoom, deleteCollect, typeLabel, formatTime,
htmlPreviewContent, previewHtml,
 htmlPreviewContent, previewHtml, 
    };
  }
}).mount('#collect-app');
