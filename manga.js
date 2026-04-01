const { createApp, ref, computed, onMounted, nextTick } = Vue;

createApp({
  setup() {
    const view = ref('list');
    const mangaList = ref([]);
    const currentManga = ref({});
    const openNewMenu = ref(false);
    const createShow = ref(false);

    const editingManga = ref(null);
    const createForm = ref({ title: '', coverUrl: '' });
    const addChapterShow = ref(false);
    const chapterForm = ref({ title: '', pages: [] });

    // ===== 阅读 =====
    const readMode = ref('pager'); // 'pager' | 'scroll'
    const currentChapterIndex = ref(0);
    const currentPage = ref(0);
    const readUIShow = ref(true);
    const scrollArea = ref(null);
    let readUITimer = null;

    const currentChapter = computed(() => {
      if (!currentManga.value.chapters) return { title: '', pages: [] };
      return currentManga.value.chapters[currentChapterIndex.value] || { title: '', pages: [] };
    });

    const currentPages = computed(() => currentChapter.value.pages || []);

    let lucideTimer = null;
    const refreshIcons = () => { clearTimeout(lucideTimer); lucideTimer = setTimeout(() => { lucide.createIcons(); setTimeout(() => lucide.createIcons(), 200); }, 50); };

    const goBack = () => { window.location.href = 'world.html'; };

    // ===== 漫画列表操作 =====
    const saveMangaList = async () => {
      // 存储时不存图片数据到主列表，只存元数据
      const meta = mangaList.value.map(m => ({
        id: m.id, title: m.title, cover: m.cover,
        pageCount: m.pageCount, updateTime: m.updateTime,
        chapterMeta: m.chapters.map(ch => ({ title: ch.title, pageCount: ch.pages.length }))
      }));
      await dbSet('mangaList', JSON.parse(JSON.stringify(meta)));
    };

    const saveMangaData = async (manga) => {
      // 把每章图片单独存储，主数据只存元数据
      const mangaMeta = JSON.parse(JSON.stringify(manga));
      for (let i = 0; i < mangaMeta.chapters.length; i++) {
        const pages = mangaMeta.chapters[i].pages || [];
        if (pages.length > 0) {
          await dbSet(`mangaPages_${manga.id}_${i}`, pages);
          mangaMeta.chapters[i].pages = []; // 主数据不存图片
          mangaMeta.chapters[i].pageCount = pages.length;
        }
      }
      await dbSet(`mangaData_${manga.id}`, mangaMeta);
    };

    const openManga = async (m) => {
      const data = await dbGet(`mangaData_${m.id}`);
      if (data) {
        currentManga.value = data;
        // 章节图片按需不加载，点击阅读时才加载
      } else {
        currentManga.value = m;
      }
      view.value = 'detail';
      nextTick(() => refreshIcons());
    };


    const deleteManga = async (m) => {
      if (!confirm(`确定删除「${m.title}」吗？`)) return;
      mangaList.value = mangaList.value.filter(x => x.id !== m.id);
      // 清理主数据
      await dbSet(`mangaData_${m.id}`, null);
      // 清理所有章节图片（最多尝试清理100章）
      const data = await dbGet(`mangaData_${m.id}`);
      const chapterCount = (data?.chapters?.length) || (m.chapterMeta?.length) || 100;
      for (let i = 0; i < chapterCount; i++) {
        await dbSet(`mangaPages_${m.id}_${i}`, null);
      }
      await saveMangaList();
      nextTick(() => refreshIcons());
    };

    const openCreateManual = () => {
      openNewMenu.value = false;
      editingManga.value = null;
      createForm.value = { title: '', coverUrl: '' };
      createShow.value = true;
    };

    const openEditManga = () => {
      editingManga.value = currentManga.value;
      createForm.value = { title: currentManga.value.title, coverUrl: currentManga.value.cover || '' };
      createShow.value = true;
    };

    const confirmCreate = async () => {
      if (!createForm.value.title.trim()) { alert('请输入标题'); return; }
      createShow.value = false;
      if (editingManga.value) {
        currentManga.value.title = createForm.value.title.trim();
        if (createForm.value.coverUrl.trim()) currentManga.value.cover = createForm.value.coverUrl.trim();
        const idx = mangaList.value.findIndex(m => m.id === currentManga.value.id);
        if (idx !== -1) { mangaList.value[idx].title = currentManga.value.title; mangaList.value[idx].cover = currentManga.value.cover; }
        await saveMangaData(currentManga.value);
        await saveMangaList();
      } else {
        const now = Date.now();
        const newManga = {
          id: now, title: createForm.value.title.trim(),
          cover: createForm.value.coverUrl.trim() || '',
          chapters: [], pageCount: 0, updateTime: now
        };
        mangaList.value.unshift(newManga);
        await saveMangaData(newManga);
        await saveMangaList();
        currentManga.value = newManga;
        view.value = 'detail';
      }
      nextTick(() => refreshIcons());
    };
    const triggerPdfUpload = () => { openNewMenu.value = false; document.getElementById('manga-pdf-file').click(); };

    const handlePdfUpload = async (e) => {
      const file = e.target.files[0]; if (!file) return;
      const title = file.name.replace(/\.pdf$/i, '');
      try {
        // 使用 legacy build，不需要 worker
        const loadingTask = pdfjsLib.getDocument({
          data: await file.arrayBuffer(),
          useWorkerFetch: false,
          isEvalSupported: false,
          useSystemFonts: true,
        });
        const pdfDoc = await loadingTask.promise;
        const numPages = pdfDoc.numPages;
        if (numPages === 0) { alert('PDF 没有内容'); e.target.value = ''; return; }

        alert(`开始渲染，共 ${numPages} 页，请稍候...`);

        const pages = [];
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        for (let i = 1; i <= numPages; i++) {
          const page = await pdfDoc.getPage(i);
          const viewport = page.getViewport({ scale: 1.5 });
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvasContext: ctx, viewport }).promise;
          pages.push(canvas.toDataURL('image/jpeg', 0.8));
        }

        if (!pages.length) { alert('PDF 页面提取失败'); e.target.value = ''; return; }

        const now = Date.now();
        const cover = pages[0];
        const newManga = {
          id: now, title, cover,
          chapters: [{ title: '第1话', pages }],
          pageCount: pages.length, updateTime: now
        };
        mangaList.value.unshift(newManga);
        await saveMangaData(newManga);
        await saveMangaList();
        alert(`导入成功，共 ${pages.length} 页`);
        currentManga.value = newManga;
        view.value = 'detail';
        nextTick(() => refreshIcons());
      } catch (err) {
        alert('PDF 解析失败：' + err.message);
      }
      e.target.value = '';
    };


    // ===== cbz 上传 =====
    const triggerCbzUpload = () => { openNewMenu.value = false; document.getElementById('manga-cbz-file').click(); };
    const triggerEpubUpload = () => { openNewMenu.value = false; document.getElementById('manga-epub-file').click(); };

    const handleEpubUpload = async (e) => {
      const file = e.target.files[0]; if (!file) return;
      const title = file.name.replace(/\.epub$/i, '');
      try {
        const buffer = await file.arrayBuffer();
        const zip = await JSZip.loadAsync(buffer);

        // 找所有图片文件
        const imgFiles = [];
        zip.forEach((path, f) => {
          if (!f.dir && /\.(jpe?g|png|webp|gif|bmp)$/i.test(path)) {
            imgFiles.push({ path, file: f });
          }
        });

        if (!imgFiles.length) {
          alert('这个 epub 里没有找到图片，可能是文字型 epub，请用次元小说功能导入');
          e.target.value = '';
          return;
        }

        // 尝试按 OPF spine 顺序排列
        let orderedFiles = [];
        try {
          const containerXml = await zip.file('META-INF/container.xml')?.async('string');
          if (containerXml) {
            const opfMatch = containerXml.match(/full-path="([^"]+\.opf)"/);
            if (opfMatch) {
              const opfPath = opfMatch[1];
              const opfDir = opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/') + 1) : '';
              const opfXml = await zip.file(opfPath)?.async('string');
              if (opfXml) {
                const manifestMap = {};
                const manifestTypeMap = {};
                for (const m of opfXml.matchAll(/<item\s[^>]*>/g)) {
                  const idM = m[0].match(/\bid="([^"]+)"/);
                  const hrefM = m[0].match(/\bhref="([^"]+)"/);
                  const typeM = m[0].match(/\bmedia-type="([^"]+)"/);
                  if (idM && hrefM) {
                    manifestMap[idM[1]] = opfDir + hrefM[1];
                    manifestTypeMap[idM[1]] = typeM?.[1] || '';
                  }
                }
                const spineIds = [...opfXml.matchAll(/<itemref[^>]+idref="([^"]+)"/g)].map(m => m[1]);
                for (const id of spineIds) {
                  const href = manifestMap[id];
                  const type = manifestTypeMap[id];
                  if (href && type && type.startsWith('image/')) {
                    const f = zip.file(href) || zip.file(decodeURIComponent(href));
                    if (f) orderedFiles.push({ path: href, file: f });
                  }
                }
                // 如果 spine 里没有直接的图片，找 manifest 里的图片按路径排序
                if (!orderedFiles.length) {
                  for (const [id, href] of Object.entries(manifestMap)) {
                    if (manifestTypeMap[id]?.startsWith('image/') && !href.includes('cover')) {
                      const f = zip.file(href) || zip.file(decodeURIComponent(href));
                      if (f) orderedFiles.push({ path: href, file: f });
                    }
                  }
                  orderedFiles.sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true }));
                }
              }
            }
          }
        } catch (err) {}

        // 如果 OPF 解析失败，直接按路径排序
        if (!orderedFiles.length) {
          orderedFiles = imgFiles.sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true }));
        }

        if (!orderedFiles.length) {
          alert('无法提取图片，请尝试转换为 cbz 格式再导入');
          e.target.value = '';
          return;
        }

        // 转为 base64
        const pages = [];
        for (const { file: f, path } of orderedFiles) {
          const ext = path.split('.').pop().toLowerCase();
          const mimeMap = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', bmp: 'image/bmp' };
          const mime = mimeMap[ext] || 'image/jpeg';
          const arrayBuffer = await f.async('arraybuffer');
          const url = await new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = evt => resolve(evt.target.result);
            reader.readAsDataURL(new Blob([arrayBuffer], { type: mime }));
          });
          pages.push(url);
        }

        const now = Date.now();
        const cover = pages[0] || '';
        const newManga = {
          id: now, title, cover,
          chapters: [{ title: '第1话', pages }],
          pageCount: pages.length, updateTime: now
        };
        mangaList.value.unshift(newManga);
        await saveMangaData(newManga);
        await saveMangaList();
        alert(`导入成功，共 ${pages.length} 页`);
        currentManga.value = newManga;
        view.value = 'detail';
        nextTick(() => refreshIcons());
      } catch (err) {
        alert('epub 解析失败：' + err.message);
      }
      e.target.value = '';
    };

    const handleCbzUpload = async (e) => {
      const file = e.target.files[0]; if (!file) return;
      const title = file.name.replace(/\.(cbz|zip)$/i, '');
      try {
        const buffer = await file.arrayBuffer();
        const zip = await JSZip.loadAsync(buffer);
        const imgFiles = [];
        zip.forEach((path, f) => {
          if (!f.dir && /\.(jpe?g|png|webp|gif|bmp)$/i.test(path)) {
            imgFiles.push({ path, file: f });
          }
        });
        imgFiles.sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true }));
        if (!imgFiles.length) { alert('cbz 文件中没有找到图片'); e.target.value = ''; return; }

        const pages = [];
        for (const { file: f } of imgFiles) {
          const blob = await f.async('blob');
          const url = await new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = evt => resolve(evt.target.result);
            reader.readAsDataURL(blob);
          });
          pages.push(url);
        }

        const now = Date.now();
        const cover = pages[0] || '';
        const newManga = {
          id: now, title, cover,
          chapters: [{ title: '第1话', pages }],
          pageCount: pages.length, updateTime: now
        };
        mangaList.value.unshift(newManga);
        await saveMangaData(newManga);
        await saveMangaList();
        alert(`导入成功，共 ${pages.length} 页`);
        currentManga.value = newManga;
        view.value = 'detail';
        nextTick(() => refreshIcons());
      } catch (err) {
        alert('cbz 解析失败：' + err.message);
      }
      e.target.value = '';
    };

    // ===== 图片文件夹上传 =====
    const triggerImgUpload = () => { openNewMenu.value = false; document.getElementById('manga-img-file').click(); };

    const handleImgUpload = async (e) => {
      const files = Array.from(e.target.files);
      if (!files.length) return;
      const imgFiles = files.filter(f => /\.(jpe?g|png|webp|gif|bmp)$/i.test(f.name));
      imgFiles.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
      if (!imgFiles.length) { alert('没有找到图片文件'); e.target.value = ''; return; }

      const pages = [];
      for (const f of imgFiles) {
        const url = await new Promise(resolve => {
          const reader = new FileReader();
          reader.onload = evt => resolve(evt.target.result);
          reader.readAsDataURL(f);
        });
        pages.push(url);
      }

      const now = Date.now();
      const title = imgFiles[0].name.replace(/[_\-\s]?\d+\.(jpe?g|png|webp|gif|bmp)$/i, '') || '我的漫画';
      const cover = pages[0] || '';
      const newManga = {
        id: now, title, cover,
        chapters: [{ title: '第1话', pages }],
        pageCount: pages.length, updateTime: now
      };
      mangaList.value.unshift(newManga);
      await saveMangaData(newManga);
      await saveMangaList();
      alert(`导入成功，共 ${pages.length} 页`);
      currentManga.value = newManga;
      view.value = 'detail';
      nextTick(() => refreshIcons());
      e.target.value = '';
    };

    // ===== 添加章节 =====
    const openAddChapter = () => {
      chapterForm.value = { title: `第${currentManga.value.chapters.length + 1}话`, pages: [] };
      addChapterShow.value = true;
      nextTick(() => refreshIcons());
    };

    const triggerChapterImgs = () => { document.getElementById('manga-chapter-imgs').click(); };

    const handleChapterImgs = async (e) => {
      const files = Array.from(e.target.files).filter(f => /\.(jpe?g|png|webp|gif|bmp)$/i.test(f.name));
      files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
      for (const f of files) {
        const url = await new Promise(resolve => {
          const reader = new FileReader();
          reader.onload = evt => resolve(evt.target.result);
          reader.readAsDataURL(f);
        });
        chapterForm.value.pages.push(url);
      }
      e.target.value = '';
    };

    const confirmAddChapter = async () => {
      if (!chapterForm.value.pages.length) return;
      addChapterShow.value = false;
      currentManga.value.chapters.push({
        title: chapterForm.value.title.trim() || `第${currentManga.value.chapters.length + 1}话`,
        pages: chapterForm.value.pages
      });
      currentManga.value.pageCount = currentManga.value.chapters.reduce((a, ch) => a + ch.pages.length, 0);
      currentManga.value.updateTime = Date.now();
      if (!currentManga.value.cover && chapterForm.value.pages.length) currentManga.value.cover = chapterForm.value.pages[0];
      const idx = mangaList.value.findIndex(m => m.id === currentManga.value.id);
      if (idx !== -1) { mangaList.value[idx].pageCount = currentManga.value.pageCount; mangaList.value[idx].cover = currentManga.value.cover; }
      await saveMangaData(currentManga.value);
      await saveMangaList();
      nextTick(() => refreshIcons());
    };

    const deleteChapter = async (i) => {
      if (!confirm(`确定删除「${currentManga.value.chapters[i].title}」吗？`)) return;
      currentManga.value.chapters.splice(i, 1);
      currentManga.value.pageCount = currentManga.value.chapters.reduce((a, ch) => a + ch.pages.length, 0);
      await saveMangaData(currentManga.value);
      await saveMangaList();
    };

    // ===== 阅读模式 =====
    const openRead = async (chapterIdx) => {
      currentChapterIndex.value = chapterIdx;
      currentPage.value = 0;
      readUIShow.value = true;
      view.value = 'read';
      clearTimeout(readUITimer);
      readUITimer = setTimeout(() => { readUIShow.value = false; }, 3000);

      // 按需加载图片
      const ch = currentManga.value.chapters[chapterIdx];
      if (!ch.pages || ch.pages.length === 0) {
        const pages = await dbGet(`mangaPages_${currentManga.value.id}_${chapterIdx}`);
        if (pages) {
          currentManga.value.chapters[chapterIdx].pages = pages;
        }
      }
    };

    const closeRead = () => {
      view.value = 'detail';
      clearTimeout(readUITimer);
      nextTick(() => refreshIcons());
    };

    const toggleReadUI = () => {
      readUIShow.value = !readUIShow.value;
      clearTimeout(readUITimer);
      if (readUIShow.value) {
        readUITimer = setTimeout(() => { readUIShow.value = false; }, 3000);
      }
    };

    const toggleReadMode = () => {
      readMode.value = readMode.value === 'pager' ? 'scroll' : 'pager';
      currentPage.value = 0;
    };

    const prevPage = () => {
      if (currentPage.value > 0) { currentPage.value--; }
      else { prevChapterRead(); }
    };

    const nextPage = () => {
      if (currentPage.value < currentPages.value.length - 1) { currentPage.value++; }
      else { nextChapterRead(); }
    };

    const prevChapterRead = async () => {
      if (currentChapterIndex.value > 0) {
        currentChapterIndex.value--;
        currentPage.value = 0;
        if (scrollArea.value) scrollArea.value.scrollTop = 0;
        const ch = currentManga.value.chapters[currentChapterIndex.value];
        if (!ch.pages || ch.pages.length === 0) {
          const pages = await dbGet(`mangaPages_${currentManga.value.id}_${currentChapterIndex.value}`);
          if (pages) currentManga.value.chapters[currentChapterIndex.value].pages = pages;
        }
      }
    };

    const nextChapterRead = async () => {
      if (currentChapterIndex.value < currentManga.value.chapters.length - 1) {
        currentChapterIndex.value++;
        currentPage.value = 0;
        if (scrollArea.value) scrollArea.value.scrollTop = 0;
        const ch = currentManga.value.chapters[currentChapterIndex.value];
        if (!ch.pages || ch.pages.length === 0) {
          const pages = await dbGet(`mangaPages_${currentManga.value.id}_${currentChapterIndex.value}`);
          if (pages) currentManga.value.chapters[currentChapterIndex.value].pages = pages;
        }
      }
    };

    const onScrollRead = () => {
      if (!scrollArea.value) return;
      const el = scrollArea.value;
      const total = el.scrollHeight - el.clientHeight;
      if (total <= 0) return;
      const ratio = el.scrollTop / total;
      currentPage.value = Math.min(currentPages.value.length - 1, Math.floor(ratio * currentPages.value.length));
    };

    // ===== 键盘快捷键 =====
    const onKeyDown = (e) => {
      if (view.value !== 'read') return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextPage();
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') prevPage();
      if (e.key === 'Escape') closeRead();
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
      if (savedFont && savedFont.src) {
        let style = document.getElementById('custom-font-style');
        if (!style) { style = document.createElement('style'); style.id = 'custom-font-style'; document.head.appendChild(style); }
        style.textContent = `@font-face { font-family: 'CustomGlobalFont'; src: url('${savedFont.src}'); } * { font-family: 'CustomGlobalFont', -apple-system, 'PingFang SC', sans-serif !important; }`;
      }

      const savedManga = await dbGet('mangaList');
      if (savedManga) mangaList.value = savedManga;

      // 迁移旧数据：把大图片从主数据里分离出去
      for (const m of mangaList.value) {
        try {
          const oldData = await dbGet(`mangaData_${m.id}`);
          if (!oldData) continue;
          let needMigrate = false;
          for (let i = 0; i < oldData.chapters.length; i++) {
            if (oldData.chapters[i].pages && oldData.chapters[i].pages.length > 0) {
              needMigrate = true;
              break;
            }
          }
          if (needMigrate) {
            await saveMangaData(oldData);
          }
        } catch(e) {}
      }

      document.addEventListener('keydown', onKeyDown);

      setTimeout(() => { lucide.createIcons(); refreshIcons(); }, 100);
    });

    return {
      view, mangaList, currentManga, openNewMenu, createShow, editingManga, createForm,
      addChapterShow, chapterForm,
      readMode, currentChapterIndex, currentPage, readUIShow, scrollArea,
      currentChapter, currentPages,
      goBack, openManga, deleteManga, openCreateManual, openEditManga, confirmCreate,
      triggerCbzUpload, handleCbzUpload, triggerImgUpload, handleImgUpload,
      triggerEpubUpload, handleEpubUpload,
      triggerPdfUpload, handlePdfUpload,
      openAddChapter, triggerChapterImgs, handleChapterImgs, confirmAddChapter, deleteChapter,
      openRead, closeRead, toggleReadUI, toggleReadMode,
      prevPage, nextPage, prevChapterRead, nextChapterRead, onScrollRead,
    };
  }
}).mount('#manga-app');
