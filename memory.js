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

    // ===== 大记忆系统 (Big Memory) =====
    const detailTab = ref('big'); // 默认显示大记忆Tab
    const bigMemoryTab = ref('core'); // 当前选中的大记忆分类，默认是'核心'
    const bigMemoryCategories = ref([]); // 大记忆的所有分类
    const bigMemoryMigrateLoading = ref(false);
    const bigMemoryMigrateResult = ref('');
    const bigMemoryDb = ref({}); // 大记忆数据暂存
    const bigMemoryEditShow = ref(false);
    const bigMemoryEditForm = ref(null);
    const bigMemoryEditCatKey = ref('');
    const bigMemoryKeywordShow = ref(false);
    const bigMemoryKeywordIsGenerating = ref(false);
    const bigMemoryCompressShow = ref(false);
    const bigMemoryCompressIsGenerating = ref(false);
    const bigMemoryCompressCat = ref('');
    const bigMemoryCompressContent = ref('');


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

    // ========== 大记忆系统核心函数 ==========
    
    const loadBigMemory = async (char) => {
      if (!char) return;
      const dbData = await dbGet(`charBigMemory_${char.id}`) || {};
      const cats = await dbGet('bigMemoryCategories') || [
        { key: 'core', label: '核心记忆', icon: '🎯' },
        { key: 'background', label: '背景设定', icon: '🌍' },
        { key: 'experience', label: '重要经历', icon: '✈️' },
        { key: 'relationship', label: '人际关系', icon: '🤝' },
        { key: 'preference', label: '喜好厌恶', icon: '❤️' },
        { key: 'misc', label: '杂项备忘', icon: '📌' },
      ];
      bigMemoryCategories.value = cats;
      bigMemoryDb.value = dbData;
      detailTab.value = 'big';
      bigMemoryTab.value = 'core'; // 默认选中核心
      nextTick(refreshIcons);
    };

    const saveBigMemory = async () => {
      if (!currentChar.value) return;
      await dbSet(`charBigMemory_${currentChar.value.id}`, JSON.parse(JSON.stringify(bigMemoryDb.value)));
    };

    const getBigMemoryCatItems = (catKey) => {
      return (bigMemoryDb.value[catKey] || []).slice().sort((a, b) => b.time - a.time);
    };

    const getBigMemoryCatCount = (catKey) => {
      return (bigMemoryDb.value[catKey] || []).length;
    };

    const openBigMemoryEdit = (catKey, item) => {
      bigMemoryEditCatKey.value = catKey;
      if (item) { // 编辑
        bigMemoryEditForm.value = JSON.parse(JSON.stringify(item));
      } else { // 新增
        bigMemoryEditForm.value = {
          id: Date.now(),
          summary: '',
          time: Date.now(),
          score: 0.6,
          hidden: false,
          compressed: false,
          triggerKeywords: []
        };
      }
      bigMemoryEditShow.value = true;
    };

    const saveBigMemoryEdit = async () => {
      if (!bigMemoryEditForm.value.summary.trim()) { alert('摘要不能为空'); return; }
      const catKey = bigMemoryEditCatKey.value;
      if (!bigMemoryDb.value[catKey]) bigMemoryDb.value[catKey] = [];
      const items = bigMemoryDb.value[catKey];
      const idx = items.findIndex(i => i.id === bigMemoryEditForm.value.id);
      if (idx !== -1) {
        items[idx] = JSON.parse(JSON.stringify(bigMemoryEditForm.value));
      } else {
        items.push(JSON.parse(JSON.stringify(bigMemoryEditForm.value)));
      }
      await saveBigMemory();
      bigMemoryEditShow.value = false;
    };

    const deleteBigMemoryItem = async (catKey, itemId) => {
      if (!confirm('确定删除这条大记忆？该操作不可恢复。')) return;
      if (!bigMemoryDb.value[catKey]) return;
      const idx = bigMemoryDb.value[catKey].findIndex(i => i.id === itemId);
      if (idx !== -1) {
        bigMemoryDb.value[catKey].splice(idx, 1);
        await saveBigMemory();
      }
    };

    const toggleBigMemoryHide = async (catKey, item) => {
      item.hidden = !item.hidden;
      await saveBigMemory();
    };

    const migrateTooBigMemory = async () => {
        if (!currentChar.value) return;
        if (!confirm('确定迁移吗？\n该操作会将【原有分类】中的所有记忆和【世界书摘要】同步到【大记忆】中（已有摘要会跳过），原数据不会被删除。')) return;

        bigMemoryMigrateLoading.value = true;
        bigMemoryMigrateResult.value = '开始迁移...';

        try {
            const charId = currentChar.value.id;
            // 1. 加载所有需要的数据
            const [legacyMems, worldSummaries] = await Promise.all([
                dbGet(`charMemory_${charId}`) || [],
                dbGet('worldSummaries') || []
            ]);

            // 2. 准备现有大记忆摘要，用于去重
            const existingSummaries = new Set();
            Object.values(bigMemoryDb.value).flat().forEach(mem => existingSummaries.add(mem.summary.trim()));

            let legacyAdded = 0;
            let summaryAdded = 0;

            // 3. 迁移原有分类记忆
            for (const mem of legacyMems) {
                if (existingSummaries.has(mem.summary.trim())) continue;
                if (!bigMemoryDb.value.misc) bigMemoryDb.value.misc = [];
                bigMemoryDb.value.misc.push({
                    id: mem.id || Date.now() + Math.random(),
                    summary: mem.summary,
                    time: mem.time || Date.now(),
                    score: mem.score || 0.5,
                    source: `旧版记忆(${mem.withWho || '未知'})`,
                    hidden: mem.hidden || false,
                    compressed: false,
                    triggerKeywords: []
                });
                existingSummaries.add(mem.summary.trim());
                legacyAdded++;
            }
            bigMemoryMigrateResult.value = `旧版记忆迁移完成，正在处理世界书摘要...`;

            // 4. 迁移世界书摘要
            const charName = currentChar.value.name;
            const relatedSummaries = worldSummaries.filter(s => s.content.includes(charName));
            for (const summary of relatedSummaries) {
                const content = `【${summary.bookName}】${summary.content}`;
                if (existingSummaries.has(content)) continue;
                if (!bigMemoryDb.value.background) bigMemoryDb.value.background = [];
                bigMemoryDb.value.background.push({
                    id: summary.id || Date.now() + Math.random(),
                    summary: content,
                    time: summary.time || Date.now(),
                    score: 0.7, // 世界书摘要默认权重高一些
                    source: '世界书摘要',
                    hidden: false,
                    compressed: false,
                    triggerKeywords: []
                });
                existingSummaries.add(content);
                summaryAdded++;
            }

            await saveBigMemory();
            bigMemoryMigrateResult.value = `迁移成功！新增旧版记忆 ${legacyAdded} 条，世界书摘要 ${summaryAdded} 条。`;
        } catch (e) {
            console.error('迁移失败', e);
            bigMemoryMigrateResult.value = `迁移失败: ${e.message}`;
        } finally {
            bigMemoryMigrateLoading.value = false;
        }
    };
    
    // 关键词和压缩功能留空，后续填充
    const openKeywordEdit = (catKey, item) => { alert('功能开发中'); };
    const saveKeywordEdit = async () => { alert('功能开发中'); };
    const openCompressPanel = (catKey) => { alert('功能开发中'); };

    // ========== 旧版记忆函数 ==========

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
        if (b?.charAvatar) c.avatar = b.charAvatar;
        else if (b?.avatar) c.avatar = b.avatar;
        else if (!c.avatar) c.avatar = '';
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
      // 同时加载新旧两种记忆
      await Promise.all([
        loadCharMemories(char.id),
        loadBigMemory(char)
      ]);
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
      // 检查当前是否在大记忆TAB
      if (detailTab.value === 'big') {
        openBigMemoryEdit(bigMemoryTab.value, null);
      } else {
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
      }
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
      const savedGlobalCss = await dbGet('globalCss');
      if (savedGlobalCss) {
        let el = document.getElementById('global-custom-css');
        if (!el) { el = document.createElement('style'); el.id = 'global-custom-css'; document.head.appendChild(el); }
        el.textContent = savedGlobalCss;
      }
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
      toggleHideMemory, deleteMemory, toggleShowAllChars,

      // ===== 大记忆系统 =====
      detailTab,
      bigMemoryTab,
      bigMemoryCategories,
      bigMemoryMigrateLoading,
      bigMemoryMigrateResult,
      bigMemoryEditShow,
      bigMemoryEditForm,
      bigMemoryKeywordShow,
      bigMemoryKeywordIsGenerating,
      bigMemoryCompressShow,
      bigMemoryCompressIsGenerating,
      bigMemoryCompressCat,
      bigMemoryCompressContent,
      loadBigMemory,
      getBigMemoryCatItems,
      getBigMemoryCatCount,
      openBigMemoryEdit,
      saveBigMemoryEdit,
      deleteBigMemoryItem,
      toggleBigMemoryHide,
      migrateToBigMemory: migrateTooBigMemory,
      openKeywordEdit,
      saveKeywordEdit,
      openCompressPanel,
    };
  }
}).mount('#memory-app');
