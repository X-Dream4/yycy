const { createApp, ref, computed, onMounted, nextTick } = Vue;
createApp({
  setup() {
    const params = new URLSearchParams(window.location.search);
    const charId = parseInt(params.get('charId'));
    const charName = ref('');
    const charAvatar = ref('');
    const myName = ref('我');
    const myAvatar = ref('');
    const myLastMsg = ref('');
    const charRooms = ref([]);
    const privateChats = ref([]);
    const charContacts = ref([]);
    const allChars = ref([]);
    const plusMenuOpen = ref(false);
    const addContactShow = ref(false);
    const newGroupShow = ref(false);
    const addContactMode = ref('existing');
    const selectedOther = ref(null);
    const newContactName = ref('');
    const newContactPersona = ref('');
    const newGroupName = ref('');
    const newGroupMembers = ref([]);

    const refreshIcons = () => setTimeout(() => lucide.createIcons(), 50);
    const allCharsNotContact = computed(() => allChars.value.filter(c => c.id !== charId && !charContacts.value.find(cc => cc.id === c.id)));

    const goBack = () => { window.location.href = `char-world.html`; };
    const goMoments = () => { window.location.href = `char-world-moments.html?charId=${charId}`; };
    const openMyChat = () => { window.location.href = `char-world-chat.html?charId=${charId}&mode=my`; };
    const openRoomChat = (room) => { window.location.href = `char-world-chat.html?charId=${charId}&mode=room&roomId=${room.id}`; };
    const openPrivateChat = (pc) => { window.location.href = `char-world-chat.html?charId=${charId}&mode=private&pcId=${pc.id}`; };

    const createPrivateChat = async (other) => {
      const existing = privateChats.value.find(p => p.otherId === other.id);
      if (existing) { openPrivateChat(existing); return; }
      const pc = { id: Date.now(), charId, charName: charName.value, otherId: other.id, otherName: other.name, otherAvatar: other.avatar || '', messages: [], lastMsg: '', lastTime: Date.now() };
      privateChats.value.push(pc);
      await dbSet(`cwPrivateChats_${charId}`, JSON.parse(JSON.stringify(privateChats.value)));
      openPrivateChat(pc);
    };

    const confirmAddContact = async () => {
      if (addContactMode.value === 'existing') {
        if (!selectedOther.value) return;
        const other = allChars.value.find(c => c.id === selectedOther.value);
        if (!other) return;
        if (!charContacts.value.find(c => c.id === other.id)) {
          charContacts.value.push({ id: other.id, name: other.name, avatar: other.avatar || '', persona: other.persona || '' });
          await dbSet(`cwContacts_${charId}`, JSON.parse(JSON.stringify(charContacts.value)));
        }
        // 无论联系人是否已存在，都确保私聊记录存在
        const existingPcs = JSON.parse(JSON.stringify((await dbGet(`cwPrivateChats_${charId}`)) || []));
        if (!existingPcs.find(p => p.otherId === other.id)) {
          // 私聊记录不存在则重新创建
          const newPc = {
            id: Date.now(),
            charId,
            charName: allChars.value.find(c => c.id === charId)?.name || '',
            otherId: other.id,
            otherName: other.name,
            otherAvatar: other.avatar || '',
            messages: [],
            lastMsg: '',
            lastTime: Date.now()
          };
          existingPcs.push(newPc);
          await dbSet(`cwPrivateChats_${charId}`, existingPcs);
        }
        // 同时给对方也添加联系人和私聊记录
        const otherContacts = JSON.parse(JSON.stringify((await dbGet(`cwContacts_${other.id}`)) || []));
        if (!otherContacts.find(c => c.id === charId)) {
          const charInfo = allChars.value.find(c => c.id === charId);
          if (charInfo) {
            otherContacts.push({ id: charId, name: charInfo.name, avatar: charInfo.avatar || '', persona: charInfo.persona || '' });
            await dbSet(`cwContacts_${other.id}`, otherContacts);
          }
        }
        const otherPcs = JSON.parse(JSON.stringify((await dbGet(`cwPrivateChats_${other.id}`)) || []));
        if (!otherPcs.find(p => p.otherId === charId)) {
          const charInfo = allChars.value.find(c => c.id === charId);
          if (charInfo) {
            otherPcs.push({
              id: Date.now() + 1,
              charId: other.id,
              charName: other.name,
              otherId: charId,
              otherName: charInfo.name,
              otherAvatar: charInfo.avatar || '',
              messages: [],
              lastMsg: '',
              lastTime: Date.now()
            });
            await dbSet(`cwPrivateChats_${other.id}`, otherPcs);
          }
        }
        addContactShow.value = false;
        selectedOther.value = null;
        await createPrivateChat(other);
      } else {
        if (!newContactName.value.trim()) return;
        const ts = Date.now();
        const newC = { id: ts, name: newContactName.value.trim(), avatar: '', persona: newContactPersona.value.trim(), isLocal: true };
        charContacts.value.push(newC);
        await dbSet(`cwContacts_${charId}`, JSON.parse(JSON.stringify(charContacts.value)));
        const pc = { id: ts + 1, charId, charName: charName.value, otherId: newC.id, otherName: newC.name, otherAvatar: '', messages: [], lastMsg: '', lastTime: ts };
        privateChats.value.push(pc);
        await dbSet(`cwPrivateChats_${charId}`, JSON.parse(JSON.stringify(privateChats.value)));
        newContactName.value = '';
        newContactPersona.value = '';
        addContactShow.value = false;
        openPrivateChat(pc);
      }
    };

    const toggleGroupMember = (id) => {
      const idx = newGroupMembers.value.indexOf(id);
      if (idx === -1) newGroupMembers.value.push(id);
      else newGroupMembers.value.splice(idx, 1);
    };

    const createGroup = async () => {
      if (!newGroupName.value.trim() || newGroupMembers.value.length < 1) return;
      const memberObjs = newGroupMembers.value.map(id => {
        if (id === '__me__') return { id: '__me__', name: myName.value, avatar: myAvatar.value, persona: '' };
        return charContacts.value.find(c => c.id === id);
      }).filter(Boolean);
      const group = { id: Date.now(), name: newGroupName.value.trim(), charId, members: memberObjs, messages: [], lastMsg: '', lastTime: Date.now(), isLocal: true };
      charRooms.value.push(group);
      const localGroups = charRooms.value.filter(r => r.isLocal);
      await dbSet(`cwLocalGroups_${charId}`, JSON.parse(JSON.stringify(localGroups)));
      newGroupShow.value = false;
      newGroupName.value = '';
      newGroupMembers.value = [];
      openRoomChat(group);
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
      if (savedFont && savedFont.src) { let s = document.getElementById('custom-font-style'); if (!s) { s = document.createElement('style'); s.id = 'custom-font-style'; document.head.appendChild(s); } s.textContent = `@font-face { font-family: 'CustomGlobalFont'; src: url('${savedFont.src}'); } * { font-family: 'CustomGlobalFont', -apple-system, 'PingFang SC', 'Helvetica Neue', sans-serif !important; }`; }
      const [charList, randomCharList, roomList, mySettings] = await Promise.all([dbGet('charList'), dbGet('randomCharList'), dbGet('roomList'), dbGet('mySettings_global')]);
      const chars = [...(charList || []), ...(randomCharList || [])];
      const char = chars.find(c => c.id === charId);
      if (!char) { goBack(); return; }
      charName.value = char.name;
      allChars.value = chars;
      for (const c of allChars.value) { const b = await dbGet(`chatBeauty_${c.id}`); if (b && b.charAvatar) c.avatar = b.charAvatar; }
      const beauty = await dbGet(`chatBeauty_${charId}`);
      if (beauty && beauty.charAvatar) charAvatar.value = beauty.charAvatar;
      if (mySettings) { myName.value = mySettings.name || '我'; myAvatar.value = mySettings.avatar || ''; }
      const lastMsg = (char.messages || []).filter(m => !m.recalled && !m.loading).slice(-1)[0];
      myLastMsg.value = lastMsg ? lastMsg.content.slice(0, 30) : '';
      const rooms = (roomList || []).filter(r => r.members && r.members.some(m => m.name === char.name));
      charRooms.value = [...rooms];
      const localGroups = await dbGet(`cwLocalGroups_${charId}`);
      if (localGroups) charRooms.value.push(...localGroups);
      const savedContacts = await dbGet(`cwContacts_${charId}`);
      if (savedContacts) charContacts.value = savedContacts;
      const savedPc = await dbGet(`cwPrivateChats_${charId}`);
      if (savedPc) privateChats.value = savedPc;
      document.addEventListener('click', (e) => { if (plusMenuOpen.value && !e.target.closest('.topbar-left')) plusMenuOpen.value = false; });
      refreshIcons();
    });

    return { charName, charAvatar, myName, myAvatar, myLastMsg, charRooms, privateChats, charContacts, allChars, allCharsNotContact, plusMenuOpen, addContactShow, newGroupShow, addContactMode, selectedOther, newContactName, newContactPersona, newGroupName, newGroupMembers, goBack, goMoments, openMyChat, openRoomChat, openPrivateChat, confirmAddContact, toggleGroupMember, createGroup, nextTick, refreshIcons };
  }
}).mount('#cwl-app');
