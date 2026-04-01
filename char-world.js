const { createApp, ref, computed, onMounted, nextTick } = Vue;
createApp({
  setup() {
    const allChars = ref([]);
    const charLocks = ref({});
    const unlockingChar = ref(null);
    const currentLock = ref({});
    const unlockInput = ref('');
    const unlockError = ref('');
    const unlockPattern = ref([]);
    const unlockPatternLines = ref('');
    const unlockPatternDrawing = ref(false);
    const unlockCurrentPos = ref(null);
    let goldenTimer = null;

    const patternDotPos = [
      {x:40,y:40},{x:120,y:40},{x:200,y:40},
      {x:40,y:120},{x:120,y:120},{x:200,y:120},
      {x:40,y:200},{x:120,y:200},{x:200,y:200}
    ];

    const goBack = () => { window.location.href = 'chat.html'; };

    const hackingShow = ref(false);
    const hackLines = ref([]);
    const hackProgress = ref(0);

    const hackTexts = [
      '> Initializing bypass protocol...',
      '> Scanning encryption layer...',
      '> Found vulnerability: CVE-2077-∞',
      '> Injecting payload...',
      '> Bypassing authentication...',
      '> Decrypting password hash...',
      '> Override successful.',
      '> Welcome, intruder.',
    ];

    const triggerGoldenFinger = async () => {
      hackingShow.value = true;
      hackLines.value = [];
      hackProgress.value = 0;

      for (let i = 0; i < hackTexts.length; i++) {
        await new Promise(r => setTimeout(r, 120));
        hackLines.value.push(hackTexts[i]);
        hackProgress.value = Math.round((i + 1) / hackTexts.length * 100);
      }

      await new Promise(r => setTimeout(r, 500));
      hackingShow.value = false;
      enterCharWorld();
    };

    const getLockTypeLabel = (charId) => {
      const lock = charLocks.value[charId];
      if (!lock || lock.lockType === 'none') return '无密码';
      if (lock.lockType === 'pin') return '数字密码';
      if (lock.lockType === 'pattern') return '图案密码';
      if (lock.lockType === 'question') return '问题解锁';
      return '无密码';
    };

    const selectChar = (char) => {
      unlockingChar.value = char;
      currentLock.value = charLocks.value[char.id] || { lockType: 'none', goldenFinger: true };
      unlockInput.value = '';
      unlockError.value = '';
      unlockPattern.value = [];
      unlockPatternLines.value = '';
      if (currentLock.value.lockType === 'none') { enterCharWorld(); }
      nextTick(() => lucide.createIcons());
    };

    const enterCharWorld = () => {
      if (!unlockingChar.value) return;
      window.location.href = `char-world-list.html?charId=${unlockingChar.value.id}`;
    };

    const pinPress = (n) => {
      if (unlockInput.value.length >= currentLock.value.pin.length) return;
      unlockInput.value += n;
      unlockError.value = '';
      if (unlockInput.value.length === currentLock.value.pin.length) {
        setTimeout(() => {
          if (unlockInput.value === currentLock.value.pin) {
            enterCharWorld();
          } else {
            unlockError.value = currentLock.value.hint ? `密码错误，提示：${currentLock.value.hint}` : '密码错误，请重试';
            unlockInput.value = '';
          }
        }, 200);
      }
    };

    const pinDel = () => {
      if (unlockInput.value.length > 0) unlockInput.value = unlockInput.value.slice(0, -1);
    };

    const getUnlockPos = (e, el) => {
      const rect = el.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const getNearUnlockDot = (pos) => {
      for (let i = 0; i < patternDotPos.length; i++) {
        const d = patternDotPos[i];
        const dist = Math.sqrt((pos.x-d.x)**2 + (pos.y-d.y)**2);
        if (dist < 30) return i+1;
      }
      return null;
    };

    const unlockPatternStart = (e) => {
      unlockPattern.value = [];
      unlockPatternLines.value = '';
      unlockPatternDrawing.value = true;
      unlockCurrentPos.value = null;
      unlockError.value = '';
      const el = e.currentTarget;
      const pos = getUnlockPos(e, el);
      const dot = getNearUnlockDot(pos);
      if (dot) {
        unlockPattern.value.push(dot);
        const dp = patternDotPos[dot-1];
        unlockPatternLines.value = `${dp.x},${dp.y}`;
      }
    };

    const unlockPatternMove = (e) => {
      if (!unlockPatternDrawing.value) return;
      const el = e.currentTarget;
      const pos = getUnlockPos(e, el);
      unlockCurrentPos.value = pos;
      const dot = getNearUnlockDot(pos);
      if (dot && !unlockPattern.value.includes(dot)) {
        unlockPattern.value.push(dot);
        const dp = patternDotPos[dot-1];
        unlockPatternLines.value += ` ${dp.x},${dp.y}`;
      }
    };

    const unlockPatternEnd = () => {
      if (!unlockPatternDrawing.value) return;
      unlockPatternDrawing.value = false;
      unlockCurrentPos.value = null;
      if (unlockPattern.value.length < 4) { unlockError.value = '图案至少需要4个点'; unlockPattern.value = []; unlockPatternLines.value = ''; return; }
      const input = unlockPattern.value.join('-');
      const correct = (currentLock.value.pattern || []).join('-');
      if (input === correct) {
        enterCharWorld();
      } else {
        unlockError.value = currentLock.value.hint ? `图案错误，提示：${currentLock.value.hint}` : '图案错误，请重试';
        setTimeout(() => { unlockPattern.value = []; unlockPatternLines.value = ''; }, 600);
      }
    };

    const checkAnswer = () => {
      if (!unlockInput.value.trim()) return;
      if (unlockInput.value.trim() === currentLock.value.answer) {
        enterCharWorld();
      } else {
        unlockError.value = currentLock.value.hint ? `答案错误，提示：${currentLock.value.hint}` : '答案错误，请重试';
        unlockInput.value = '';
      }
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
      const [charList, randomCharList] = await Promise.all([dbGet('charList'), dbGet('randomCharList')]);
      const chars = [...(charList || []), ...(randomCharList || [])];
      for (const char of chars) {
        const beauty = await dbGet(`chatBeauty_${char.id}`);
        if (beauty && beauty.charAvatar) char.avatar = beauty.charAvatar;
        const lock = await dbGet(`charWorldLock_${char.id}`);
        if (lock) charLocks.value[char.id] = lock;
      }
      allChars.value = chars;
      setTimeout(() => lucide.createIcons(), 50);
      setTimeout(() => lucide.createIcons(), 300);
      setTimeout(() => lucide.createIcons(), 800);
    });

    return { allChars, charLocks, unlockingChar, currentLock, unlockInput, unlockError, unlockPattern, unlockPatternLines, unlockPatternDrawing, unlockCurrentPos, patternDotPos, goBack, getLockTypeLabel, selectChar, enterCharWorld, pinPress, pinDel, unlockPatternStart, unlockPatternMove, unlockPatternEnd, checkAnswer, hackingShow, hackLines, hackProgress, triggerGoldenFinger, };
  }
}).mount('#cw-app');
