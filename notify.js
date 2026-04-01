// 全局通知系统
const NOTIFY_KEY = 'pendingNotifications';

// 用 IndexedDB 替代 localStorage
async function notifyDbSet(val) {
  try { await dbSet(NOTIFY_KEY, val); } catch(e) {}
}
async function notifyDbGet() {
  try { return (await dbGet(NOTIFY_KEY)) || []; } catch(e) { return []; }
}
async function notifyDbClear() {
  try { await dbSet(NOTIFY_KEY, []); } catch(e) {}
}

// 发送通知（在 chatroom.js 里调用）
async function sendCharNotification(charName, content, charAvatar) {
  // 1. 写入 IndexedDB 供其他页面读取
  const pending = await notifyDbGet();
  pending.push({
    id: Date.now(),
    charName,
    content: content.slice(0, 50),
    avatar: charAvatar || '',
    time: Date.now()
  });
  // 只保留最近10条
  if (pending.length > 10) pending.splice(0, pending.length - 10);
  await notifyDbSet(pending);

  // 2. 浏览器系统通知
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(charName, {
      body: content.slice(0, 80),
      tag: `char_${charName}`,
      renotify: true
    });
  }
}

// 请求通知权限
async function requestNotifyPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

// 在各个页面的 onMounted 里调用此函数，轮询检测新通知
function listenForNotifications() {
  let lastId = 0;
  setInterval(async () => {
    try {
      const pending = await notifyDbGet();
      if (!pending.length) return;
      const latest = pending[pending.length - 1];
      if (latest.id === lastId) return;
      lastId = latest.id;
      // 只显示非当前页面发出的通知（当前页面自己发的不弹）
      const isCurrentPage = typeof charName !== 'undefined'
        && typeof charName.value !== 'undefined'
        && latest.charName === charName.value;
      if (!isCurrentPage) {
        showInAppToast(latest.charName, latest.content, latest.avatar);
      }
      await notifyDbClear();
    } catch(e) {}
  }, 1500);
}

// 应用内浮窗提示
function showInAppToast(charName, content, avatar) {
  const existing = document.getElementById('char-notify-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'char-notify-toast';
  toast.style.cssText = `
    position:fixed;top:16px;left:50%;transform:translateX(-50%);
    background:rgba(20,20,20,0.92);color:#fff;
    border-radius:16px;padding:10px 16px;
    display:flex;align-items:center;gap:10px;
    z-index:99999;max-width:320px;width:calc(100% - 32px);
    box-shadow:0 4px 20px rgba(0,0,0,0.25);
    animation:toastIn 0.3s ease;
    backdrop-filter:blur(12px);
    cursor:pointer;
  `;

  const avatarEl = document.createElement('div');
  avatarEl.style.cssText = `
    width:36px;height:36px;border-radius:50%;
    background:#444;flex-shrink:0;
    background-size:cover;background-position:center;
    ${avatar ? `background-image:url(${avatar});` : ''}
    display:flex;align-items:center;justify-content:center;
    font-size:14px;font-weight:700;color:#fff;
  `;
  if (!avatar) avatarEl.textContent = charName[0] || '?';

  const textEl = document.createElement('div');
  textEl.style.cssText = 'flex:1;min-width:0;';
  textEl.innerHTML = `
    <div style="font-size:13px;font-weight:700;margin-bottom:2px;">${charName}</div>
    <div style="font-size:12px;opacity:0.8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${content}</div>
  `;

  toast.appendChild(avatarEl);
  toast.appendChild(textEl);

  if (!document.getElementById('toast-style')) {
    const s = document.createElement('style');
    s.id = 'toast-style';
    s.textContent = `
      @keyframes toastIn { from { opacity:0; transform:translateX(-50%) translateY(-12px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
      @keyframes toastOut { from { opacity:1; } to { opacity:0; transform:translateX(-50%) translateY(-12px); } }
    `;
    document.head.appendChild(s);
  }

  document.body.appendChild(toast);

  const dismiss = () => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  };
  toast.addEventListener('click', dismiss);
  setTimeout(dismiss, 4000);
}
