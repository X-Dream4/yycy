const { createApp, ref, onMounted, nextTick, computed } = Vue;

createApp({
  setup() {
    const books = ref([]);
    const categories = ref([]);
    const formShow = ref(false);
    const catFormShow = ref(false);
    const editIndex = ref(-1);
    const newCatName = ref('');
    const currentCat = ref('全部');
    const form = ref({ name: '', type: 'worldview', keywords: '', content: '', category: '' });

    const typeLabel = (type) => ({ jailbreak: '破限', worldview: '世界观', persona: '人设补充', prompt: '提示词' }[type] || type);

    const goBack = () => { window.location.href = 'chat.html'; };

    const filteredBooks = computed(() => {
      if (currentCat.value === '全部') return books.value;
      return books.value.filter(b => b.category === currentCat.value);
    });

    const openAdd = () => { form.value = { name: '', type: 'worldview', keywords: '', content: '', category: currentCat.value === '全部' ? '' : currentCat.value }; editIndex.value = -1; formShow.value = true; nextTick(() => lucide.createIcons()); };

    const openEdit = (book, i) => { form.value = { ...book }; editIndex.value = books.value.findIndex(b => b.id === book.id); formShow.value = true; nextTick(() => lucide.createIcons()); };

    const saveBook = async () => {
      if (!form.value.name.trim()) { alert('请填写名称'); return; }
      if (!form.value.content.trim()) { alert('请填写内容'); return; }
      formShow.value = false;
      if (editIndex.value === -1) {
        books.value.push({ id: Date.now(), globalInject: false, ...form.value });
      } else {
        books.value[editIndex.value] = { ...books.value[editIndex.value], ...form.value };
      }
      await dbSet('worldBooks', JSON.parse(JSON.stringify(books.value)));
    };
    const toggleGlobalInject = async (book) => {
      const idx = books.value.findIndex(b => b.id === book.id);
      if (idx !== -1) {
        books.value[idx].globalInject = !books.value[idx].globalInject;
        await dbSet('worldBooks', JSON.parse(JSON.stringify(books.value)));
      }
    };

    const deleteBook = async (book) => {
      if (!confirm('确定删除这本世界书？')) return;
      const idx = books.value.findIndex(b => b.id === book.id);
      if (idx !== -1) books.value.splice(idx, 1);
      await dbSet('worldBooks', JSON.parse(JSON.stringify(books.value)));
    };

    const addCategory = async () => {
      if (!newCatName.value.trim()) return;
      if (categories.value.includes(newCatName.value.trim())) { alert('分类已存在'); return; }
      categories.value.push(newCatName.value.trim());
      await dbSet('worldBookCats', JSON.parse(JSON.stringify(categories.value)));
      newCatName.value = '';
      catFormShow.value = false;
    };

    const deleteCategory = async (cat) => {
      if (!confirm(`确定删除分类「${cat}」？该分类下的世界书不会被删除。`)) return;
      categories.value = categories.value.filter(c => c !== cat);
      books.value.forEach(b => { if (b.category === cat) b.category = ''; });
      await dbSet('worldBookCats', JSON.parse(JSON.stringify(categories.value)));
      await dbSet('worldBooks', JSON.parse(JSON.stringify(books.value)));
      if (currentCat.value === cat) currentCat.value = '全部';
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

      const dark = await dbGet('darkMode');
      if (dark) document.body.classList.add('dark');
      const pageWp = await dbGet('wallpaper_worldbook');
      const globalOn = await dbGet('wallpaperGlobal');
      const globalWp = await dbGet('wallpaper');
      const finalWp = pageWp || (globalOn ? globalWp : '');
      if (finalWp) { document.body.style.backgroundImage = `url(${finalWp})`; document.body.style.backgroundSize = 'cover'; document.body.style.backgroundPosition = 'center'; }
      const data = await dbGet('worldBooks');
      if (data) books.value = data;
      const cats = await dbGet('worldBookCats');
      if (cats) categories.value = cats;
      lucide.createIcons();
      setTimeout(() => { lucide.createIcons(); }, 200);
      setTimeout(() => { lucide.createIcons(); }, 500);
    });

    return {
      books, categories, formShow, catFormShow, editIndex, newCatName, currentCat, form,
      typeLabel, filteredBooks, goBack, openAdd, openEdit, saveBook, deleteBook, addCategory, deleteCategory, toggleGlobalInject
    };
  }
}).mount('#worldbook-app');
