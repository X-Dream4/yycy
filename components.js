app.component('character-card', {
  props: ['bgStyle', 'avatarStyle', 'charName', 'charBio', 'images'],
  emits: ['open-picker', 'update:charName', 'update:charBio'],
  template: `
    <div class="character-card">
      <div class="card-bg" :style="bgStyle" @click="$emit('open-picker', 'bg', null)">
        <div class="card-bg-hint">点击更换背景</div>
      </div>
      <div class="card-info-bar">
        <div class="card-avatar" :style="avatarStyle" @click.stop="$emit('open-picker', 'avatar', null)">
          <span v-if="!images.avatar">点击上传</span>
        </div>
        <div class="card-info-inputs">
          <input class="info-input info-input-name" :value="charName" @input="$emit('update:charName', $event.target.value)" placeholder="角色名字" maxlength="20" />
          <input class="info-input info-input-bio" :value="charBio" @input="$emit('update:charBio', $event.target.value)" placeholder="个性签名" maxlength="40" />
        </div>
      </div>
    </div>
  `
});

app.component('film-strip', {
  props: ['filmFrames', 'filmImages'],
  emits: ['open-picker'],
  template: `
    <div class="film-strip-outer">
      <div class="film-strip">
        <div class="film-frame" v-for="(frame, i) in filmFrames" :key="i">
          <div class="film-holes top"><div class="film-hole" v-for="h in 4" :key="h"></div></div>
          <div class="film-img" :style="frame.imgStyle" @click="$emit('open-picker', 'film', i)">
            <span v-if="!filmImages[i]">换图</span>
          </div>
          <div class="film-holes bottom"><div class="film-hole" v-for="h in 4" :key="h"></div></div>
        </div>
      </div>
    </div>
  `
});

app.component('polaroid-card', {
  props: ['polaroidStyle', 'images'],
  emits: ['open-picker'],
  template: `
    <div class="polaroid-wrap">
      <div class="polaroid" @click="$emit('open-picker', 'polaroid', null)">
        <div class="polaroid-img" :style="polaroidStyle">
          <span v-if="!images.polaroid">点击换图</span>
        </div>
        <span class="polaroid-label">Memory</span>
      </div>
    </div>
  `
});

app.component('image-picker', {
  props: ['picker'],
  emits: ['close', 'confirm-url', 'trigger-upload'],
  template: `
    <transition name="sheet">
      <div class="modal-mask" v-if="picker.show" @click.self="$emit('close')">
        <div class="modal-sheet">
          <div class="modal-handle"></div>
          <div class="modal-sheet-title">更换图片</div>
          <div class="modal-url-row">
            <input class="modal-url-input" :value="picker.urlInput" @input="picker.urlInput = $event.target.value" placeholder="粘贴图片 URL..." @keyup.enter="$emit('confirm-url')" />
            <button class="modal-url-confirm" @click="$emit('confirm-url')">确认</button>
          </div>
          <div class="modal-divider">或</div>
          <button class="modal-upload-btn" @click="$emit('trigger-upload')">从本地相册上传</button>
          <button class="modal-cancel-btn" @click="$emit('close')">取消</button>
        </div>
      </div>
    </transition>
  `
});

app.mount('#app');
