(function () {
  async function loadChatListData() {
    const charList = (await dbGet('charList')) || [];
    const randomCharList = (await dbGet('randomCharList')) || [];
    const all = [...charList, ...randomCharList];

    return all.sort((a, b) => (b.lastTime || 0) - (a.lastTime || 0));
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatTime(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) {
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }

  async function renderChatApp(container, shellApi) {
    const list = await loadChatListData();

    container.innerHTML = `
      <div style="height:100%;display:flex;flex-direction:column;background:#f5f5f7;">
        <div style="padding:16px 16px 10px;font-size:22px;font-weight:800;color:#111;">聊天</div>
        <div style="flex:1;overflow-y:auto;padding:0 12px 18px;">
          ${
            list.length
              ? list.map(item => `
                <div class="chat-app-item" data-char-id="${item.id}" style="display:flex;align-items:center;gap:12px;padding:12px 10px;background:#fff;border-radius:16px;margin-bottom:10px;box-shadow:0 2px 10px rgba(0,0,0,0.04);cursor:pointer;">
                  <div style="width:46px;height:46px;border-radius:50%;background:#e9e9ee;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:#555;flex-shrink:0;">
                    ${escapeHtml((item.name || '?')[0] || '?')}
                  </div>
                  <div style="flex:1;min-width:0;">
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
                      <div style="font-size:15px;font-weight:700;color:#111;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                        ${escapeHtml(item.name || '未命名角色')}
                      </div>
                      <div style="font-size:11px;color:#999;flex-shrink:0;">
                        ${escapeHtml(formatTime(item.lastTime))}
                      </div>
                    </div>
                    <div style="font-size:12px;color:#777;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                      ${escapeHtml(item.lastMsg || '还没有聊天记录')}
                    </div>
                  </div>
                </div>
              `).join('')
              : `<div style="padding:24px 12px;color:#999;text-align:center;">暂无聊天角色</div>`
          }
        </div>
      </div>
    `;

    container.querySelectorAll('.chat-app-item').forEach(el => {
      el.addEventListener('click', () => {
        const charId = el.getAttribute('data-char-id');
        if (shellApi && typeof shellApi.openLegacyPage === 'function') {
          shellApi.openLegacyPage(`chatroom.html?id=${charId}`, `聊天 · ${charId}`);
        }
      });
    });
  }

  window.ChatAppView = {
    render: renderChatApp
  };
})();
