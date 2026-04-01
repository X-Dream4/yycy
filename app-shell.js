(function () {
  const APP_ROUTE_MAP = {
    chat: { title: '聊天', type: 'module', module: 'chat' },
    like: { title: '喜欢', type: 'legacy', src: 'like.html' },
    world: { title: '世界', type: 'legacy', src: 'world.html' },
    collect: { title: '收藏', type: 'legacy', src: 'collect.html' },
    random: { title: '次元发现', type: 'legacy', src: 'random.html' },
    worldbook: { title: '世界书', type: 'legacy', src: 'worldbook.html' },
    forum: { title: '论坛', type: 'legacy', src: 'forum.html' },
    novel: { title: '小说', type: 'legacy', src: 'novel.html' },
    manga: { title: '漫画', type: 'legacy', src: 'manga.html' },
    moments: { title: '动态', type: 'legacy', src: 'moments.html' },
    'char-world': { title: '角色世界', type: 'legacy', src: 'char-world.html' }
  };

  const shellState = {
    view: 'desktop', // desktop | app-module | app-frame
    currentAppKey: '',
    currentSrc: ''
  };

  function getEls() {
    return {
      appRoot: document.getElementById('app'),
      shellRoot: document.getElementById('shell-root'),
      shellFrame: document.getElementById('shell-frame'),
      shellModule: document.getElementById('shell-module'),
      shellTitle: document.getElementById('shellTitle'),
      shellBackBtn: document.getElementById('shellBackBtn')
    };
  }

  async function renderShell() {
    const { appRoot, shellRoot, shellFrame, shellModule, shellTitle } = getEls();
    if (!appRoot || !shellRoot || !shellFrame || !shellModule || !shellTitle) return;

    if (shellState.view === 'desktop') {
      appRoot.style.display = '';
      shellRoot.classList.remove('show');
      shellRoot.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('shell-open');
      shellModule.style.display = 'none';
      shellModule.innerHTML = '';
      shellFrame.style.display = 'none';
      if (shellFrame.src !== 'about:blank') shellFrame.src = 'about:blank';
      return;
    }

    appRoot.style.display = 'none';
    shellRoot.classList.add('show');
    shellRoot.setAttribute('aria-hidden', 'false');
    document.body.classList.add('shell-open');

    const route = APP_ROUTE_MAP[shellState.currentAppKey];
    shellTitle.textContent = route?.title || '应用';

    if (shellState.view === 'app-module') {
      shellFrame.style.display = 'none';
      if (shellFrame.src !== 'about:blank') shellFrame.src = 'about:blank';
      shellModule.style.display = 'block';
      shellModule.innerHTML = '';

      if (route?.module === 'chat' && window.ChatAppView?.render) {
        await window.ChatAppView.render(shellModule, {
          openLegacyPage(src, title) {
            shellState.view = 'app-frame';
            shellState.currentSrc = src;
            if (title) shellTitle.textContent = title;
            renderShell();
          }
        });
      } else {
        shellModule.innerHTML = '<div style="padding:24px;color:#999;">模块未就绪</div>';
      }
      return;
    }

    shellModule.style.display = 'none';
    shellModule.innerHTML = '';
    shellFrame.style.display = 'block';

    if (shellFrame.dataset.currentSrc !== shellState.currentSrc) {
      shellFrame.src = shellState.currentSrc || 'about:blank';
      shellFrame.dataset.currentSrc = shellState.currentSrc || '';
    }
  }

  function openShellApp(appKey) {
    const route = APP_ROUTE_MAP[appKey];
    if (!route) return false;

    shellState.currentAppKey = appKey;

    if (route.type === 'module') {
      shellState.view = 'app-module';
      shellState.currentSrc = '';
    } else {
      shellState.view = 'app-frame';
      shellState.currentSrc = route.src;
    }

    renderShell();
    return true;
  }


  function backToDesktop() {
    shellState.view = 'desktop';
    shellState.currentAppKey = '';
    shellState.currentSrc = '';
    renderShell();
  }

  function bindShellEvents() {
    const { shellBackBtn } = getEls();
    if (shellBackBtn) {
      shellBackBtn.addEventListener('click', backToDesktop);
    }

    document.addEventListener('click', function (e) {
      const target = e.target.closest('[data-app-key]');
      if (!target) return;

      const appKey = target.getAttribute('data-app-key');
      if (!APP_ROUTE_MAP[appKey]) return;

      e.preventDefault();
      e.stopPropagation();
      openShellApp(appKey);
    }, true);
  }

  function initShell() {
    bindShellEvents();
    renderShell();
  }

  window.AppShell = {
    state: shellState,
    openApp: openShellApp,
    backToDesktop,
    render: renderShell,
    openLegacyPage(src, title = '应用') {
      shellState.view = 'app-frame';
      shellState.currentSrc = src;
      renderShell();
      const { shellTitle } = getEls();
      if (shellTitle) shellTitle.textContent = title;
    }
  };


  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initShell);
  } else {
    initShell();
  }
})();
