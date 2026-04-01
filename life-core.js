(function () {
  const LIFE_PROFILE_PREFIX = 'charLifeProfile_';
  const LIFE_STATE_PREFIX = 'charLifeState_';
  const LIFE_EVENTS_PREFIX = 'charLifeEvents_';
  const LIFE_DAILY_PREFIX = 'charLifeDailySeed_';

  function nowTs() {
    return Date.now();
  }

  function getPhaseByHour(hour) {
    if (hour >= 5 && hour < 8) return '清晨';
    if (hour >= 8 && hour < 11) return '上午';
    if (hour >= 11 && hour < 14) return '中午';
    if (hour >= 14 && hour < 18) return '下午';
    if (hour >= 18 && hour < 23) return '晚上';
    return '深夜';
  }

  function ymd(ts = Date.now()) {
    const d = new Date(ts);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function randInt(a, b) {
    return Math.floor(a + Math.random() * (b - a + 1));
  }

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)] || '';
  }

  function analyzePersona(persona = '', world = '') {
    const text = `${persona} ${world}`;

    let roleType = '普通人';
    if (/学生|上学|校园|高中|大学|学院|老师|考试|作业/.test(text)) roleType = '学生';
    else if (/上班|公司|职场|同事|打工|社畜|加班/.test(text)) roleType = '上班族';
    else if (/医生|医院/.test(text)) roleType = '医生';
    else if (/偶像|艺人|明星/.test(text)) roleType = '艺人';
    else if (/修仙|宗门|仙界/.test(text)) roleType = '修行者';

    let rhythm = '普通';
    if (/夜猫子|熬夜|晚睡/.test(text)) rhythm = '夜猫子';
    else if (/早睡早起|自律|晨型/.test(text)) rhythm = '晨型';

    let socialStyle = '普通';
    if (/外向|开朗|活泼|话痨/.test(text)) socialStyle = '主动';
    else if (/内向|寡言|慢热|冷淡/.test(text)) socialStyle = '被动';

    let moodBase = '平稳';
    if (/敏感|阴郁|低落|悲观/.test(text)) moodBase = '低落';
    else if (/暴躁|易怒|烦躁/.test(text)) moodBase = '烦躁';
    else if (/温柔|元气|阳光|乐观/.test(text)) moodBase = '轻快';

    let defaultPlaces = ['家里', '外面'];
    let defaultActivities = {
      清晨: ['刚醒', '洗漱', '赖床'],
      上午: ['忙自己的事', '出门', '看手机'],
      中午: ['吃饭', '休息', '发呆'],
      下午: ['忙事情', '摸鱼', '处理琐事'],
      晚上: ['回去', '闲下来', '刷手机'],
      深夜: ['发呆', '熬夜', '还没睡']
    };

    if (roleType === '学生') {
      defaultPlaces = ['宿舍', '教室', '食堂', '图书馆'];
      defaultActivities = {
        清晨: ['刚醒', '赖床', '赶着出门'],
        上午: ['上课', '补觉', '赶路'],
        中午: ['吃饭', '午休', '发呆'],
        下午: ['上课', '写作业', '摸鱼'],
        晚上: ['回宿舍', '写东西', '聊天'],
        深夜: ['熬夜', '看东西', '发呆']
      };
    } else if (roleType === '上班族') {
      defaultPlaces = ['家里', '公司', '路上', '外面'];
      defaultActivities = {
        清晨: ['刚醒', '洗漱', '出门准备'],
        上午: ['上班', '开会', '处理事情'],
        中午: ['吃饭', '短暂休息', '发呆'],
        下午: ['上班', '继续忙', '处理事情'],
        晚上: ['回家', '闲下来', '刷手机'],
        深夜: ['还没睡', '发呆', '熬夜']
      };
    }

    return {
      roleType,
      rhythm,
      socialStyle,
      moodBase,
      defaultPlaces,
      defaultActivities
    };
  }

  async function getOrCreateLifeProfile(charId, charData = {}) {
    const key = LIFE_PROFILE_PREFIX + charId;
    let profile = await dbGet(key);
    if (profile) return profile;

    const analyzed = analyzePersona(charData.persona || '', charData.world || '');
    profile = {
      charId,
      roleType: analyzed.roleType,
      rhythm: analyzed.rhythm,
      socialStyle: analyzed.socialStyle,
      moodBase: analyzed.moodBase,
      defaultPlaces: analyzed.defaultPlaces,
      defaultActivities: analyzed.defaultActivities,
      createdAt: nowTs(),
      updatedAt: nowTs()
    };

    await dbSet(key, profile);
    return profile;
  }

  async function getOrCreateDailySeed(charId, profile, ts = Date.now()) {
    const key = LIFE_DAILY_PREFIX + charId + '_' + ymd(ts);
    let seed = await dbGet(key);
    if (seed) return seed;

    const styles = ['平稳', '忙碌', '摸鱼', '低气压', '社交欲高'];
    const focusMap = {
      学生: ['考试', '作业', '老师', '课程', '舍友'],
      上班族: ['工作', '开会', '同事', '任务', '下班'],
      普通人: ['日常', '吃饭', '睡觉', '发呆', '聊天'],
      医生: ['病人', '值班', '休息', '工作'],
      艺人: ['行程', '工作', '练习', '休息'],
      修行者: ['修炼', '宗门', '事务', '清修']
    };

    seed = {
      date: ymd(ts),
      dayStyle: pick(styles),
      focusTarget: pick(focusMap[profile.roleType] || focusMap['普通人']),
      moodBase: profile.moodBase,
      createdAt: nowTs()
    };

    await dbSet(key, seed);
    return seed;
  }

  async function getOrCreateLifeState(charId, charData = {}, ts = Date.now()) {
    const key = LIFE_STATE_PREFIX + charId;
    let state = await dbGet(key);
    if (state) return state;

    const profile = await getOrCreateLifeProfile(charId, charData);
    const daily = await getOrCreateDailySeed(charId, profile, ts);
    const hour = new Date(ts).getHours();
    const phase = getPhaseByHour(hour);

    state = {
      currentPhase: phase,
      place: pick(profile.defaultPlaces),
      activity: pick(profile.defaultActivities[phase] || ['发呆']),
      mood: daily.moodBase === '平稳' ? '平静' : daily.moodBase,
      energy: randInt(45, 75),
      socialNeed: randInt(25, 70),
      hunger: randInt(20, 60),
      sleepiness: hour >= 23 || hour < 5 ? randInt(60, 90) : randInt(20, 60),
      focusTarget: daily.focusTarget,
      currentTopicBias: [daily.focusTarget],
      dayStyle: daily.dayStyle,
      lifeRhythm: profile.rhythm,
      socialStyle: profile.socialStyle,
      lastUpdate: ts
    };

    await dbSet(key, state);
    return state;
  }

  function makeEventFromState(phase, profile, state) {
    const eventPools = {
      清晨: ['刚醒了一阵', '洗漱完了', '还在赖床', '差点又起晚了'],
      上午: ['开始忙了', '刚到这边', '处理事情中', '被事情绊住了'],
      中午: ['随便吃了点', '刚吃完', '有点犯困', '想休息一下'],
      下午: ['事情有点多', '刚刚又被叫走', '脑子有点木', '状态一般'],
      晚上: ['终于闲下来一点', '刚回到这边', '现在才有空', '折腾了一阵'],
      深夜: ['还没睡', '发呆中', '又拖到现在', '反而清醒了']
    };

    let type = 'daily';
    if (Math.random() < 0.2) type = 'emotion';
    if (Math.random() < 0.12) type = 'social';

    const title = pick(eventPools[phase] || eventPools['下午']);
    return {
      id: 'evt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      time: Date.now(),
      phase,
      type,
      title,
      place: state.place,
      activity: state.activity
    };
  }

  async function appendLifeEvent(charId, event) {
    const key = LIFE_EVENTS_PREFIX + charId;
    const list = (await dbGet(key)) || [];
    list.unshift(event);
    if (list.length > 50) list.splice(50);
    await dbSet(key, list);
    return list;
  }

  async function getLifeEvents(charId) {
    return (await dbGet(LIFE_EVENTS_PREFIX + charId)) || [];
  }

  async function advanceLifeState(charId, charData = {}, now = Date.now()) {
    const profile = await getOrCreateLifeProfile(charId, charData);
    const state = await getOrCreateLifeState(charId, charData, now);
    const daily = await getOrCreateDailySeed(charId, profile, now);

    const elapsed = now - (state.lastUpdate || now);
    const tickCount = Math.max(1, Math.floor(elapsed / (30 * 60 * 1000)));

    let next = { ...state };
    let generatedEvents = [];

    for (let i = 0; i < tickCount; i++) {
      const t = (state.lastUpdate || now) + (i + 1) * 30 * 60 * 1000;
      const hour = new Date(t).getHours();
      const phase = getPhaseByHour(hour);

      next.currentPhase = phase;
      next.dayStyle = daily.dayStyle;
      next.focusTarget = daily.focusTarget;

      const activities = profile.defaultActivities[phase] || ['发呆'];
      next.activity = pick(activities);

      if (phase === '清晨' || phase === '上午') next.place = pick(profile.defaultPlaces.slice(0, 3));
      else if (phase === '中午') next.place = pick(profile.defaultPlaces);
      else if (phase === '下午') next.place = pick(profile.defaultPlaces);
      else if (phase === '晚上') next.place = pick(profile.defaultPlaces);
      else next.place = pick(profile.defaultPlaces.filter(p => p !== '公司' && p !== '教室')) || pick(profile.defaultPlaces);

      next.energy = clamp(next.energy - randInt(2, 6), 0, 100);
      next.hunger = clamp(next.hunger + randInt(4, 10), 0, 100);
      next.sleepiness = clamp(next.sleepiness + randInt(3, 8), 0, 100);

      if (phase === '中午' && Math.random() < 0.6) next.hunger = clamp(next.hunger - randInt(15, 35), 0, 100);
      if (phase === '晚上' && Math.random() < 0.4) next.energy = clamp(next.energy + randInt(5, 12), 0, 100);
      if (profile.rhythm === '夜猫子' && phase === '深夜') next.sleepiness = clamp(next.sleepiness - randInt(3, 10), 0, 100);

      if (daily.dayStyle === '忙碌') {
        next.energy = clamp(next.energy - 2, 0, 100);
        next.socialNeed = clamp(next.socialNeed - 1, 0, 100);
      } else if (daily.dayStyle === '社交欲高') {
        next.socialNeed = clamp(next.socialNeed + 3, 0, 100);
      } else if (daily.dayStyle === '低气压') {
        next.mood = '低落';
      }

      if (next.energy < 25) next.mood = '累';
      else if (next.hunger > 75) next.mood = '烦';
      else if (next.sleepiness > 80) next.mood = '困';
      else if (daily.moodBase === '轻快' && Math.random() < 0.3) next.mood = '还不错';
      else if (daily.moodBase === '烦躁' && Math.random() < 0.3) next.mood = '烦';
      else if (daily.moodBase === '低落' && Math.random() < 0.3) next.mood = '闷';
      else if (!['累', '烦', '困', '闷', '还不错'].includes(next.mood)) next.mood = '平静';

      next.currentTopicBias = Array.from(new Set([
        daily.focusTarget,
        next.activity,
        next.place
      ])).filter(Boolean).slice(0, 4);

      if (Math.random() < 0.45) {
        const evt = makeEventFromState(phase, profile, next);
        evt.time = t;
        generatedEvents.push(evt);
      }

      next.lastUpdate = t;
    }

    await dbSet(LIFE_STATE_PREFIX + charId, next);

    for (const evt of generatedEvents) {
      await appendLifeEvent(charId, evt);
    }

    return {
      state: next,
      newEvents: generatedEvents
    };
  }

  async function getLifeSnapshot(charId, charData = {}, now = Date.now()) {
    const profile = await getOrCreateLifeProfile(charId, charData);
    const state = await getOrCreateLifeState(charId, charData, now);
    const events = await getLifeEvents(charId);
    return { profile, state, events };
  }

  window.CharLife = {
    getOrCreateLifeProfile,
    getOrCreateLifeState,
    getOrCreateDailySeed,
    getLifeEvents,
    appendLifeEvent,
    advanceLifeState,
    getLifeSnapshot
  };
})();
