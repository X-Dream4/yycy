const { ref, computed, onMounted, watch } = Vue;

const app = Vue.createApp({
  setup() {
    const charName = ref('');
    const charBio = ref('');
    const images = ref({ bg: '', avatar: '', polaroid: '' });
    const filmImages = ref(['', '', '']);

    const appsRow1 = ref([{ key: 'chat', label: '聊天', icon: 'chat.jpg' }]);
    const appsRow2 = ref([{ key: 'like', label: '喜欢', icon: 'like.jpg' }, { key: 'world', label: '世界', icon: 'music.jpg' }]);
    const appsRow3 = ref([{ key: 'collect', label: '收藏', icon: 'shouchang.jpg' }, { key: 'share', label: '记忆', icon: 'fenxiang.jpg' }]);

    const filmFrames = computed(() =>
      filmImages.value.map((img) => ({
        imgStyle: { backgroundImage: img ? `url(${img})` : 'none', backgroundColor: img ? 'transparent' : '#555' }
      }))
    );

    const bgStyle = computed(() => ({ backgroundImage: images.value.bg ? `url(${images.value.bg})` : 'none', backgroundColor: images.value.bg ? 'transparent' : '#c8c8d0' }));
    const avatarStyle = computed(() => ({ backgroundImage: images.value.avatar ? `url(${images.value.avatar})` : 'none' }));
    const polaroidStyle = computed(() => ({ backgroundImage: images.value.polaroid ? `url(${images.value.polaroid})` : 'none', backgroundColor: images.value.polaroid ? 'transparent' : '#ddd' }));

    const picker = ref({ show: false, target: '', filmIndex: null, urlInput: '' });
    const fileInput = ref(null);

    const openPicker = (target, filmIndex) => { picker.value = { show: true, target, filmIndex, urlInput: '' }; };
    const closePicker = () => { picker.value.show = false; };

    const applyImage = async (url) => {
      if (!url) return;
      if (picker.value.target === 'film') {
        filmImages.value[picker.value.filmIndex] = url;
        await dbSet('filmImages', JSON.parse(JSON.stringify(filmImages.value)));
      } else {
        images.value[picker.value.target] = url;
        await dbSet('images', JSON.parse(JSON.stringify(images.value)));
      }
      closePicker();
    };

    const confirmUrl = () => { const url = picker.value.urlInput.trim(); if (url) applyImage(url); };
    const triggerUpload = () => { fileInput.value.click(); };
    const onFileChange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => { applyImage(evt.target.result); e.target.value = ''; };
      reader.readAsDataURL(file);
    };

    const saveText = async () => {
      await dbSet('charName', charName.value);
      await dbSet('charBio', charBio.value);
    };

    watch(() => charName.value, async (val) => { await dbSet('charName', val); });
    watch(() => charBio.value, async (val) => { await dbSet('charBio', val); });

    const onApp = (key) => {
      const routes = {
        like: 'like.html',
        chat: 'chat.html',
        world: 'world.html',
        collect: 'collect.html',
        share: 'memory.html'
      };
      if (routes[key]) window.location.href = routes[key];
    };

    onMounted(async () => {
      const savedGlobalCss = await dbGet('globalCss');
      if (savedGlobalCss) {
        let el = document.getElementById('global-custom-css');
        if (!el) { el = document.createElement('style'); el.id = 'global-custom-css'; document.head.appendChild(el); }
        el.textContent = savedGlobalCss;
      }

      // 加载自定义字体
      const savedFont = await dbGet('customFont');
      if (savedFont && savedFont.src) {
        let style = document.getElementById('custom-font-style');
        if (!style) { style = document.createElement('style'); style.id = 'custom-font-style'; document.head.appendChild(style); }
        style.textContent = `@font-face { font-family: 'CustomGlobalFont'; src: url('${savedFont.src}'); } * { font-family: 'CustomGlobalFont', -apple-system, 'PingFang SC', 'Helvetica Neue', sans-serif !important; }`;
      }
      const [name, bio, imgs, films, dark, wp] = await Promise.all([
        dbGet('charName'), dbGet('charBio'), dbGet('images'), dbGet('filmImages'), dbGet('darkMode'), dbGet('wallpaper')
      ]);
      charName.value   = name  || '';
      charBio.value    = bio   || '';
      images.value     = imgs  || { bg: '', avatar: '', polaroid: '' };
      filmImages.value = films || ['', '', ''];
      if (dark) document.body.classList.add('dark');
      if (wp) { document.body.style.backgroundImage = `url(${wp})`; document.body.style.backgroundSize = 'cover'; document.body.style.backgroundPosition = 'center'; }
    });

    return {
      charName, charBio, images, filmImages,
      appsRow1, appsRow2, appsRow3,
      filmFrames, bgStyle, avatarStyle, polaroidStyle,
      picker, fileInput,
      openPicker, closePicker, confirmUrl, triggerUpload, onFileChange,
      saveText, onApp, 
    };
  }
});
