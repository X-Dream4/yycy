const { createApp, ref, computed, onMounted, nextTick } = Vue;

createApp({
  setup() {
    const allChars = ref([]);
    const allRooms = ref([]);
    const charsWithMemory = ref([]);
    const showAllChars = ref(false);
    const currentChar = ref(null);
    const currentCharMemories = ref([]);
    const currentCharGroups = ref([]);
    const expandedGroups = ref([]);

    const globalSettings = ref({
      injectOn: true,
      myChatsCount: 20,
      groupsCount: 3
    });

    const injectEditShow = ref(false);
    const injectEditGroup = ref(null);
    const injectEditTarget = ref(null);
    const injectEditMyChats = ref([]);
    const injectEditGroups = ref([]);

    const editMemoryShow = ref(false);
    const editMemoryIsNew = ref(false);
    const editMemoryId = ref(null);
    const editMemoryForm = ref({
      summary: '',
      score: 0.5,
      type: 'private',
      withWho: '',
      sourceFrom: ''
    });

    let lucideTimer = null;
    const refreshIcons = () => {
      clearTimeout(lucideTimer);
      lucideTimer = setTimeout(() => { lucide.createIcons(); }, 50);
    };

    const goBack = () => { window.location.href = 'index.html'; };

    const saveGlobalSettings = async () => {
      await dbSet('memoryGlobalSettings', JSON.parse(JSON.stringify(globalSettings.value)));
    };

    const formatTime = (ts) => {
      if (!ts) return '';
      const d = new Date(ts);
      return `${d.getMonth()+1}/${d.getDate()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
    };

    const loadAllData = async () => {
      const dark = await dbGet('darkMode');
      if (dark) document.body.classList.add('dark');

      const [charList, randomCharList, roomList, settings] = await Promise.all([
        dbGet('charList'), dbGet('randomCharList'), dbGet('roomList'), dbGet('memoryGlobalSettings')
      ]);

      const chars = [...(charList || []), ...(randomCharList || [])];
      allChars.value = chars;
      allRooms.value = roomList || [];

      if (settings) {
        globalSettings.value = { ...globalSettings.value, ...settings };
      }

      for (const c of allChars.value) {
        const b = await dbGet(`chatBeauty_${c.id}`);
        if (b && b.charAvatar) c.avatar = b.charAvatar;
      }

      await refreshCharList();
      refreshIcons();
    };

    const refreshCharList = async () => {
      const result = [];
      for (const char of allChars.value) {
        const mems = await dbGet(`charMemory_${char.id}`);
        if (mems && mems.length) {
          result.push({ ...char, memoryCount: mems.length });
        } else if (showAllChars.value) {
          result.push({ ...char, memoryCount: 0 });
        }
      }
      charsWithMemory.value = result;
    };

    const toggleShowAllChars = async () => {
      showAllChars.value = !showAllChars.value;
      await refreshCharList();
      refreshIcons();
    };

    const openCharDetail = async (char) => {
      currentChar.value = char;
      await loadCharMemories(char.id);
      nextTick(() => refreshIcons());
    };

    const loadCharMemories = async (charId) => {
      const mems = JSON.parse(JSON.stringify((await dbGet(`charMemory_${charId}`)) || []));
      currentCharMemories.value = mems;

      const groupMap = {};
      for (const mem of mems) {
        const key = mem.groupKey || `auto_${mem.type}_${mem.withWho}`;
        if (!mem.groupKey) mem.groupKey = key;
        if (!groupMap[key]) {
          groupMap[key] = {
            groupKey: key,
            type: mem.type,
            name: mem.withWho || key,
            injectTo: mem.groupInjectTo || { myChats: [], groups: [] }
          };
        }
      }

      const groupSettings = JSON.parse(JSON.stringify((await dbGet(`charMemoryGroups_${currentChar.value.id}`)) || []));
      for (const gs of groupSettings) {
        if (groupMap[gs.groupKey]) {
          groupMap[gs.groupKey].injectTo = gs.injectTo;
        }
      }

      currentCharGroups.value = Object.values(groupMap);
    };

    const saveCharMemories = async () => {
      await dbSet(`charMemory_${currentChar.value.id}`, JSON.parse(JSON.stringify(currentCharMemories.value)));
      const idx = charsWithMemory.value.findIndex(c => c.id === currentChar.value.id);
      if (idx !== -1) charsWithMemory.value[idx].memoryCount = currentCharMemories.value.length;
    };

    const saveCharGroups = async () => {
      await dbSet(`charMemoryGroups_${currentChar.value.id}`, JSON.parse(JSON.stringify(currentCharGroups.value)));
    };

    const toggleGroupExpand = (key) => {
      const idx = expandedGroups.value.indexOf(key);
      if (idx === -1) expandedGroups.value.push(key);
      else expandedGroups.value.splice(idx, 1);
      nextTick(() => refreshIcons());
    };

    const getMemoriesByGroup = (groupKey) => {
      return currentCharMemories.value.filter(m => m.groupKey === groupKey)
        .slice().sort((a, b) => b.score - a.score);
    };

    const getInjectSummary = (group) => {
      if (!group.injectTo) return '未设置';
      const parts = [];
      if (group.injectTo.myChats && group.injectTo.myChats.length) {
        const names = group.injectTo.myChats.map(id => {
          const c = allChars.value.find(c => c.id === id);
          return c ? c.name : id;
        });
        parts.push(`单聊：${names.join('、')}`);
      }
      if (group.injectTo.groups && group.injectTo.groups.length) {
        const names = group.injectTo.groups.map(id => {
          const r = allRooms.value.find(r => r.id === id);
          return r ? r.name : id;
        });
        parts.push(`群聊：${names.join('、')}`);
      }
      return parts.length ? parts.join('；') : '未设置';
    };

    const openInjectEdit = (group, mem) => {
      injectEditGroup.value = group;
      injectEditTarget.value = mem;

      let currentInjectTo;
      if (mem && mem.injectOverride) {
        currentInjectTo = mem.injectOverride;
      } else if (mem) {
        currentInjectTo = group.injectTo || { myChats: [], groups: [] };
      } else {
        currentInjectTo = group.injectTo || { myChats: [], groups: [] };
      }

      injectEditMyChats.value = [...(currentInjectTo.myChats || [])];
      injectEditGroups.value = [...(currentInjectTo.groups || [])];
      injectEditShow.value = true;
      nextTick(() => refreshIcons());
    };

    const isInjectMyChatSelected = (charId) => injectEditMyChats.value.includes(charId);
    const isInjectGroupSelected = (roomId) => injectEditGroups.value.includes(roomId);

    const toggleInjectMyChat = (charId) => {
      const idx = injectEditMyChats.value.indexOf(charId);
      if (idx === -1) injectEditMyChats.value.push(charId);
      else injectEditMyChats.value.splice(idx, 1);
    };

    const toggleInjectGroup = (roomId) => {
      const idx = injectEditGroups.value.indexOf(roomId);
      if (idx === -1) injectEditGroups.value.push(roomId);
      else injectEditGroups.value.splice(idx, 1);
    };

    const clearInjectOverride = () => {
      if (injectEditTarget.value) {
        injectEditTarget.value.injectOverride = null;
        saveCharMemories();
      }
      injectEditShow.value = false;
    };

    const saveInjectEdit = async () => {
      const newInjectTo = {
        myChats: [...injectEditMyChats.value],
        groups: [...injectEditGroups.value]
      };

      if (injectEditTarget.value) {
        injectEditTarget.value.injectOverride = newInjectTo;
        await saveCharMemories();
      } else {
        injectEditGroup.value.injectTo = newInjectTo;
        const gIdx = currentCharGroups.value.findIndex(g => g.groupKey === injectEditGroup.value.groupKey);
        if (gIdx !== -1) currentCharGroups.value[gIdx].injectTo = newInjectTo;
        await saveCharGroups();
      }

      injectEditShow.value = false;
    };

    const openEditMemory = (mem) => {
      editMemoryIsNew.value = false;
      editMemoryId.value = mem.id;
      editMemoryForm.value = {
        summary: mem.summary || '',
        score: mem.score || 0.5,
        type: mem.type || 'private',
        withWho: mem.withWho || '',
        sourceFrom: mem.sourceFrom || ''
      };
      editMemoryShow.value = true;
    };

    const openAddMemory = () => {
      editMemoryIsNew.value = true;
      editMemoryId.value = null;
      editMemoryForm.value = {
        summary: '',
        score: 0.5,
        type: 'private',
        withWho: '',
        sourceFrom: ''
      };
      editMemoryShow.value = true;
    };

    const saveEditMemory = async () => {
      if (!editMemoryForm.value.summary.trim()) { alert('请填写摘要内容'); return; }

      if (editMemoryIsNew.value) {
        const groupKey = `manual_${editMemoryForm.value.type}_${editMemoryForm.value.withWho}_${Date.now()}`;
        const newMem = {
          id: Date.now(),
          groupKey,
          score: parseFloat(editMemoryForm.value.score) || 0.5,
          type: editMemoryForm.value.type,
          summary: editMemoryForm.value.summary.trim(),
          withWho: editMemoryForm.value.withWho.trim(),
          sourceFrom: editMemoryForm.value.sourceFrom.trim(),
          hidden: false,
          injectOverride: null,
          time: Date.now()
        };
        currentCharMemories.value.unshift(newMem);
        if (!currentCharGroups.value.find(g => g.groupKey === groupKey)) {
          currentCharGroups.value.push({
            groupKey,
            type: newMem.type,
            name: newMem.withWho || '手动添加',
            injectTo: { myChats: [], groups: [] }
          });
        }
      } else {
        const idx = currentCharMemories.value.findIndex(m => m.id === editMemoryId.value);
        if (idx !== -1) {
          currentCharMemories.value[idx].summary = editMemoryForm.value.summary.trim();
          currentCharMemories.value[idx].score = parseFloat(editMemoryForm.value.score) || 0.5;
          currentCharMemories.value[idx].type = editMemoryForm.value.type;
          currentCharMemories.value[idx].withWho = editMemoryForm.value.withWho.trim();
          currentCharMemories.value[idx].sourceFrom = editMemoryForm.value.sourceFrom.trim();
        }
      }

      await saveCharMemories();
      await saveCharGroups();
      editMemoryShow.value = false;
      await loadCharMemories(currentChar.value.id);
    };

    const toggleHideMemory = async (mem) => {
      mem.hidden = !mem.hidden;
      await saveCharMemories();
    };

    const deleteMemory = async (mem) => {
      if (!confirm('确定删除这条记忆？')) return;
      const idx = currentCharMemories.value.findIndex(m => m.id === mem.id);
      if (idx !== -1) currentCharMemories.value.splice(idx, 1);
      await saveCharMemories();
      await loadCharMemories(currentChar.value.id);
    };

    onMounted(async () => {
      await loadAllData();
      setTimeout(() => lucide.createIcons(), 100);
    });

    return {
      allChars, allRooms, charsWithMemory, showAllChars, currentChar, currentCharMemories,
      currentCharGroups, expandedGroups, globalSettings,
      injectEditShow, injectEditGroup, injectEditTarget,
      injectEditMyChats, injectEditGroups,
      editMemoryShow, editMemoryIsNew, editMemoryId, editMemoryForm,
      goBack, saveGlobalSettings, formatTime, refreshIcons,
      openCharDetail, toggleGroupExpand, getMemoriesByGroup, getInjectSummary,
      openInjectEdit, isInjectMyChatSelected, isInjectGroupSelected,
      toggleInjectMyChat, toggleInjectGroup, clearInjectOverride, saveInjectEdit,
      openEditMemory, openAddMemory, saveEditMemory,
      toggleHideMemory, deleteMemory, toggleShowAllChars
    };
  }
}).mount('#memory-app');
