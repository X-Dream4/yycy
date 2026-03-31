(function() {
  'use strict';

  // ===== 默认设置 =====
  const DEFAULT_SETTINGS = {
    enabled: false,
    // 按键样式
    btnShape: 'heart', // heart/circle/square/rounded/hexagon/star/image
    btnImage: '',
    btnSize: 52,
    btnColor: '#6c63ff',
    btnOpacity: 0.92,
    btnTexture: 'glass', // glass/blur/shadow/transparent/neon/metal/rubber/cream/liquid
    btnX: null,
    btnY: null,
    // 面板样式
    panelLayout: 'grid', // grid/list/radial
    panelShape: 'rounded', // rounded/circle/rect
    panelColor: '#ffffff',
    panelOpacity: 0.88,
    panelTexture: 'blur',
    panelSize: 'medium', // small/medium/large
    // 按键显示模式
    itemMode: 'icontext', // icontext/icon/text
    itemSize: 48,
    itemColor: '#ffffff',
    itemOpacity: 0.9,
    itemTexture: 'glass',
    // 按键列表
    items: [
      { id: 'home',     type: 'nav',    label: '主页',     icon: '⌂',  url: 'index.html',     enabled: true },
      { id: 'chat',     type: 'nav',    label: '聊天',     icon: '◎',  url: 'chat.html',      enabled: true },
      { id: 'like',     type: 'nav',    label: '喜欢',     icon: '♡',  url: 'like.html',      enabled: true },
      { id: 'world',    type: 'nav',    label: '世界',     icon: '◈',  url: 'world.html',     enabled: true },
      { id: 'collect',  type: 'nav',    label: '收藏',     icon: '◇',  url: 'collect.html',   enabled: true },
      { id: 'share',    type: 'nav',    label: '涟波',     icon: '◉',  url: 'share.html',     enabled: false },
      { id: 'random',   type: 'nav',    label: '次元发现', icon: '⊕',  url: 'random.html',    enabled: false },
      { id: 'worldbook',type: 'nav',    label: '世界书',   icon: '≡',  url: 'worldbook.html', enabled: false },
      { id: 'forum',    type: 'nav',    label: '论坛',     icon: '◫',  url: 'forum.html',     enabled: false },
      { id: 'novel',    type: 'nav',    label: '小说',     icon: '▤',  url: 'novel.html',     enabled: false },
      { id: 'manga',    type: 'nav',    label: '漫画',     icon: '▣',  url: 'manga.html',     enabled: false },
      { id: 'back',     type: 'action', label: '上一页',   icon: '◁',  action: 'back',        enabled: true },
      { id: 'refresh',  type: 'action', label: '刷新',     icon: '↺',  action: 'refresh',     enabled: true },
      { id: 'top',      type: 'action', label: '顶部',     icon: '△',  action: 'top',         enabled: false },
      { id: 'bottom',   type: 'action', label: '底部',     icon: '▽',  action: 'bottom',      enabled: false },
    ],
    // 角色/聊天室快捷键（动态添加）
    charItems: [],
    roomItems: [],
  };

  let settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  let panelOpen = false;
  let isDragging = false;
  let dragStartX = 0, dragStartY = 0;
  let btnStartX = 0, btnStartY = 0;
  let hasMoved = false;

  // ===== 工具函数 =====
  const dbGet = (key) => new Promise(resolve => {
    const req = indexedDB.open('rolecard_db', 1);
    req.onsuccess = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('kv')) { resolve(null); return; }
      const tx = db.transaction('kv', 'readonly');
      const store = tx.objectStore('kv');
      const r = store.get(key);
      r.onsuccess = () => resolve(r.result ?? null);
      r.onerror = () => resolve(null);
    };
    req.onerror = () => resolve(null);
  });

  // ===== 质感 CSS =====
  const getTextureCss = (texture, color, opacity) => {
    const hex = color || '#6c63ff';
    const op = opacity ?? 0.9;
    const rgb = hexToRgb(hex);
    const base = `rgba(${rgb.r},${rgb.g},${rgb.b},${op})`;
    switch (texture) {
      case 'blur':
        return `background:${base};backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);`;
      case 'glass':
        return `background:linear-gradient(135deg,rgba(${rgb.r},${rgb.g},${rgb.b},${Math.min(op,0.6)}) 0%,rgba(${rgb.r},${rgb.g},${rgb.b},${Math.min(op*0.7,0.4)}) 100%);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.3);box-shadow:0 8px 32px rgba(${rgb.r},${rgb.g},${rgb.b},0.2),inset 0 1px 0 rgba(255,255,255,0.4);`;
      case 'liquid':
        return `background:linear-gradient(135deg,rgba(${rgb.r},${rgb.g},${rgb.b},${op}) 0%,rgba(${Math.min(rgb.r+40,255)},${Math.min(rgb.g+20,255)},${Math.min(rgb.b+60,255)},${op}) 100%);backdrop-filter:blur(12px);box-shadow:0 4px 24px rgba(${rgb.r},${rgb.g},${rgb.b},0.4),inset 0 1px 0 rgba(255,255,255,0.5);`;
      case 'neon':
        return `background:rgba(${rgb.r},${rgb.g},${rgb.b},${op*0.8});box-shadow:0 0 10px rgba(${rgb.r},${rgb.g},${rgb.b},0.8),0 0 20px rgba(${rgb.r},${rgb.g},${rgb.b},0.5),0 0 40px rgba(${rgb.r},${rgb.g},${rgb.b},0.3);border:1px solid rgba(${rgb.r},${rgb.g},${rgb.b},0.9);`;
      case 'metal':
        return `background:linear-gradient(145deg,rgba(${Math.min(rgb.r+60,255)},${Math.min(rgb.g+60,255)},${Math.min(rgb.b+60,255)},${op}),rgba(${rgb.r},${rgb.g},${rgb.b},${op}),rgba(${Math.max(rgb.r-40,0)},${Math.max(rgb.g-40,0)},${Math.max(rgb.b-40,0)},${op}));box-shadow:2px 4px 8px rgba(0,0,0,0.3),inset 0 1px 0 rgba(255,255,255,0.6);`;
      case 'rubber':
        return `background:${base};box-shadow:0 4px 0 rgba(0,0,0,0.2),0 6px 6px rgba(0,0,0,0.15);border:2px solid rgba(0,0,0,0.1);`;
      case 'cream':
        return `background:rgba(${Math.min(rgb.r+30,255)},${Math.min(rgb.g+25,255)},${Math.min(rgb.b+20,255)},${op});box-shadow:0 4px 16px rgba(0,0,0,0.1),inset 0 2px 4px rgba(255,255,255,0.8),inset 0 -2px 4px rgba(0,0,0,0.05);border:1px solid rgba(255,255,255,0.6);`;
      case 'shadow':
        return `background:${base};box-shadow:0 8px 24px rgba(0,0,0,0.3),0 2px 8px rgba(0,0,0,0.2);`;
      case 'transparent':
        return `background:rgba(${rgb.r},${rgb.g},${rgb.b},${Math.min(op*0.4,0.3)});border:1px solid rgba(${rgb.r},${rgb.g},${rgb.b},0.4);`;
      default:
        return `background:${base};`;
    }
  };

  const hexToRgb = (hex) => {
    const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return r ? { r: parseInt(r[1],16), g: parseInt(r[2],16), b: parseInt(r[3],16) } : {r:108,g:99,b:255};
  };

  // ===== 形状 CSS =====
  const getShapeCss = (shape, size) => {
    switch (shape) {
      case 'circle': return `border-radius:50%;`;
      case 'square': return `border-radius:0;`;
      case 'rounded': return `border-radius:${size*0.25}px;`;
      case 'hexagon': return `clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);`;
      case 'star': return `clip-path:polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%);`;
      case 'heart': return `border-radius:50% 50% 0 0;transform-origin:center;`;
      default: return `border-radius:50%;`;
    }
  };

  // ===== 心形 SVG =====
  const getHeartSvg = (color) => `<svg viewBox="0 0 100 90" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;"><path d="M50 85 C50 85 5 50 5 25 C5 10 15 0 30 0 C40 0 50 10 50 10 C50 10 60 0 70 0 C85 0 95 10 95 25 C95 50 50 85 50 85Z" fill="${color}"/></svg>`;

  // ===== 构建按键内容 =====
  const buildBtnContent = (item, mode, itemSize) => {
    const iconSize = mode === 'icontext' ? itemSize * 0.45 : itemSize * 0.55;
    const icon = item.customImage
      ? `<img src="${item.customImage}" style="width:${iconSize}px;height:${iconSize}px;object-fit:cover;border-radius:4px;" />`
      : `<span style="font-size:${iconSize}px;line-height:1;">${item.icon}</span>`;
    if (mode === 'icon') return icon;
    if (mode === 'text') return `<span style="font-size:${itemSize*0.2}px;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,0.5);font-weight:600;">${item.label}</span>`;
    return `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;">${icon}<span style="font-size:${Math.max(itemSize*0.18,9)}px;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,0.6);font-weight:600;white-space:nowrap;">${item.label}</span></div>`;
  };

  // ===== 创建悬浮按键 DOM =====
  let btnEl = null;
  let panelEl = null;

  const createFloatBtn = () => {
    if (btnEl) btnEl.remove();
    if (panelEl) panelEl.remove();

    const size = settings.btnSize || 52;
    const textureCss = getTextureCss(settings.btnTexture, settings.btnColor, settings.btnOpacity);
    const shapeCss = settings.btnShape === 'heart' ? '' : getShapeCss(settings.btnShape, size);

    btnEl = document.createElement('div');
    btnEl.id = 'float-btn-main';
    btnEl.style.cssText = `
      position:fixed;
      width:${size}px;
      height:${size}px;
      z-index:1000000;
      cursor:pointer;
      display:flex;
      align-items:center;
      justify-content:center;
      transition:transform 0.15s ease;
      user-select:none;
      -webkit-user-select:none;
      ${textureCss}
      ${shapeCss}
    `;

    // 定位
    const savedX = settings.btnX;
    const savedY = settings.btnY;
    if (savedX !== null && savedY !== null) {
      btnEl.style.left = savedX + 'px';
      btnEl.style.top = savedY + 'px';
    } else {
      btnEl.style.right = '16px';
      btnEl.style.top = '50%';
      btnEl.style.transform = 'translateY(-50%)';
    }

    // 内容
    if (settings.btnShape === 'heart' && !settings.btnImage) {
      btnEl.innerHTML = getHeartSvg(settings.btnColor || '#6c63ff');
      btnEl.style.background = 'transparent';
      btnEl.style.boxShadow = 'none';
      btnEl.style.border = 'none';
      btnEl.style.backdropFilter = 'none';
    } else if (settings.btnImage) {
      btnEl.innerHTML = `<img src="${settings.btnImage}" style="width:${size*0.7}px;height:${size*0.7}px;object-fit:cover;border-radius:4px;" />`;
    } else {
      btnEl.innerHTML = `<span style="font-size:${size*0.45}px;">✦</span>`;
    }

    // 拖拽
    let moved = false;
    const onDown = (e) => {
      const touch = e.touches ? e.touches[0] : e;
      dragStartX = touch.clientX;
      dragStartY = touch.clientY;
      btnStartX = btnEl.getBoundingClientRect().left;
      btnStartY = btnEl.getBoundingClientRect().top;
      moved = false;
      isDragging = true;
      btnEl.style.transition = 'none';

      const onMove = (e2) => {
        const t = e2.touches ? e2.touches[0] : e2;
        const dx = t.clientX - dragStartX;
        const dy = t.clientY - dragStartY;
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) moved = true;
        if (!moved) return;
        const nx = Math.max(0, Math.min(window.innerWidth - size, btnStartX + dx));
        const ny = Math.max(0, Math.min(window.innerHeight - size, btnStartY + dy));
        btnEl.style.left = nx + 'px';
        btnEl.style.top = ny + 'px';
        btnEl.style.right = 'auto';
        btnEl.style.transform = 'none';
        if (panelOpen) closePanel();
      };

      const onUp = async () => {
        isDragging = false;
        btnEl.style.transition = 'transform 0.15s ease';
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('touchend', onUp);
        if (moved) {
          settings.btnX = parseInt(btnEl.style.left);
          settings.btnY = parseInt(btnEl.style.top);
          await saveSettings();
        } else {
          setTimeout(() => togglePanel(), 50);
        }
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      document.addEventListener('touchmove', onMove, { passive: false });
      document.addEventListener('touchend', onUp);
    };

    btnEl.addEventListener('mousedown', onDown);
    btnEl.addEventListener('touchstart', onDown, { passive: true });
    document.body.appendChild(btnEl);

    createPanel();
  };

  // ===== 创建面板 =====
  const createPanel = () => {
    if (panelEl) panelEl.remove();
    panelEl = document.createElement('div');
    panelEl.id = 'float-btn-panel';

    const pTexture = getTextureCss(settings.panelTexture, settings.panelColor, settings.panelOpacity);
    const sizeMap = { small: 220, medium: 280, large: 340 };
    const pw = sizeMap[settings.panelSize] || 280;

    panelEl.style.cssText = `
      position:fixed;
      z-index:999999;
      width:${pw}px;
      max-height:70vh;
      overflow-y:auto;
      border-radius:20px;
      padding:14px;
      display:none;
      flex-direction:column;
      gap:10px;
      ${pTexture}
    `;

    document.body.appendChild(panelEl);
    updatePanelContent();
  };

  // ===== 更新面板内容 =====
  const updatePanelContent = () => {
    if (!panelEl) return;
    const allItems = [
      ...settings.items.filter(i => i.enabled),
      ...settings.charItems.map(c => ({
        id: 'char_' + c.id,
        type: 'char',
        label: c.name,
        icon: c.avatar ? '' : '人',
        customImage: c.avatar || '',
        url: `chatroom.html?id=${c.id}&type=char`,
        enabled: true
      })),
      ...settings.roomItems.map(r => ({
        id: 'room_' + r.id,
        type: 'room',
        label: r.name,
        icon: '室',
        url: `groupchat.html?id=${r.id}`,
        enabled: true
      }))
    ];

    const layout = settings.panelLayout || 'grid';
    const mode = settings.itemMode || 'icontext';
    const itemSize = settings.itemSize || 48;

    let gridStyle = '';
    if (layout === 'grid') {
      const cols = settings.panelSize === 'small' ? 3 : settings.panelSize === 'large' ? 5 : 4;
      gridStyle = `display:grid;grid-template-columns:repeat(${cols},1fr);gap:10px;`;
    } else if (layout === 'list') {
      gridStyle = `display:flex;flex-direction:column;gap:8px;`;
    } else if (layout === 'radial') {
      gridStyle = `display:flex;flex-wrap:wrap;gap:10px;justify-content:center;`;
    }

    panelEl.innerHTML = `<div style="${gridStyle}">
      ${allItems.map(item => {
        const iTexture = getTextureCss(settings.itemTexture, settings.itemColor, settings.itemOpacity);
        const iShape = getShapeCss('rounded', itemSize);
        const itemListStyle = layout === 'list'
          ? `display:flex;align-items:center;gap:10px;width:100%;padding:0 10px;`
          : `display:flex;flex-direction:column;align-items:center;justify-content:center;`;
        return `<div
          class="float-panel-item"
          data-url="${item.url || ''}"
          data-action="${item.action || ''}"
          style="
            width:${layout === 'list' ? '100%' : itemSize + 'px'};
            height:${layout === 'list' ? 'auto' : itemSize + 'px'};
            min-height:${layout === 'list' ? '40px' : ''};
            border-radius:${layout === 'list' ? '12px' : itemSize * 0.25 + 'px'};
            padding:${layout === 'list' ? '8px' : '6px'};
            cursor:pointer;
            ${iTexture}
            ${itemListStyle}
            transition:transform 0.1s,opacity 0.1s;
            box-sizing:border-box;
          "
          onmouseenter="this.style.transform='scale(1.08)'"
          onmouseleave="this.style.transform='scale(1)'"
        >
          ${buildBtnContent(item, mode, itemSize)}
        </div>`;
      }).join('')}
    </div>`;

    panelEl.querySelectorAll('.float-panel-item').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const url = el.dataset.url;
        const action = el.dataset.action;
        if (action === 'back') { window.history.back(); closePanel(); }
        else if (action === 'refresh') { location.reload(); }
        else if (action === 'top') { window.scrollTo({top:0,behavior:'smooth'}); closePanel(); }
        else if (action === 'bottom') { window.scrollTo({top:document.body.scrollHeight,behavior:'smooth'}); closePanel(); }
        else if (url) { window.location.href = url; }
      });
    });
  };

  // ===== 展开/收起面板 =====
  const togglePanel = () => {
    panelOpen ? closePanel() : openPanel();
  };

  const openPanel = () => {
    if (!panelEl) return;
    updatePanelContent();
    panelEl.style.display = 'flex';
    positionPanel();
    panelOpen = true;
    setTimeout(() => {
      document.addEventListener('click', outsideClickHandler);
    }, 100);
  };

  const closePanel = () => {
    if (panelEl) panelEl.style.display = 'none';
    panelOpen = false;
    document.removeEventListener('click', outsideClickHandler);
  };

  const outsideClickHandler = (e) => {
    if (!panelEl.contains(e.target) && !btnEl.contains(e.target)) {
      closePanel();
    }
  };

  const positionPanel = () => {
    if (!btnEl || !panelEl) return;
    const btnRect = btnEl.getBoundingClientRect();
    const pw = panelEl.offsetWidth || 280;
    const ph = Math.min(panelEl.scrollHeight, window.innerHeight * 0.7);
    let left = btnRect.left - pw - 10;
    let top = btnRect.top + btnRect.height / 2 - ph / 2;
    if (left < 8) left = btnRect.right + 10;
    if (left + pw > window.innerWidth - 8) left = window.innerWidth - pw - 8;
    if (top < 8) top = 8;
    if (top + ph > window.innerHeight - 8) top = window.innerHeight - ph - 8;
    panelEl.style.left = left + 'px';
    panelEl.style.top = top + 'px';
  };

  // ===== 存储 =====
  const saveSettings = async () => {
    if (typeof dbSet === 'function') {
      await dbSet('floatBtnSettings', JSON.parse(JSON.stringify(settings)));
    } else {
      localStorage.setItem('floatBtnSettings', JSON.stringify(settings));
    }
  };

  const loadSettings = async () => {
    let saved = null;
    try {
      saved = await dbGet('floatBtnSettings');
    } catch(e) {}
    if (!saved) {
      const ls = localStorage.getItem('floatBtnSettings');
      if (ls) try { saved = JSON.parse(ls); } catch(e) {}
    }
    if (saved) {
      settings = Object.assign({}, DEFAULT_SETTINGS, saved);
      if (!settings.items || !settings.items.length) settings.items = DEFAULT_SETTINGS.items;
      if (!settings.charItems) settings.charItems = [];
      if (!settings.roomItems) settings.roomItems = [];
    } else {
      // 没有保存过设置，默认不显示，等用户在like页面开启
      settings.enabled = false;
    }
  };

  // ===== 初始化 =====
  const init = async () => {
    await loadSettings();
    if (!settings.enabled) return;
    createFloatBtn();
  };

  // ===== 暴露 API 给 like.js 调用 =====
  window.FloatBtn = {
    init,
    reload: async () => {
      await loadSettings();
      if (btnEl) btnEl.remove();
      if (panelEl) panelEl.remove();
      btnEl = null;
      panelEl = null;
      if (settings.enabled) createFloatBtn();
    },
    getSettings: () => settings,
    saveSettings,
    updateSettings: async (newSettings) => {
      const merged = Object.assign({}, settings, newSettings);
      if (!merged.items || !merged.items.length) {
        merged.items = settings.items.length ? settings.items : DEFAULT_SETTINGS.items;
      }
      if (!merged.charItems) merged.charItems = [];
      if (!merged.roomItems) merged.roomItems = [];
      settings = merged;
      await saveSettings();
      window.FloatBtn.reload();
    },
    closePanel,
  };

  // 页面加载完执行
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
