const { createApp, ref, onMounted } = Vue;

createApp({
  setup() {
    const goBack = () => { window.location.href = 'index.html'; };
    const goForum = () => { window.location.href = 'forum.html'; };
    const goNovel = () => { window.location.href = 'novel.html'; };
    const goManga = () => { window.location.href = 'manga.html'; };

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
      const globalWp = await dbGet('wallpaper');
      const pageWp = await dbGet('wallpaper_world');
      const globalOn = await dbGet('wallpaperGlobal');
      const finalWp = pageWp || (globalOn ? globalWp : '');
      if (finalWp) { document.body.style.backgroundImage = `url(${finalWp})`; document.body.style.backgroundSize = 'cover'; document.body.style.backgroundPosition = 'center'; }
      lucide.createIcons();
      setTimeout(() => { lucide.createIcons(); }, 200);
      setTimeout(() => { lucide.createIcons(); }, 500);
    });

    return { goBack, goForum, goNovel, goManga };
  }
}).mount('#world-app');
