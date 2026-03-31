const { createApp, ref, computed, onMounted } = Vue;

createApp({
  setup() {
    const drawerOpen = ref(false);
    const tab = ref('like');
    const currentTabTitle = computed(() => ({ like: '喜欢', settings: '设置', theme: '美化', memory: '内存' }[tab.value] || ''));
    const goBack = () => { window.location.href = 'index.html'; };

    const api = ref({ url: '', key: '', model: '', summaryUrl: '', summaryKey: '', summaryModel: '' });
    const modelList = ref([]);
    const apiPresets = ref([]);
    const presetName = ref('');
    const showPresetPanel = ref(false);
    const showModelDrop = ref(false);
    const selectModel = (m) => { api.value.model = m; showModelDrop.value = false; };
    const showSummaryModelDrop = ref(false);
    const summaryModelList = ref([]);
    const showSummaryPresetPanel = ref(false);
    const selectSummaryModel = (m) => { api.value.summaryModel = m; showSummaryModelDrop.value = false; };
    const consoleLogs = ref([]);
    const storageInfo = ref({ charName: '', charBio: '', hasBg: false, hasAvatar: false, hasPolaroid: false, filmCount: 0, apiUrl: '', apiModel: '', charCount: 0, roomCount: 0, totalMsgs: 0 });
    const darkMode = ref(false);
    const wallpaper = ref('');
    const wallpaperUrl = ref('');
    const wallpaperGlobal = ref(false);
    const pageWallpapers = ref({ chat: '', random: '', worldbook: '', world: '', collect: '', share: '', forum: '', novel: '' });
    const pageWallpaperUrls = ref({ chat: '', random: '', worldbook: '', world: '', collect: '', share: '', forum: '', novel: '' });
    const pageLabels = { chat: '聊天App', random: '次元发现', worldbook: '世界书馆', world: '世界次元', collect: '收藏', share: '涟波', forum: '次元论坛', novel: '次元小说' };
    const appIcons = ref([
      { key: 'chat', label: '聊天', icon: '' },
      { key: 'like', label: '喜欢', icon: '' },
      { key: 'world', label: '世界', icon: '' },
      { key: 'collect', label: '收藏', icon: '' },
      { key: 'memory', label: '记忆', icon: '' }
    ]);
    const currentIconKey = ref('');
    const importFile = ref(null);
    const wallpaperFile = ref(null);
    const iconFile = ref(null);
    const pageWallpaperFile = ref(null);
    const currentPageWallpaperKey = ref('');

    const fontFile = ref(null);
    const customFontUrl = ref('');
    const customFontName = ref('');
    const previewFontLoaded = ref(false);
    const previewFontStyle = ref({});

    const loadFontFace = (name, src) => {
      return new Promise((resolve, reject) => {
        const font = new FontFace(name, `url(${src})`);
        font.load().then(loaded => { document.fonts.add(loaded); resolve(); }).catch(reject);
      });
    };

    const previewFontFromUrl = async () => {
      if (!customFontUrl.value.trim()) return;
      try {
        await loadFontFace('CustomPreviewFont', customFontUrl.value.trim());
        previewFontStyle.value = { fontFamily: "'CustomPreviewFont', sans-serif" };
        previewFontLoaded.value = true;
        customFontName.value = customFontUrl.value.trim().split('/').pop();
        addLog('字体预览加载成功');
      } catch (e) { addLog('字体加载失败：' + e.message, 'error'); }
    };

    const triggerFontUpload = () => { fontFile.value.click(); };

    const previewFontFromFile = async (e) => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const font = new FontFace('CustomPreviewFont', evt.target.result);
          await font.load();
          document.fonts.add(font);
          previewFontStyle.value = { fontFamily: "'CustomPreviewFont', sans-serif" };
          previewFontLoaded.value = true;
          customFontName.value = file.name;
          customFontUrl.value = evt.target.result;
          addLog('字体预览加载成功：' + file.name);
        } catch (err) { addLog('字体加载失败：' + err.message, 'error'); }
        e.target.value = '';
      };
      reader.readAsArrayBuffer(file);
    };

    const applyCustomFont = async () => {
      if (!previewFontLoaded.value) return;
      await dbSet('customFont', { src: customFontUrl.value, name: customFontName.value });
      injectGlobalFont(customFontUrl.value, customFontName.value);
      addLog('字体已应用：' + customFontName.value);
    };

    const injectGlobalFont = (src, name) => {
      let style = document.getElementById('custom-font-style');
      if (!style) { style = document.createElement('style'); style.id = 'custom-font-style'; document.head.appendChild(style); }
      style.textContent = `@font-face { font-family: 'CustomGlobalFont'; src: url('${src}'); } * { font-family: 'CustomGlobalFont', -apple-system, 'PingFang SC', 'Helvetica Neue', sans-serif !important; }`;
    };

    const clearCustomFont = async () => {
      await dbSet('customFont', null);
      const style = document.getElementById('custom-font-style');
      if (style) style.remove();
      customFontUrl.value = ''; customFontName.value = ''; previewFontLoaded.value = false; previewFontStyle.value = {};
      addLog('已恢复默认字体');
    };

    const globalFontSize = ref(15);
    const applyGlobalFontSize = () => {
      let style = document.getElementById('custom-fontsize-style');
      if (!style) { style = document.createElement('style'); style.id = 'custom-fontsize-style'; document.head.appendChild(style); }
      style.textContent = `* { font-size: ${globalFontSize.value}px !important; }`;
    };
    const saveGlobalFontSize = async () => { await dbSet('customFontSize', globalFontSize.value); applyGlobalFontSize(); addLog('字体大小已保存：' + globalFontSize.value + 'px'); };
    const clearGlobalFontSize = async () => { globalFontSize.value = 15; await dbSet('customFontSize', null); const style = document.getElementById('custom-fontsize-style'); if (style) style.remove(); addLog('已恢复默认字体大小'); };

    let lucideTimer = null;
    const refreshIcons = () => { clearTimeout(lucideTimer); lucideTimer = setTimeout(() => { lucide.createIcons(); setTimeout(() => lucide.createIcons(), 200); }, 50); };
    const wallpaperStyle = computed(() => ({ backgroundImage: wallpaper.value ? `url(${wallpaper.value})` : 'none' }));

    const saveGlobalLog = async (log) => {
      const logs = JSON.parse(JSON.stringify((await dbGet('globalLogs')) || []));
      logs.unshift(log); if (logs.length > 200) logs.splice(200);
      await dbSet('globalLogs', logs);
    };

    const addLog = (msg, type = 'info') => {
      const now = new Date();
      const time = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`;
      const newLog = { msg, type, time, page: '喜欢App' };
      consoleLogs.value.unshift(newLog);
      saveGlobalLog(newLog);
    };

    const loadGlobalLogs = async () => { consoleLogs.value = (await dbGet('globalLogs')) || []; };

    const saveApi = async () => {
      await dbSet('apiConfig', { url: api.value.url, key: api.value.key, model: api.value.model, summaryUrl: api.value.summaryUrl, summaryKey: api.value.summaryKey, summaryModel: api.value.summaryModel });
      addLog('API 配置已保存');
    };

    const fetchModels = async () => {
      if (!api.value.url || !api.value.key) { addLog('请先填写 API 网址和密钥', 'warn'); return; }
      try {
        addLog('正在获取模型列表...');
        const res = await fetch(`${api.value.url.replace(/\/$/, '')}/models`, { headers: { Authorization: `Bearer ${api.value.key}` } });
        const data = await res.json();
        modelList.value = (data.data || []).map(m => m.id);
        addLog(`获取到 ${modelList.value.length} 个模型`);
      } catch (e) { addLog(`获取模型失败: ${e.message}`, 'error'); }
    };

    const fetchSummaryModels = async () => {
      const url = api.value.summaryUrl?.trim() || api.value.url;
      const key = api.value.summaryKey?.trim() || api.value.key;
      if (!url || !key) { addLog('请先填写总结API网址和密钥', 'warn'); return; }
      try {
        addLog('正在获取总结API模型列表...');
        const res = await fetch(`${url.replace(/\/$/, '')}/models`, { headers: { Authorization: `Bearer ${key}` } });
        const data = await res.json();
        summaryModelList.value = (data.data || []).map(m => m.id);
        showSummaryModelDrop.value = true;
        addLog(`获取到 ${summaryModelList.value.length} 个总结模型`);
      } catch (e) { addLog(`获取总结模型失败: ${e.message}`, 'error'); }
    };

    const loadSummaryPreset = (p) => { api.value.summaryUrl = p.url; api.value.summaryKey = p.key; api.value.summaryModel = p.model; showSummaryPresetPanel.value = false; addLog(`总结API已加载预设: ${p.name}`); };
    const savePreset = async () => {
      if (!presetName.value.trim()) { addLog('请输入预设名称', 'warn'); return; }
      apiPresets.value.push({ name: presetName.value.trim(), url: api.value.url, key: api.value.key, model: api.value.model });
      await dbSet('apiPresets', JSON.parse(JSON.stringify(apiPresets.value)));
      presetName.value = ''; addLog('预设已保存');
    };
    const loadPreset = (p) => { api.value = { url: p.url, key: p.key, model: p.model }; addLog(`已加载预设: ${p.name}`); };
    const deletePreset = async (i) => { apiPresets.value.splice(i, 1); await dbSet('apiPresets', JSON.parse(JSON.stringify(apiPresets.value))); addLog('预设已删除'); };

    // ===== 导出（含新数据）=====
    const exportData = async () => {
      const charList = (await dbGet('charList')) || [];
      const roomList = (await dbGet('roomList')) || [];
      const charExtras = {};
      for (const c of charList) {
        charExtras[c.id] = {
          mySettings: await dbGet(`mySettings_${c.id}`),
          peekHistory: await dbGet(`peekHistory_${c.id}`),
          mirrorHistory: await dbGet(`mirrorHistory_${c.id}`),
          chatBeauty: await dbGet(`chatBeauty_${c.id}`),
          summaries: await dbGet(`summaries_${c.id}`),
          autoSummary: await dbGet(`autoSummary_${c.id}`),
          chatTranslate: await dbGet(`chatTranslate_${c.id}`),
          charStickerCats: await dbGet(`charStickerCats_${c.id}`),
          theaterPresets: await dbGet(`theaterPresets_${c.id}`),
          theaterHtmlPresets: await dbGet(`theaterHtmlPresets_${c.id}`),
          theaterHistory: await dbGet(`theaterHistory_${c.id}`),
          theaterStylePresets: await dbGet(`theaterStylePresets_${c.id}`),
          autoSend: await dbGet(`autoSend_${c.id}`),
          notifyOn: await dbGet(`notifyOn_${c.id}`),
          keepAliveOn: await dbGet(`keepAliveOn_${c.id}`),
          autoSummaryNextAt: await dbGet(`autoSummaryNextAt_${c.id}`),
          weightedAutoSummary: await dbGet(`weightedAutoSummary_${c.id}`),
          weightedAutoSummaryNextAt: await dbGet(`weightedAutoSummaryNextAt_${c.id}`),
          summaryPromptPresets: await dbGet(`summaryPromptPresets_${c.id}`),
          charMemory: await dbGet(`charMemory_${c.id}`),
          charMemoryGroups: await dbGet(`charMemoryGroups_${c.id}`),
          charLogs: await dbGet(`charLogs_${c.id}`),
          charWorldLock: await dbGet(`charWorldLock_${c.id}`),
          hotAware: await dbGet(`hotAware_${c.id}`),
          novelAware: await dbGet(`novelAware_${c.id}`),
          cwContacts: await dbGet(`cwContacts_${c.id}`),
          cwPrivateChats: await dbGet(`cwPrivateChats_${c.id}`),
          cwLocalGroups: await dbGet(`cwLocalGroups_${c.id}`),
          notifySystemOn: await dbGet(`notifySystemOn_${c.id}`)
        };
      }
      const roomExtras = {};
      for (const r of roomList) {
        roomExtras[r.id] = {
          groupBeauty: await dbGet(`groupBeauty_${r.id}`),
          groupMySettings: await dbGet(`groupMySettings_${r.id}`),
          groupSummaries: await dbGet(`groupSummaries_${r.id}`),
          groupPeekHistory: await dbGet(`groupPeekHistory_${r.id}`),
          groupMirrorHistory: await dbGet(`groupMirrorHistory_${r.id}`),
          groupStickerCats: await dbGet(`groupStickerCats_${r.id}`),
          groupAutoSend: await dbGet(`groupAutoSend_${r.id}`),
          groupTranslate: await dbGet(`groupTranslate_${r.id}`),
          groupRealtimeTime: await dbGet(`groupRealtimeTime_${r.id}`),
          groupTheaterPresets: await dbGet(`groupTheaterPresets_${r.id}`),
          groupTheaterHtmlPresets: await dbGet(`groupTheaterHtmlPresets_${r.id}`),
          groupTheaterHistory: await dbGet(`groupTheaterHistory_${r.id}`),
          groupTheaterStylePresets: await dbGet(`groupTheaterStylePresets_${r.id}`),
          groupLogs: await dbGet(`roomLogs_${r.id}`)
        };
      }
      const result = {
        charName: await dbGet('charName'), charBio: await dbGet('charBio'),
        images: await dbGet('images'), filmImages: await dbGet('filmImages'),
        apiConfig: await dbGet('apiConfig'), apiPresets: await dbGet('apiPresets'),
        darkMode: await dbGet('darkMode'), wallpaper: await dbGet('wallpaper'),
        appIcons: await dbGet('appIcons'), charList, roomList,
        worldBooks: await dbGet('worldBooks'), worldBookCats: await dbGet('worldBookCats'),
        collects: await dbGet('collects'), emoji: await dbGet('emoji'),
        customFont: await dbGet('customFont'), customFontSize: await dbGet('customFontSize'),
        randomCharList: await dbGet('randomCharList'),
        novels: await dbGet('novels'), novelReadSettings: await dbGet('novelReadSettings'),
        novelStylePresets: await dbGet('novelStylePresets'), novelApiConfig: await dbGet('novelApiConfig'),
        moments: await dbGet('moments'),
        memoryGlobalSettings: await dbGet('memoryGlobalSettings'),
        globalLogs: await dbGet('globalLogs'),
        charExtras, roomExtras
      };
           const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `rolecard-backup-${new Date().toLocaleDateString()}.json`;
      a.click();
      addLog('全量数据已导出');
    };

    const triggerImport = () => { importFile.value.click(); };

    const importData = async (e) => {
      const file = e.target.files[0]; if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const basicKeys = ['charName','charBio','images','filmImages','apiConfig','apiPresets','darkMode','wallpaper','appIcons','charList','roomList','worldBooks','worldBookCats','collects','emoji','customFont','customFontSize','randomCharList','novels','novelReadSettings','novelStylePresets','novelApiConfig','moments','memoryGlobalSettings','globalLogs'];
        for (const k of basicKeys) { if (data[k] !== undefined && data[k] !== null) await dbSet(k, data[k]); }
        if (data.charExtras) {
          for (const [id, extras] of Object.entries(data.charExtras)) {
            const keysToRestore = [
              ['mySettings', `mySettings_${id}`],
              ['peekHistory', `peekHistory_${id}`],
              ['mirrorHistory', `mirrorHistory_${id}`],
              ['chatBeauty', `chatBeauty_${id}`],
              ['summaries', `summaries_${id}`],
              ['autoSummary', `autoSummary_${id}`],
              ['chatTranslate', `chatTranslate_${id}`],
              ['charStickerCats', `charStickerCats_${id}`],
              ['theaterPresets', `theaterPresets_${id}`],
              ['theaterHtmlPresets', `theaterHtmlPresets_${id}`],
              ['theaterHistory', `theaterHistory_${id}`],
              ['theaterStylePresets', `theaterStylePresets_${id}`],
              ['autoSend', `autoSend_${id}`],
              ['autoSummaryNextAt', `autoSummaryNextAt_${id}`],
              ['weightedAutoSummary', `weightedAutoSummary_${id}`],
              ['weightedAutoSummaryNextAt', `weightedAutoSummaryNextAt_${id}`],
              ['summaryPromptPresets', `summaryPromptPresets_${id}`],
              ['charMemory', `charMemory_${id}`],
              ['charMemoryGroups', `charMemoryGroups_${id}`],
              ['charLogs', `charLogs_${id}`],
              ['charWorldLock', `charWorldLock_${id}`],
              ['hotAware', `hotAware_${id}`],
              ['novelAware', `novelAware_${id}`],
              ['cwContacts', `cwContacts_${id}`],
              ['cwPrivateChats', `cwPrivateChats_${id}`],
              ['cwLocalGroups', `cwLocalGroups_${id}`],
            ];
            for (const [k, dbKey] of keysToRestore) {
              if (extras[k] != null) await dbSet(dbKey, extras[k]);
            }
            if (extras.notifyOn != null) await dbSet(`notifyOn_${id}`, extras.notifyOn);
            if (extras.notifySystemOn != null) await dbSet(`notifySystemOn_${id}`, extras.notifySystemOn);
            if (extras.keepAliveOn != null) await dbSet(`keepAliveOn_${id}`, extras.keepAliveOn);
          }
        }
        if (data.roomExtras) {
          for (const [id, extras] of Object.entries(data.roomExtras)) {
            const keysToRestore = [
              ['groupBeauty', `groupBeauty_${id}`],
              ['groupMySettings', `groupMySettings_${id}`],
              ['groupSummaries', `groupSummaries_${id}`],
              ['groupPeekHistory', `groupPeekHistory_${id}`],
              ['groupMirrorHistory', `groupMirrorHistory_${id}`],
              ['groupStickerCats', `groupStickerCats_${id}`],
              ['groupAutoSend', `groupAutoSend_${id}`],
              ['groupTranslate', `groupTranslate_${id}`],
              ['groupTheaterPresets', `groupTheaterPresets_${id}`],
              ['groupTheaterHtmlPresets', `groupTheaterHtmlPresets_${id}`],
              ['groupTheaterHistory', `groupTheaterHistory_${id}`],
              ['groupTheaterStylePresets', `groupTheaterStylePresets_${id}`],
              ['groupLogs', `roomLogs_${id}`],
            ];
            for (const [k, dbKey] of keysToRestore) {
              if (extras[k] != null) await dbSet(dbKey, extras[k]);
            }
            if (extras.groupRealtimeTime != null) await dbSet(`groupRealtimeTime_${id}`, extras.groupRealtimeTime);
          }
        }
        addLog('全量数据已导入，请刷新页面');
        e.target.value = '';
      } catch (err) { addLog(`导入失败: ${err.message}`, 'error'); }
    };

    const loadStorageInfo = async () => {
      const [name, bio, imgs, films, apiConf, charList, roomList] = await Promise.all([
        dbGet('charName'), dbGet('charBio'), dbGet('images'), dbGet('filmImages'),
        dbGet('apiConfig'), dbGet('charList'), dbGet('roomList')
      ]);
      const cl = charList || [];
      const rl = roomList || [];
      storageInfo.value = {
        charName: name || '', charBio: bio || '',
        hasBg: !!(imgs && imgs.bg), hasAvatar: !!(imgs && imgs.avatar), hasPolaroid: !!(imgs && imgs.polaroid),
        filmCount: films ? films.filter(f => !!f).length : 0,
        apiUrl: apiConf ? apiConf.url : '', apiModel: apiConf ? apiConf.model : '',
        charCount: cl.length, roomCount: rl.length,
        totalMsgs: cl.reduce((acc, c) => acc + (c.messages ? c.messages.length : 0), 0)
      };
    };

    const clearStorage = async () => {
      if (!confirm('确定要清空所有储存数据吗？')) return;
      const keys = ['charName','charBio','images','filmImages','apiConfig','apiPresets','darkMode','wallpaper','appIcons','charList','roomList','globalLogs','moments','memoryGlobalSettings','collects'];
      for (const k of keys) await dbSet(k, null);
      addLog('所有储存已清空', 'warn');
      await loadStorageInfo();
    };

    const toggleWallpaperGlobal = async () => {
      wallpaperGlobal.value = !wallpaperGlobal.value;
      await dbSet('wallpaperGlobal', wallpaperGlobal.value);
      addLog(`全局壁纸已${wallpaperGlobal.value ? '开启' : '关闭'}`);
    };

    const applyPageWallpaperUrl = async (pageKey) => {
      const url = pageWallpaperUrls.value[pageKey].trim(); if (!url) return;
      pageWallpapers.value[pageKey] = url;
      await dbSet(`wallpaper_${pageKey}`, url);
      addLog(`${pageLabels[pageKey]} 壁纸已设置`);
    };

    const triggerPageWallpaper = (pageKey) => { currentPageWallpaperKey.value = pageKey; pageWallpaperFile.value.click(); };

    const uploadPageWallpaper = async (e) => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const key = currentPageWallpaperKey.value;
        pageWallpapers.value[key] = evt.target.result;
        await dbSet(`wallpaper_${key}`, evt.target.result);
        addLog(`${pageLabels[key]} 壁纸已上传`);
        e.target.value = '';
      };
      reader.readAsDataURL(file);
    };

    const clearPageWallpaper = async (pageKey) => {
      pageWallpapers.value[pageKey] = ''; pageWallpaperUrls.value[pageKey] = '';
      await dbSet(`wallpaper_${pageKey}`, '');
      addLog(`${pageLabels[pageKey]} 壁纸已清除`);
    };

    const toggleDark = async () => {
      darkMode.value = !darkMode.value;
      document.body.classList.toggle('dark', darkMode.value);
      await dbSet('darkMode', darkMode.value);
      addLog(`夜间模式已${darkMode.value ? '开启' : '关闭'}`);
    };

    const applyWallpaperUrl = async () => {
      if (!wallpaperUrl.value.trim()) return;
      wallpaper.value = wallpaperUrl.value.trim();
      document.body.style.backgroundImage = `url(${wallpaper.value})`;
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundPosition = 'center';
      await dbSet('wallpaper', wallpaper.value);
      await dbSet('wallpaper_like', wallpaper.value);
      addLog('壁纸已设置');
    };

    const triggerWallpaper = () => { wallpaperFile.value.click(); };

    const uploadWallpaper = async (e) => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = async (evt) => {
        wallpaper.value = evt.target.result;
        document.body.style.backgroundImage = `url(${wallpaper.value})`;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center';
        await dbSet('wallpaper', wallpaper.value);
        await dbSet('wallpaper_like', wallpaper.value);
        addLog('壁纸已上传');
        e.target.value = '';
      };
      reader.readAsDataURL(file);
    };

    const clearWallpaper = async () => {
      wallpaper.value = ''; document.body.style.backgroundImage = 'none';
      await dbSet('wallpaper', ''); await dbSet('wallpaper_like', '');
      addLog('壁纸已清除');
    };

    const triggerIconUpload = (key) => { currentIconKey.value = key; iconFile.value.click(); };
    const uploadIcon = async (e) => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const idx = appIcons.value.findIndex(a => a.key === currentIconKey.value);
        if (idx !== -1) appIcons.value[idx].icon = evt.target.result;
        await dbSet('appIcons', appIcons.value);
        addLog(`图标 "${currentIconKey.value}" 已更新`);
        e.target.value = '';
      };
      reader.readAsDataURL(file);
    };

    // ===== 导入导出扩展 =====
    const exportCharList = ref([]);
    const exportCharId = ref('');
    const importBeautyFile = ref(null);
    const importCharFile = ref(null);

    const exportBeauty = async () => {
      const charList = (await dbGet('charList')) || [];
      const roomList = (await dbGet('roomList')) || [];
      const beautyData = { charBeauty: {}, roomBeauty: {} };
      for (const c of charList) { beautyData.charBeauty[c.id] = await dbGet(`chatBeauty_${c.id}`); }
      for (const r of roomList) { beautyData.roomBeauty[r.id] = await dbGet(`groupBeauty_${r.id}`); }
      beautyData.wallpaper = await dbGet('wallpaper');
      beautyData.darkMode = await dbGet('darkMode');
      beautyData.customFont = await dbGet('customFont');
      beautyData.customFontSize = await dbGet('customFontSize');
      const blob = new Blob([JSON.stringify(beautyData, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `rolecard-beauty-${new Date().toLocaleDateString()}.json`; a.click();
      addLog('美化数据已导出');
    };

    const triggerImportBeauty = () => { importBeautyFile.value.click(); };
    const importBeauty = async (e) => {
      const file = e.target.files[0]; if (!file) return;
      try {
        const data = JSON.parse(await file.text());
        if (data.wallpaper != null) await dbSet('wallpaper', data.wallpaper);
        if (data.darkMode != null) await dbSet('darkMode', data.darkMode);
        if (data.customFont != null) await dbSet('customFont', data.customFont);
        if (data.customFontSize != null) await dbSet('customFontSize', data.customFontSize);
        if (data.charBeauty) { for (const [id, val] of Object.entries(data.charBeauty)) { if (val) await dbSet(`chatBeauty_${id}`, val); } }
        if (data.roomBeauty) { for (const [id, val] of Object.entries(data.roomBeauty)) { if (val) await dbSet(`groupBeauty_${id}`, val); } }
        addLog('美化数据已导入，请刷新页面');
        e.target.value = '';
      } catch (err) { addLog(`美化导入失败: ${err.message}`, 'error'); }
    };

    const exportSingleChar = async () => {
      if (!exportCharId.value) return;
      const charList = (await dbGet('charList')) || [];
      const char = charList.find(c => c.id == exportCharId.value);
      if (!char) return;
      const id = char.id;
      const result = {
        type: 'single_char', char,
        mySettings: await dbGet(`mySettings_${id}`),
        peekHistory: await dbGet(`peekHistory_${id}`),
        mirrorHistory: await dbGet(`mirrorHistory_${id}`),
        chatBeauty: await dbGet(`chatBeauty_${id}`),
        summaries: await dbGet(`summaries_${id}`),
        autoSummary: await dbGet(`autoSummary_${id}`),
        chatTranslate: await dbGet(`chatTranslate_${id}`),
        charStickerCats: await dbGet(`charStickerCats_${id}`),
        theaterPresets: await dbGet(`theaterPresets_${id}`),
        theaterHtmlPresets: await dbGet(`theaterHtmlPresets_${id}`),
        theaterHistory: await dbGet(`theaterHistory_${id}`),
        theaterStylePresets: await dbGet(`theaterStylePresets_${id}`),
        autoSend: await dbGet(`autoSend_${id}`),
        notifyOn: await dbGet(`notifyOn_${id}`),
        notifySystemOn: await dbGet(`notifySystemOn_${id}`),
        keepAliveOn: await dbGet(`keepAliveOn_${id}`),
        autoSummaryNextAt: await dbGet(`autoSummaryNextAt_${id}`),
        weightedAutoSummary: await dbGet(`weightedAutoSummary_${id}`),
        weightedAutoSummaryNextAt: await dbGet(`weightedAutoSummaryNextAt_${id}`),
        summaryPromptPresets: await dbGet(`summaryPromptPresets_${id}`),
        charMemory: await dbGet(`charMemory_${id}`),
        charMemoryGroups: await dbGet(`charMemoryGroups_${id}`),
        charWorldLock: await dbGet(`charWorldLock_${id}`),
        hotAware: await dbGet(`hotAware_${id}`),
        novelAware: await dbGet(`novelAware_${id}`),
        cwContacts: await dbGet(`cwContacts_${id}`),
        cwPrivateChats: await dbGet(`cwPrivateChats_${id}`),
        cwLocalGroups: await dbGet(`cwLocalGroups_${id}`)
      };
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `char-${char.name}-${new Date().toLocaleDateString()}.json`; a.click();
      addLog(`角色「${char.name}」数据已导出`);
    };

    const triggerImportChar = () => { importCharFile.value.click(); };
    const importSingleChar = async (e) => {
      const file = e.target.files[0]; if (!file) return;
      try {
        const data = JSON.parse(await file.text());
        if (data.type !== 'single_char' || !data.char) { addLog('不是有效的单角色备份文件', 'error'); return; }
        const id = data.char.id;
        const charList = JSON.parse(JSON.stringify((await dbGet('charList')) || []));
        const idx = charList.findIndex(c => c.id === id);
        if (idx !== -1) charList[idx] = data.char; else charList.push(data.char);
        await dbSet('charList', charList);
        const keysToRestore = [
          ['mySettings', `mySettings_${id}`],
          ['peekHistory', `peekHistory_${id}`],
          ['mirrorHistory', `mirrorHistory_${id}`],
          ['chatBeauty', `chatBeauty_${id}`],
          ['summaries', `summaries_${id}`],
          ['autoSummary', `autoSummary_${id}`],
          ['chatTranslate', `chatTranslate_${id}`],
          ['charStickerCats', `charStickerCats_${id}`],
          ['theaterPresets', `theaterPresets_${id}`],
          ['theaterHtmlPresets', `theaterHtmlPresets_${id}`],
          ['theaterHistory', `theaterHistory_${id}`],
          ['theaterStylePresets', `theaterStylePresets_${id}`],
          ['autoSend', `autoSend_${id}`],
          ['autoSummaryNextAt', `autoSummaryNextAt_${id}`],
          ['weightedAutoSummary', `weightedAutoSummary_${id}`],
          ['weightedAutoSummaryNextAt', `weightedAutoSummaryNextAt_${id}`],
          ['summaryPromptPresets', `summaryPromptPresets_${id}`],
          ['charMemory', `charMemory_${id}`],
          ['charMemoryGroups', `charMemoryGroups_${id}`],
          ['charWorldLock', `charWorldLock_${id}`],
          ['hotAware', `hotAware_${id}`],
          ['novelAware', `novelAware_${id}`],
          ['cwContacts', `cwContacts_${id}`],
          ['cwPrivateChats', `cwPrivateChats_${id}`],
          ['cwLocalGroups', `cwLocalGroups_${id}`],
        ];
        for (const [k, dbKey] of keysToRestore) {
          if (data[k] != null) await dbSet(dbKey, data[k]);
        }
        if (data.notifyOn != null) await dbSet(`notifyOn_${id}`, data.notifyOn);
        if (data.notifySystemOn != null) await dbSet(`notifySystemOn_${id}`, data.notifySystemOn);
        if (data.keepAliveOn != null) await dbSet(`keepAliveOn_${id}`, data.keepAliveOn);
        await loadStorageInfo();
        exportCharList.value = (await dbGet('charList')) || [];
        addLog(`角色「${data.char.name}」已导入，请刷新页面`);
        e.target.value = '';
      } catch (err) { addLog(`角色导入失败: ${err.message}`, 'error'); }
    };

    // ===== 内存页面（含新数据）=====
    const memoryDetails = ref([]);
    const memoryDonut = ref([]);
    const memoryTotal = ref('0 KB');
    const memoryLoading = ref(false);

    const COLORS = ['#89b8fe','#b89aff','#89d171','#ffca59','#ff7337','#61bdff','#debdff','#54ffee','#d4d4d4','#73d7ff','#e979ff','#8f8f8f','#ffb347','#87ceeb','#dda0dd','#007380','#87ceeb','#ff45b8','#dbbc91','#153c4b','#752728'];

    const formatBytes = (bytes) => {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / 1024 / 1024).toFixed(2) + ' MB';
    };

    const loadMemory = async () => {
      memoryLoading.value = true;
      const charList = (await dbGet('charList')) || [];
      const roomList = (await dbGet('roomList')) || [];
      const calcSize = (val) => new Blob([JSON.stringify(val ?? '')]).size;
      const blocks = [];

      // 角色聊天记录
      let charMsgTotal = 0;
      const charMsgChildren = [];
      for (const c of charList) {
        const s = calcSize(c.messages || []);
        charMsgTotal += s;
        charMsgChildren.push({ label: c.name, size: formatBytes(s) });
      }
      blocks.push({ label: '角色聊天记录', raw: charMsgTotal, children: charMsgChildren });

      // 聊天室聊天记录
      let roomMsgTotal = 0;
      const roomMsgChildren = [];
      for (const r of roomList) {
        const s = calcSize(r.messages || []);
        roomMsgTotal += s;
        roomMsgChildren.push({ label: r.name, size: formatBytes(s) });
      }
      blocks.push({ label: '聊天室聊天记录', raw: roomMsgTotal, children: roomMsgChildren });

      // 角色记忆数据
      let memoryTotal2 = 0;
      const memoryChildren = [];
      for (const c of charList) {
        const memData = await dbGet(`charMemory_${c.id}`);
        const s = calcSize(memData || []);
        memoryTotal2 += s;
        if (s > 100) memoryChildren.push({ label: c.name + '（' + (memData ? memData.length : 0) + '条）', size: formatBytes(s) });
      }
      blocks.push({ label: '角色记忆', raw: memoryTotal2, children: memoryChildren });

      // 私聊记录（角色世界）
      let pcTotal = 0;
      const pcChildren = [];
      for (const c of charList) {
        const pcData = await dbGet(`cwPrivateChats_${c.id}`);
        const s = calcSize(pcData || []);
        pcTotal += s;
        if (s > 100) pcChildren.push({ label: c.name + '的私聊', size: formatBytes(s) });
      }
      blocks.push({ label: '角色世界私聊', raw: pcTotal, children: pcChildren });

      // 小群记录
      let lgTotal = 0;
      const lgChildren = [];
      for (const c of charList) {
        const lgData = await dbGet(`cwLocalGroups_${c.id}`);
        const s = calcSize(lgData || []);
        lgTotal += s;
        if (s > 100) lgChildren.push({ label: c.name + '的小群', size: formatBytes(s) });
      }
      blocks.push({ label: '角色世界小群', raw: lgTotal, children: lgChildren });

      // 联系人
      let contactTotal = 0;
      for (const c of charList) {
        const ctData = await dbGet(`cwContacts_${c.id}`);
        contactTotal += calcSize(ctData || []);
      }
      blocks.push({ label: '角色联系人', raw: contactTotal, children: [] });

      // 角色设置
      let charSettingTotal = 0;
      for (const c of charList) {
        charSettingTotal += calcSize({ name: c.name, world: c.world, persona: c.persona });
      }
      blocks.push({ label: '角色设置', raw: charSettingTotal, children: [] });

      // 美化数据
      let beautyTotal = 0;
      for (const c of charList) { beautyTotal += calcSize(await dbGet(`chatBeauty_${c.id}`)); }
      for (const r of roomList) { beautyTotal += calcSize(await dbGet(`groupBeauty_${r.id}`)); }
      blocks.push({ label: '美化数据', raw: beautyTotal, children: [] });

      // 收藏数据
      const collectsSize = calcSize(await dbGet('collects'));
      blocks.push({ label: '收藏数据', raw: collectsSize, children: [] });

      // 动态数据
      const momentsSize = calcSize(await dbGet('moments'));
      blocks.push({ label: '动态数据', raw: momentsSize, children: [] });

      // 世界书
      const worldBooksSize = calcSize(await dbGet('worldBooks'));
      blocks.push({ label: '世界书', raw: worldBooksSize, children: [] });

      // 表情包
      const emojiSize = calcSize(await dbGet('emoji'));
      blocks.push({ label: '表情包', raw: emojiSize, children: [] });

      // 图片/壁纸
      const wallpaperSize = calcSize(await dbGet('wallpaper'));
      const imagesSize = calcSize(await dbGet('images'));
      const filmSize = calcSize(await dbGet('filmImages'));
      blocks.push({ label: '图片/壁纸', raw: wallpaperSize + imagesSize + filmSize, children: [
        { label: '页面壁纸', size: formatBytes(wallpaperSize) },
        { label: '主页图片', size: formatBytes(imagesSize) },
        { label: '胶片图片', size: formatBytes(filmSize) }
      ]});

      // 小说数据
      const savedNovels = await dbGet('novels');
      const novelList = savedNovels || [];
      let novelContentTotal = 0;
      const novelChildren = [];
      for (const n of novelList) {
        let size = 0;
        if (n.chapters && n.chapters.length) {
          size = n.chapters.reduce((a, ch) => a + (ch.content || '').length + (ch.summary || '').length, 0);
        } else { size = (n.content || '').length; }
        novelContentTotal += size;
        novelChildren.push({ label: n.title, size: formatBytes(size) });
      }
      blocks.push({ label: '小说内容', raw: novelContentTotal, children: novelChildren });

      // 日志
      const logsSize = calcSize(await dbGet('globalLogs'));
      blocks.push({ label: '控制台日志', raw: logsSize, children: [] });

      // 其他
      const otherSize = calcSize(await dbGet('apiConfig')) + calcSize(await dbGet('apiPresets')) + calcSize(await dbGet('appIcons')) + calcSize(await dbGet('customFont')) + calcSize(await dbGet('memoryGlobalSettings'));
      blocks.push({ label: '设置/字体/图标', raw: otherSize, children: [] });

      const totalRaw = blocks.reduce((a, b) => a + b.raw, 0);
      memoryTotal.value = formatBytes(totalRaw);

      memoryDetails.value = blocks.map((b, i) => ({
        label: b.label,
        size: formatBytes(b.raw),
        percent: totalRaw > 0 ? Math.round(b.raw / totalRaw * 100) : 0,
        color: COLORS[i % COLORS.length],
        children: b.children
      }));

      const circumference = 2 * Math.PI * 70;
      let offset = 0;
      memoryDonut.value = blocks.map((b, i) => {
        const ratio = totalRaw > 0 ? b.raw / totalRaw : 0;
        const dash = ratio * circumference;
        const gap = circumference - dash;
        const seg = { label: b.label, color: COLORS[i % COLORS.length], dash, gap, offset: circumference - offset };
        offset += dash;
        return seg;
      }).filter(s => s.dash > 0);

      memoryLoading.value = false;
    };

    onMounted(async () => {
      if (typeof listenForNotifications === 'function') listenForNotifications();
      if (typeof requestNotifyPermission === 'function') requestNotifyPermission();

      const [apiConf, presets, dark, wp, icons] = await Promise.all([
        dbGet('apiConfig'), dbGet('apiPresets'), dbGet('darkMode'), dbGet('wallpaper'), dbGet('appIcons')
      ]);
      if (apiConf) api.value = { url: '', key: '', model: '', summaryUrl: '', summaryKey: '', summaryModel: '', ...apiConf };
      if (presets) apiPresets.value = presets;
      if (dark) { darkMode.value = true; document.body.classList.add('dark'); }
      if (wp) wallpaper.value = wp;
      if (icons) appIcons.value = icons;
      const savedGlobal = await dbGet('wallpaperGlobal');
      if (savedGlobal != null) wallpaperGlobal.value = savedGlobal;
      for (const key of Object.keys(pageWallpapers.value)) {
        const saved = await dbGet(`wallpaper_${key}`);
        if (saved) pageWallpapers.value[key] = saved;
      }
      const likeWp = await dbGet('wallpaper_like');
      if (likeWp) {
        wallpaper.value = likeWp;
        document.body.style.backgroundImage = `url(${likeWp})`;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center';
      } else if (wp) {
        document.body.style.backgroundImage = `url(${wp})`;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center';
      }
      await Promise.all([loadStorageInfo(), loadGlobalLogs()]);
      exportCharList.value = (await dbGet('charList')) || [];
      const savedFont = await dbGet('customFont');
      if (savedFont && savedFont.src) {
        customFontUrl.value = savedFont.src;
        customFontName.value = savedFont.name || '';
        injectGlobalFont(savedFont.src, savedFont.name);
      }
      const savedFontSize = await dbGet('customFontSize');
      if (savedFontSize) { globalFontSize.value = savedFontSize; applyGlobalFontSize(); }
      refreshIcons();
      addLog('喜欢App已打开');
      setTimeout(() => { lucide.createIcons(); refreshIcons(); }, 100);
      setTimeout(() => lucide.createIcons(), 500);
    });

    return {
      tab, api, modelList, apiPresets, presetName, showPresetPanel, showModelDrop, selectModel,
      consoleLogs, storageInfo, darkMode, wallpaper, wallpaperUrl,
      wallpaperStyle, appIcons, importFile, wallpaperFile, iconFile,
      saveApi, fetchModels, savePreset, loadPreset, deletePreset,
      showSummaryModelDrop, summaryModelList, showSummaryPresetPanel,
      selectSummaryModel, fetchSummaryModels, loadSummaryPreset,
      exportData, triggerImport, importData, clearStorage,
      toggleDark, applyWallpaperUrl, triggerWallpaper, uploadWallpaper, clearWallpaper,
      wallpaperGlobal, toggleWallpaperGlobal,
      pageWallpapers, pageWallpaperUrls, pageLabels, pageWallpaperFile, currentPageWallpaperKey,
      applyPageWallpaperUrl, triggerPageWallpaper, uploadPageWallpaper, clearPageWallpaper,
      triggerIconUpload, uploadIcon, goBack, drawerOpen, currentTabTitle,
      fontFile, customFontUrl, customFontName, previewFontLoaded, previewFontStyle,
      previewFontFromUrl, triggerFontUpload, previewFontFromFile, applyCustomFont, clearCustomFont,
      globalFontSize, applyGlobalFontSize, saveGlobalFontSize, clearGlobalFontSize,
      exportCharList, exportCharId, importBeautyFile, importCharFile,
      exportBeauty, triggerImportBeauty, importBeauty,
      exportSingleChar, triggerImportChar, importSingleChar,
      memoryDetails, memoryDonut, memoryTotal, memoryLoading, loadMemory,
    };
  }
}).mount('#like-app');
