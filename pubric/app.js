/* =============================================
   仲良しTube - Main Application Script
   ============================================= */

// =================== ベース設定 ===================
let currentView = 'welcome';
let currentVideoId = null, currentVideoTitle = '';
let currentChannelName = '', currentChannelThumb = '';
let currentChannelId = null;
let searchContext = 'trend', isFetching = false;
let lastQuery = '', currentPage = 1, captchaTimer = null;
const seenVideoIds = new Set();
const KAHOOT_KEY_URL = 'https://apis.kahoot.it/media-api/youtube/key';
const CORS_PROXIES = ['https://api.codetabs.com/v1/proxy?quest='];
let currentChannelTab = 'home';
let shortStreamType = 1;
let currentShortItems = [];
let currentEduKey = null;
let currentGVFormats = null;
let currentGVAllFormats = null;
let selectedQuality = null;
let currentChannelShortsPage = 1;
let currentChannelShortsName = '';

const INVIDIOUS_INSTANCES = [
  'https://invidious.f5.si','https://yt.omada.cafe','https://inv.thepixora.com',
  'https://yawtu.be','https://inv.nadeko.net','https://iv.duti.dev','https://inv.vern.cc',
  'https://invidious.privacyredirect.com','https://inv1.nadeko.net','https://inv2.nadeko.net',
  'https://inv3.nadeko.net','https://inv4.nadeko.net','https://inv5.nadeko.net',
  'https://yewtu.be','https://invidious.garudalinux.org','https://invidious.tiekoetter.com',
  'https://yt.artemislena.eu','https://invidious.privacydev.net','https://invidious.nerdvpn.de',
  'https://invidious.lunar.icu','https://invidious.slipfox.xyz','https://iv.ggtyler.dev',
  'https://nyc1.iv.ggtyler.dev','https://cal1.iv.ggtyler.dev','https://iv.catgirl.cloud',
  'https://invidious.sethforprivacy.com','https://invidious.weblibre.org','https://invidious.pufe.org',
  'https://invidious.projectsegfau.lt','https://invidious.fdn.fr','https://invidious.epicsite.xyz',
  'https://yt.funami.tech','https://invidious.esmailelbob.xyz','https://invidious.drivet.xyz'
];

// =================== 設定管理 ===================
function getAppConfig() {
  const defaults = { proxy: true, stream: 1, shortStream: 1, trend: true, theme: 'light', isFirstVisit: true };
  try { return { ...defaults, ...JSON.parse(localStorage.getItem('study2525_config')) }; } catch(e) { return defaults; }
}

function saveSettings() {
  const config = {
    proxy: document.getElementById('setting-proxy').checked,
    stream: parseInt(document.getElementById('setting-stream').value) || 1,
    shortStream: parseInt(document.getElementById('setting-short-stream').value) || 1,
    trend: document.getElementById('setting-trend').checked,
    theme: document.body.getAttribute('data-theme') || 'light',
    isFirstVisit: false
  };
  localStorage.setItem('study2525_config', JSON.stringify(config));
  syncSettings(config);
}

function saveNavSettings() {
  const config = {
    proxy: document.getElementById('nav-setting-proxy').checked,
    stream: parseInt(document.getElementById('nav-setting-stream').value) || 1,
    shortStream: parseInt(document.getElementById('nav-setting-short-stream').value) || 1,
    trend: document.getElementById('nav-setting-trend').checked,
    theme: document.body.getAttribute('data-theme') || 'light',
    isFirstVisit: false
  };
  localStorage.setItem('study2525_config', JSON.stringify(config));
  syncSettings(config);
}

function syncSettings(config) {
  const fields = [
    ['setting-proxy','nav-setting-proxy','proxy','bool'],
    ['setting-trend','nav-setting-trend','trend','bool'],
    ['setting-theme','nav-setting-theme','theme','theme'],
    ['setting-stream','nav-setting-stream','stream','val'],
    ['setting-short-stream','nav-setting-short-stream','shortStream','val'],
  ];
  fields.forEach(([id1, id2, key, type]) => {
    const el1 = document.getElementById(id1), el2 = document.getElementById(id2);
    if (type === 'bool') { if(el1) el1.checked = config[key]; if(el2) el2.checked = config[key]; }
    else if (type === 'theme') { if(el1) el1.checked = config[key]==='dark'; if(el2) el2.checked = config[key]==='dark'; }
    else { if(el1) el1.value = config[key]; if(el2) el2.value = config[key]; }
  });
  ['welcome-stream-options','nav-stream-options'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.querySelectorAll('.stream-option-btn').forEach(b => b.classList.toggle('selected', parseInt(b.dataset.val) === config.stream));
  });
  ['welcome-short-stream-options','nav-short-stream-options'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.querySelectorAll('.stream-option-btn').forEach(b => b.classList.toggle('selected', parseInt(b.dataset.val) === config.shortStream));
  });
}

function selectWelcomeStream(val) {
  document.getElementById('setting-stream').value = val;
  document.querySelectorAll('#welcome-stream-options .stream-option-btn').forEach(b => b.classList.toggle('selected', parseInt(b.dataset.val)===val));
  saveSettings();
}
function selectWelcomeShortStream(val) {
  document.getElementById('setting-short-stream').value = val;
  document.querySelectorAll('#welcome-short-stream-options .stream-option-btn').forEach(b => b.classList.toggle('selected', parseInt(b.dataset.val)===val));
  saveSettings();
}
function selectNavStream(val) {
  document.getElementById('nav-setting-stream').value = val;
  document.querySelectorAll('#nav-stream-options .stream-option-btn').forEach(b => b.classList.toggle('selected', parseInt(b.dataset.val)===val));
  saveNavSettings();
}
function selectNavShortStream(val) {
  document.getElementById('nav-setting-short-stream').value = val;
  document.querySelectorAll('#nav-short-stream-options .stream-option-btn').forEach(b => b.classList.toggle('selected', parseInt(b.dataset.val)===val));
  saveNavSettings();
}

function buildFetchUrl(targetUrl) { return getAppConfig().proxy ? CORS_PROXIES[0] + encodeURIComponent(targetUrl) : targetUrl; }

function initApp() {
  const config = getAppConfig();
  if (config.theme === 'dark') document.body.setAttribute('data-theme', 'dark');
  shortStreamType = config.shortStream || 1;
  syncSettings(config);
  renderSidebarSubscriptions();
  const urlState = parseInitialUrl();
  if (config.isFirstVisit) {
    navigate('welcome', { noHistory: true });
  } else if (urlState && urlState.view === 'watch' && urlState.videoId) {
    navigate('home', { noHistory: true });
    fetch(`https://inv.nadeko.net/api/v1/videos/${urlState.videoId}?fields=title,author,authorThumbnails`)
      .then(r => r.json()).then(d => {
        playVideo(urlState.videoId, d.title || urlState.videoId, d.author || '', d.authorThumbnails?.[0]?.url || null, true);
      }).catch(() => playVideo(urlState.videoId, urlState.videoId, '', null, true));
  } else if (urlState && urlState.view === 'history') { navigate('history');
  } else if (urlState && urlState.view === 'settings') { navigate('settings');
  } else if (urlState && urlState.view === 'subscriptions') { navigate('subscriptions');
  } else { navigate('home'); }
}

function toggleTheme() {
  const isDark = document.body.getAttribute('data-theme') === 'dark';
  document.body.setAttribute('data-theme', isDark ? 'light' : 'dark');
  const config = getAppConfig(); config.theme = isDark ? 'light' : 'dark';
  localStorage.setItem('study2525_config', JSON.stringify(config));
  syncSettings(config);
}
function toggleThemeFromSettings() {
  const isDark = document.getElementById('setting-theme').checked;
  document.body.setAttribute('data-theme', isDark ? 'dark' : 'light'); saveSettings();
}
function toggleThemeFromNavSettings() {
  const isDark = document.getElementById('nav-setting-theme').checked;
  document.body.setAttribute('data-theme', isDark ? 'dark' : 'light'); saveNavSettings();
}
function finishSetup() { saveSettings(); navigate('home'); if(getAppConfig().trend) loadTrend(); }

// =================== 登録チャンネル ===================
function getSubscriptions() { try { return JSON.parse(localStorage.getItem('subscriptions') || '[]'); } catch(e) { return []; } }
function saveSubscriptions(subs) { localStorage.setItem('subscriptions', JSON.stringify(subs)); }
function isSubscribed(channelName) { return getSubscriptions().some(s => s.name === channelName); }

function toggleSubscribeChannel() {
  const name = document.getElementById('channel-page-name').innerText;
  const thumb = document.getElementById('channel-page-icon').src;
  let subs = getSubscriptions();
  if (isSubscribed(name)) { subs = subs.filter(s => s.name !== name); }
  else { subs.unshift({ name, thumb, channelId: currentChannelId || null, isLive: Math.random() < 0.15 }); }
  saveSubscriptions(subs); updateChannelSubscribeUI(name); renderSidebarSubscriptions();
}

function toggleSubscribeFromWatch() {
  const name = document.getElementById('watch-channel-name').innerText;
  const thumb = document.getElementById('watch-channel-icon').src;
  let subs = getSubscriptions();
  if (isSubscribed(name)) { subs = subs.filter(s => s.name !== name); }
  else { subs.unshift({ name, thumb, isLive: Math.random() < 0.15 }); }
  saveSubscriptions(subs); updateWatchSubscribeUI(name); renderSidebarSubscriptions();
}

function updateChannelSubscribeUI(name) {
  const btn = document.getElementById('channel-subscribe-btn');
  const bell = document.getElementById('channel-bell-btn');
  const join = document.getElementById('channel-join-btn');
  if (!btn) return;
  if (isSubscribed(name)) {
    btn.innerText = '登録済み'; btn.classList.add('subscribed');
    bell.style.display = 'flex'; join.style.display = 'block';
  } else {
    btn.innerText = 'チャンネル登録'; btn.classList.remove('subscribed');
    bell.style.display = 'none'; join.style.display = 'none';
  }
}

function updateWatchSubscribeUI(name) {
  const btn = document.getElementById('watch-subscribe-btn');
  if (!btn) return;
  if (isSubscribed(name)) { btn.innerText = '登録済み'; btn.classList.add('subscribed'); }
  else { btn.innerText = '登録'; btn.classList.remove('subscribed'); }
}

function renderSidebarSubscriptions() {
  const subs = getSubscriptions();
  const container = document.getElementById('sidebar-subscriptions');
  if (!container) return;
  if (subs.length === 0) { container.innerHTML = ''; return; }
  container.innerHTML = subs.slice(0, 8).map(s => `
    <div class="sidebar-channel-item" onclick="openChannel('${s.name.replace(/'/g,"\\'")}', '${s.thumb}')">
      <img src="${s.thumb}" onerror="this.src='https://i.pravatar.cc/40?u=${encodeURIComponent(s.name)}'">
      <span class="channel-name-sidebar">${s.name}</span>
      ${s.isLive ? '<span class="live-badge">LIVE</span>' : ''}
    </div>
  `).join('');
}

function renderSubscriptionsPage() {
  const subs = getSubscriptions();
  const grid = document.getElementById('subs-grid');
  if (!grid) return;
  if (subs.length === 0) {
    grid.innerHTML = '<div class="subs-empty" style="padding:60px 0;">チャンネルを登録するとここに表示されます<br><br><button onclick="navigate(\'home\')" style="padding:10px 24px;border-radius:20px;background:var(--primary-color);color:#fff;font-weight:bold;font-size:14px;margin-top:12px;">ホームへ戻る</button></div>';
    return;
  }
  grid.innerHTML = subs.map(s => `
    <div class="sub-channel-card" onclick="openChannel('${s.name.replace(/'/g,"\\'")}', '${s.thumb}')">
      <img src="${s.thumb}" onerror="this.src='https://i.pravatar.cc/56?u=${encodeURIComponent(s.name)}'">
      <div class="sub-channel-info">
        <div class="sub-channel-name">${s.name}</div>
        <div class="sub-channel-meta">${s.isLive ? '🔴 ライブ配信中' : '登録済みチャンネル'}</div>
      </div>
      <button class="unsub-btn" onclick="event.stopPropagation(); unsubscribeChannelPage('${s.name.replace(/'/g,"\\'")}', this)">登録解除</button>
    </div>
  `).join('');
}

function unsubscribeChannelPage(name) {
  saveSubscriptions(getSubscriptions().filter(s => s.name !== name));
  renderSubscriptionsPage(); renderSidebarSubscriptions(); renderSettingsSubsList();
}

function renderSettingsSubsList() {
  const subs = getSubscriptions();
  const el = document.getElementById('settings-subs-list');
  if (!el) return;
  if (subs.length === 0) { el.innerHTML = '<div style="color:var(--text-secondary);padding:8px 0;">登録チャンネルはありません</div>'; return; }
  el.innerHTML = subs.map(s => `
    <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border-color);">
      <img src="${s.thumb}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;" onerror="this.src='https://i.pravatar.cc/40?u=${encodeURIComponent(s.name)}'">
      <span style="flex:1;font-weight:500;">${s.name}</span>
      ${s.isLive ? '<span style="background:#ff0000;color:#fff;font-size:11px;font-weight:bold;padding:2px 7px;border-radius:4px;">LIVE</span>' : ''}
      <button onclick="unsubscribeChannelSettings('${s.name.replace(/'/g,"\\'")}')" style="padding:6px 14px;border-radius:16px;background:var(--hover-color);font-size:13px;">登録解除</button>
    </div>
  `).join('');
}

function unsubscribeChannelSettings(name) {
  saveSubscriptions(getSubscriptions().filter(s => s.name !== name));
  renderSettingsSubsList(); renderSidebarSubscriptions();
}

// =================== MANIFEST HUNTER ===================
function deepSearch(obj) {
  let found = [];
  if (!obj || typeof obj !== 'object') return found;
  if (obj.url && String(obj.url).includes('manifest.')) {
    const type = String(obj.type || obj.mimeType || '');
    if (!type.includes('audio') || type.includes('video')) found.push(obj);
  }
  for (let k in obj) found = found.concat(deepSearch(obj[k]));
  return found;
}

async function manifestHunt(videoId) {
  const proxies = ['', 'https://api.allorigins.win/raw?url=', 'https://corsproxy.io/?'];
  const apiBase = `https://siawaseok.f5.si/api/streams/${videoId}`;
  for (const proxy of proxies) {
    try {
      const targetUrl = proxy ? proxy + encodeURIComponent(apiBase) : apiBase;
      const res = await fetch(targetUrl, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const manifestResults = deepSearch(data);
      if (manifestResults.length > 0) {
        const unique = Array.from(new Map(manifestResults.map(s => [s.url, s])).values());
        return { type: 'manifest', streams: unique.sort((a, b) => (parseInt(b.qualityLabel) || 0) - (parseInt(a.qualityLabel) || 0)) };
      }
      if (data.formats && data.formats.length > 0) {
        const valid = data.formats.filter(f => f.url);
        if (valid.length > 0) return { type: 'formats', streams: valid };
      }
      if (data.url) return { type: 'single', streams: [{ url: data.url, ext: 'mp4', height: 360 }] };
    } catch(e) { console.warn('[ManifestHunter] failed:', proxy || 'direct', e.message); }
  }
  return null;
}

function parseSiawaseokFormats(formats) {
  if (!formats) return { mp4Pairs: [], manifestList: [] };
  const mp4Formats = formats.filter(f => (f.ext==='mp4'||f.container==='mp4') && f.url && f.vcodec && f.vcodec!=='none' && f.acodec==='none');
  const m4aFormats = formats.filter(f => (f.ext==='m4a'||f.acodec==='mp4a.40.2') && f.url && (!f.vcodec||f.vcodec==='none'));
  const combinedMp4 = formats.filter(f => f.ext==='mp4' && f.url && f.acodec && f.acodec!=='none' && f.vcodec && f.vcodec!=='none');
  const manifestList = formats.filter(f => f.url && (f.url.includes('manifest.') || f.url.includes('.m3u8')));
  const mp4Pairs = [];
  mp4Formats.forEach(vf => {
    const res = getResolutionStr(vf), af = m4aFormats[0] || null;
    mp4Pairs.push({ videoFmt: vf, audioFmt: af, resolution: res, label: getLabelFromFmt(vf) });
  });
  combinedMp4.forEach(f => {
    const lbl = getLabelFromFmt(f);
    if (!mp4Pairs.find(p => p.label === lbl)) mp4Pairs.push({ videoFmt: f, audioFmt: null, resolution: getResolutionStr(f), label: lbl, isCombined: true });
  });
  const order = ['2160p','1440p','1080p','720p','480p','360p','240p','144p'];
  mp4Pairs.sort((a, b) => { const ia=order.indexOf(a.label), ib=order.indexOf(b.label); return (ia===-1?99:ia)-(ib===-1?99:ib); });
  return { mp4Pairs, manifestList };
}

function getResolutionStr(fmt) {
  if (fmt.resolution) return fmt.resolution;
  if (fmt.width && fmt.height) return `${fmt.width}x${fmt.height}`;
  if (fmt.height) return `?x${fmt.height}`;
  return '';
}

function getLabelFromFmt(fmt) {
  const note = (fmt.note || fmt.format_note || fmt.resolution || '').toString();
  const h = fmt.height ? `${fmt.height}p` : '';
  for (const p of ['2160p','1440p','1080p','720p','480p','360p','240p','144p']) {
    if (note.includes(p.replace('p','')) || h === p) return p;
  }
  return h || note.substring(0,10) || 'unknown';
}

async function renderSiawaseokPlayer(formats, qualityLabel) {
  const wrapper = document.getElementById('player-wrapper');
  const { mp4Pairs, manifestList } = parseSiawaseokFormats(formats);
  if (mp4Pairs.length === 0 && manifestList.length > 0) { await renderManifestPlayer(manifestList[0].url, getLabelFromFmt(manifestList[0]) || 'Manifest'); return; }
  if (mp4Pairs.length === 0) { wrapper.innerHTML = failBlock(); return; }
  const defaultLabels = ['480p','360p','720p'];
  let target = mp4Pairs.find(p => p.label === qualityLabel);
  if (!target) { for (const dl of defaultLabels) { target = mp4Pairs.find(p => p.label === dl); if (target) break; } }
  if (!target) target = mp4Pairs[0];
  selectedQuality = target.label;
  const ql = document.getElementById('quality-label'); if (ql) ql.textContent = selectedQuality;
  document.querySelectorAll('.quality-option').forEach(el => el.classList.toggle('active', el.dataset.q === selectedQuality));
  const videoUrl = target.videoFmt.url, audioUrl = target.audioFmt ? target.audioFmt.url : null;
  if (target.isCombined || !audioUrl) {
    wrapper.innerHTML = `<video id="gv-video" style="width:100%;height:100%;background:#000;" controls autoplay crossorigin="anonymous"><source src="${videoUrl}" type="video/mp4"></video>`;
    document.getElementById('gv-video').onerror = () => { wrapper.innerHTML = failBlock(); };
  } else {
    wrapper.innerHTML = `<video id="gv-video" style="width:100%;height:100%;background:#000;" controls autoplay crossorigin="anonymous"><source src="${videoUrl}" type="video/mp4"></video><audio id="gv-audio" style="display:none;" crossorigin="anonymous"><source src="${audioUrl}" type="audio/mp4"></audio>`;
    attachAudioVideoSync(document.getElementById('gv-video'), document.getElementById('gv-audio'));
    document.getElementById('gv-video').onerror = () => { wrapper.innerHTML = failBlock(); };
  }
}

async function renderManifestPlayer(manifestUrl, label) {
  const wrapper = document.getElementById('player-wrapper');
  selectedQuality = label;
  const ql = document.getElementById('quality-label'); if (ql) ql.textContent = label;
  wrapper.innerHTML = `<video id="gv-video" style="width:100%;height:100%;background:#000;" controls autoplay></video>`;
  const vid = document.getElementById('gv-video');
  if (manifestUrl.includes('.m3u8') || manifestUrl.includes('hls')) {
    if (typeof Hls !== 'undefined' && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true });
      hls.loadSource(manifestUrl); hls.attachMedia(vid);
      hls.on(Hls.Events.MANIFEST_PARSED, () => { vid.play().catch(()=>{}); });
      hls.on(Hls.Events.ERROR, (e, d) => { if (d.fatal) wrapper.innerHTML = failBlock(); });
    } else if (vid.canPlayType('application/vnd.apple.mpegurl')) {
      vid.src = manifestUrl; vid.play().catch(()=>{});
    } else { wrapper.innerHTML = failBlock(); }
  } else {
    vid.src = manifestUrl; vid.play().catch(()=>{});
    vid.onerror = () => { wrapper.innerHTML = failBlock(); };
  }
}

function failBlock() {
  return `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:#000;color:#aaa;flex-direction:column;gap:8px;font-size:13px;"><span>再生に失敗しました</span><button onclick="switchStream(1)" style="padding:8px 16px;border-radius:20px;background:#fff;color:#000;font-weight:bold;cursor:pointer;border:none;">Nocookieで再生</button></div>`;
}

function buildSiawaseokQualityPanel(formats) {
  const panel = document.getElementById('quality-panel'), wrap = document.getElementById('quality-wrap');
  const { mp4Pairs, manifestList } = parseSiawaseokFormats(formats);
  if (mp4Pairs.length === 0 && manifestList.length > 0) {
    wrap.style.display = 'flex';
    selectedQuality = getLabelFromFmt(manifestList[0]) || 'Manifest';
    const ql = document.getElementById('quality-label'); if (ql) ql.textContent = '🎯 ' + selectedQuality;
    panel.innerHTML = '<div class="quality-panel-title">📡 Manifest</div>' +
      manifestList.map(f => { const lbl = getLabelFromFmt(f)||'Manifest'; return `<div class="quality-option" data-q="${lbl}" onclick="selectManifestQuality('${encodeURIComponent(f.url)}','${lbl}')">🎯 ${lbl}</div>`; }).join('');
    return;
  }
  if (mp4Pairs.length === 0) { wrap.style.display = 'none'; return; }
  wrap.style.display = 'flex';
  const hdLabels = ['1080p','720p','1440p','2160p'];
  const defaultLabels = ['480p','360p','720p'];
  let defaultOpt = null;
  for (const dl of defaultLabels) { defaultOpt = mp4Pairs.find(p => p.label===dl); if (defaultOpt) break; }
  if (!defaultOpt) defaultOpt = mp4Pairs[0];
  selectedQuality = defaultOpt.label;
  const ql = document.getElementById('quality-label'); if (ql) ql.textContent = selectedQuality;
  panel.innerHTML = '<div class="quality-panel-title">画質を選択</div>' +
    mp4Pairs.map(o => {
      const isHd = hdLabels.includes(o.label), hasAudio = o.audioFmt || o.isCombined;
      return `<div class="quality-option ${o.label===selectedQuality?'active':''}" data-q="${o.label}" onclick="selectSiawaseokQuality('${o.label}')">
        ${o.label}${isHd?'<span class="q-badge">HD</span>':''}${hasAudio?'<span style="font-size:10px;color:#4caf50;margin-left:4px;">🔊</span>':''}
      </div>`;
    }).join('') +
    (manifestList.length > 0 ? '<div class="quality-panel-title" style="margin-top:8px;">📡 Manifest</div>' +
      manifestList.map(f => { const lbl=getLabelFromFmt(f)||'Manifest'; return `<div class="quality-option" data-q="m_${lbl}" onclick="selectManifestQuality('${encodeURIComponent(f.url)}','${lbl}')">🎯 ${lbl}</div>`; }).join('') : '');
}

async function selectManifestQuality(encodedUrl, label) {
  const url = decodeURIComponent(encodedUrl);
  selectedQuality = label;
  const ql = document.getElementById('quality-label'); if (ql) ql.textContent = '🎯 ' + label;
  document.getElementById('quality-panel').classList.remove('open');
  await renderManifestPlayer(url, label);
}

async function selectSiawaseokQuality(label) {
  if (!currentGVAllFormats) return;
  selectedQuality = label;
  const ql = document.getElementById('quality-label'); if (ql) ql.textContent = label;
  document.getElementById('quality-panel').classList.remove('open');
  await renderSiawaseokPlayer(currentGVAllFormats, label);
}

async function setupWatchManifest(videoId) {
  const wrapper = document.getElementById('player-wrapper');
  wrapper.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:#000;color:#fff;flex-direction:column;gap:12px;">
    <div style="width:40px;height:40px;border:4px solid rgba(255,255,255,0.3);border-top-color:#0f0;border-radius:50%;animation:spin 0.8s linear infinite;"></div>
    <div style="font-size:13px;color:#0f0;font-family:monospace;">🚨 Manifestスキャン中...</div>
  </div><style>@keyframes spin{to{transform:rotate(360deg)}}</style>`;
  const huntResult = await manifestHunt(videoId);
  if (huntResult) {
    if (huntResult.type === 'manifest') {
      currentGVAllFormats = huntResult.streams; currentGVFormats = null;
      buildSiawaseokQualityPanel(huntResult.streams);
      buildDownloadPanelFromSiawaseok(huntResult.streams, 'watch');
      const first = huntResult.streams[0], label = first.qualityLabel || getLabelFromFmt(first) || 'Manifest';
      await renderManifestPlayer(first.url, label); return;
    }
    if (huntResult.type === 'formats' && huntResult.streams.length > 0) {
      currentGVAllFormats = huntResult.streams; currentGVFormats = null;
      buildSiawaseokQualityPanel(huntResult.streams);
      buildDownloadPanelFromSiawaseok(huntResult.streams, 'watch');
      const { mp4Pairs } = parseSiawaseokFormats(huntResult.streams);
      let defaultQ = null;
      for (const dl of ['480p','360p','720p']) { defaultQ = mp4Pairs.find(p => p.label===dl); if (defaultQ) break; }
      selectedQuality = defaultQ ? defaultQ.label : mp4Pairs[0]?.label || null;
      await renderSiawaseokPlayer(huntResult.streams, selectedQuality); return;
    }
  }
  const invFormats = await fetchGoogleVideoStreamsInvidious(videoId);
  if (invFormats && invFormats.length > 0) {
    currentGVFormats = invFormats; currentGVAllFormats = null;
    buildInvidiousQualityPanel(invFormats); buildDownloadPanel(invFormats, 'watch');
    const opts = getInvidiousQualityOptions(invFormats);
    const defaultQ = opts.find(o=>o.label==='480p') || opts.find(o=>o.label==='360p') || opts[0];
    selectedQuality = defaultQ ? defaultQ.label : null;
    await renderGVPlayerInvidious(invFormats, selectedQuality); return;
  }
  wrapper.innerHTML = failBlock();
}

async function fetchGoogleVideoStreamsInvidious(videoId) {
  for (const instance of INVIDIOUS_INSTANCES.slice(0, 10)) {
    try {
      const url = buildFetchUrl(`${instance}/api/v1/videos/${videoId}?fields=adaptiveFormats,formatStreams`);
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (!res.ok) continue;
      const data = await res.json();
      const formats = [...(data.adaptiveFormats||[]),...(data.formatStreams||[])];
      if (formats.length > 0) return formats;
    } catch(e) {}
  }
  return null;
}

function buildInvidiousQualityPanel(formats) {
  const panel = document.getElementById('quality-panel'), wrap = document.getElementById('quality-wrap');
  const opts = getInvidiousQualityOptions(formats);
  if (opts.length === 0) { wrap.style.display = 'none'; return; }
  wrap.style.display = 'flex';
  const hdLabels = ['1080p','720p','1440p','2160p'];
  const defaultQ = opts.find(o=>o.label==='720p') || opts.find(o=>o.label==='480p') || opts[0];
  selectedQuality = defaultQ.label;
  const ql = document.getElementById('quality-label'); if (ql) ql.textContent = selectedQuality;
  panel.innerHTML = '<div class="quality-panel-title">画質を選択</div>' + opts.map(o => `
    <div class="quality-option ${o.label===selectedQuality?'active':''}" data-q="${o.label}" onclick="selectInvidiousQuality('${o.label}')">
      ${o.label}${hdLabels.includes(o.label)?'<span class="q-badge">HD</span>':''}
    </div>
  `).join('');
}

function getInvidiousQualityOptions(formats) {
  const seen = new Set(), opts = [];
  for (const label of ['2160p','1440p','1080p','720p','480p','360p','240p','144p']) {
    const qNum = label.replace('p','');
    const vf = formats.find(f => f.type?.includes('video') && !f.type?.includes('audio') && f.qualityLabel?.includes(qNum) && f.url);
    const cf = formats.find(f => f.type?.includes('video') && f.type?.includes('audio') && f.qualityLabel?.includes(qNum) && f.url);
    if ((vf||cf) && !seen.has(label)) { seen.add(label); opts.push({ label, videoFmt: vf, combinedFmt: cf }); }
  }
  return opts;
}

async function selectInvidiousQuality(label) {
  if (!currentGVFormats) return;
  selectedQuality = label;
  const ql = document.getElementById('quality-label'); if (ql) ql.textContent = label;
  document.getElementById('quality-panel').classList.remove('open');
  document.querySelectorAll('.quality-option').forEach(o => o.classList.toggle('active', o.dataset.q === label));
  await renderGVPlayerInvidious(currentGVFormats, label);
}

async function renderGVPlayerInvidious(formats, quality) {
  const wrapper = document.getElementById('player-wrapper');
  const result = buildGoogleVideoPlayer(formats, quality);
  if (!result) { wrapper.innerHTML = failBlock(); return; }
  if (result.type === 'dual') {
    wrapper.innerHTML = `<video id="gv-video" style="width:100%;height:100%;" controls autoplay crossorigin="anonymous"><source src="${result.videoUrl}" type="video/mp4"></video><audio id="gv-audio" style="display:none;" crossorigin="anonymous"><source src="${result.audioUrl}" type="audio/mp4"></audio>`;
    attachAudioVideoSync(document.getElementById('gv-video'), document.getElementById('gv-audio'));
  } else {
    wrapper.innerHTML = `<video style="width:100%;height:100%;" controls autoplay crossorigin="anonymous"><source src="${result.url}"></video>`;
  }
}

function buildGoogleVideoPlayer(formats, preferQuality = null) {
  const audioFmt = formats.find(f => f.type?.includes('audio') && !f.type?.includes('video') && f.url);
  let videoFmt = null;
  if (preferQuality) {
    const qNum = preferQuality.replace('p','');
    videoFmt = formats.find(f => f.type?.includes('video') && !f.type?.includes('audio') && f.url && f.qualityLabel?.includes(qNum));
  }
  if (!videoFmt) videoFmt = formats.find(f => f.type?.includes('video') && !f.type?.includes('audio') && f.url && (f.qualityLabel?.includes('720')||f.qualityLabel?.includes('1080')));
  if (!videoFmt) videoFmt = formats.find(f => f.type?.includes('video') && !f.type?.includes('audio') && f.url);
  if (videoFmt && audioFmt) return { type: 'dual', videoUrl: videoFmt.url, audioUrl: audioFmt.url };
  const combined = formats.find(f => f.type?.includes('video') && f.type?.includes('audio') && f.url) || formats.find(f => f.url && f.qualityLabel);
  if (combined) return { type: 'single', url: combined.url };
  return null;
}

function toggleQualityPanel(e) { e.stopPropagation(); document.getElementById('quality-panel').classList.toggle('open'); }
document.addEventListener('click', () => {
  document.getElementById('quality-panel')?.classList.remove('open');
  document.querySelectorAll('.download-panel').forEach(p => p.classList.remove('open'));
});

// =================== ダウンロード ===================
function buildDownloadPanelFromSiawaseok(formats, panelId) {
  const panel = document.getElementById(`download-panel-${panelId}`);
  if (!panel) return;
  const { mp4Pairs, manifestList } = parseSiawaseokFormats(formats);
  const m4aFormats = formats.filter(f => (f.ext==='m4a'||f.acodec==='mp4a.40.2') && f.url && (!f.vcodec||f.vcodec==='none'));
  let html = '';
  if (manifestList.length > 0) {
    html += '<div style="padding:8px 16px;font-size:12px;color:var(--text-secondary);font-weight:bold;">🎯 Manifest</div>';
    manifestList.slice(0,3).forEach(f => {
      const lbl = getLabelFromFmt(f)||'Manifest';
      html += `<div class="download-option" onclick="window.open('${f.url}','_blank')"><svg viewBox="0 0 24 24"><path d="M15 8H9v3H6l6 6 6-6h-3V8zm-9 9h12v2H6v-2z"/></svg><div class="dl-label"><span class="dl-title">Manifest ${lbl}</span><span class="dl-desc">右クリック→リンクを保存</span></div></div>`;
    });
  }
  if (mp4Pairs.length > 0) {
    html += '<div style="padding:8px 16px;font-size:12px;color:var(--text-secondary);font-weight:bold;border-top:1px solid var(--border-color);">映像 (MP4)</div>';
    mp4Pairs.slice(0,5).forEach(o => {
      html += `<div class="download-option" onclick="startDownload('${encodeURIComponent(o.videoFmt.url)}','${o.label}.mp4','${o.label}')"><svg viewBox="0 0 24 24"><path d="M15 8H9v3H6l6 6 6-6h-3V8zm-9 9h12v2H6v-2z"/></svg><div class="dl-label"><span class="dl-title">${o.label} (MP4)</span><span class="dl-desc">映像のみ</span></div></div>`;
    });
  }
  if (m4aFormats.length > 0) {
    html += '<div style="padding:8px 16px 4px;font-size:12px;color:var(--text-secondary);font-weight:bold;border-top:1px solid var(--border-color);">音声 (M4A)</div>';
    m4aFormats.slice(0,2).forEach((f,i) => {
      html += `<div class="download-option" onclick="startDownload('${encodeURIComponent(f.url)}','audio_${i}.m4a','M4A音声')"><svg viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg><div class="dl-label"><span class="dl-title">音声 (M4A)</span></div></div>`;
    });
  }
  html += `<div style="padding:8px 16px 4px;font-size:12px;color:var(--text-secondary);font-weight:bold;border-top:1px solid var(--border-color);">外部ツール</div><div class="download-option" onclick="openYtdl()"><svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg><div class="dl-label"><span class="dl-title">cobaltで開く</span><span class="dl-desc">cobalt.tools</span></div></div>`;
  panel.innerHTML = html;
}

function buildDownloadPanel(formats, panelId) {
  const panel = document.getElementById(`download-panel-${panelId}`);
  if (!panel) return;
  const audioFmt = formats.find(f => f.type?.includes('audio') && !f.type?.includes('video') && f.url);
  const videoOpts = getInvidiousQualityOptions(formats);
  let html = '<div style="padding:8px 16px;font-size:12px;color:var(--text-secondary);font-weight:bold;">動画 (MP4)</div>';
  videoOpts.slice(0,5).forEach(o => {
    const url = (o.combinedFmt||o.videoFmt)?.url;
    if (!url) return;
    html += `<div class="download-option" onclick="startDownload('${encodeURIComponent(url)}','${o.label}.mp4','${o.label}')"><svg viewBox="0 0 24 24"><path d="M15 8H9v3H6l6 6 6-6h-3V8zm-9 9h12v2H6v-2z"/></svg><div class="dl-label"><span class="dl-title">${o.label} (MP4)</span></div></div>`;
  });
  if (audioFmt) html += `<div style="padding:8px 16px 4px;font-size:12px;color:var(--text-secondary);font-weight:bold;border-top:1px solid var(--border-color);">音声</div><div class="download-option" onclick="startDownload('${encodeURIComponent(audioFmt.url)}','audio.m4a','M4A')"><svg viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg><div class="dl-label"><span class="dl-title">音声のみ (M4A)</span></div></div>`;
  html += `<div style="padding:8px 16px 4px;font-size:12px;color:var(--text-secondary);font-weight:bold;border-top:1px solid var(--border-color);">外部ツール</div><div class="download-option" onclick="openYtdl()"><svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg><div class="dl-label"><span class="dl-title">cobaltで開く</span></div></div>`;
  panel.innerHTML = html;
}

function toggleDownloadPanel(e, panelId) {
  e.stopPropagation();
  const panel = document.getElementById(`download-panel-${panelId}`);
  if (panelId === 'watch' && !currentGVAllFormats && !currentGVFormats) {
    panel.innerHTML = `<div style="padding:8px 16px;font-size:12px;color:var(--text-secondary);">Manifestモードでストリームを取得するか外部ツールをご利用ください</div><div class="download-option" onclick="openYtdl()"><svg viewBox="0 0 24 24" style="width:18px;height:18px;fill:currentColor;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg><div class="dl-label"><span class="dl-title">cobaltで開く</span></div></div>`;
  }
  panel.classList.toggle('open');
}

function openYtdl() { window.open(`https://cobalt.tools/?url=https://www.youtube.com/watch?v=${currentVideoId}`, '_blank'); }

async function startDownload(encodedUrl, filename, label) {
  document.querySelectorAll('.download-panel').forEach(p => p.classList.remove('open'));
  const url = decodeURIComponent(encodedUrl);
  showDlToast(`${label}をダウンロード中...`, 0);
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error('fetch failed');
    const total = parseInt(res.headers.get('Content-Length') || '0');
    const reader = res.body.getReader();
    const chunks = []; let received = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value); received += value.length;
      if (total > 0) updateDlProgress(received / total * 100);
    }
    updateDlProgress(100);
    const blob = new Blob(chunks);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${(currentVideoTitle||'video').replace(/[\\/:*?"<>|]/g,'_')}_${filename}`;
    a.click();
    setTimeout(() => hideDlToast(), 2000);
  } catch(e) {
    hideDlToast();
    if (confirm('直接ダウンロードに失敗しました。cobalt.toolsで開きますか？')) openYtdl();
  }
}

function showDlToast(msg, progress) {
  const t = document.getElementById('dl-toast');
  document.getElementById('dl-toast-msg').textContent = msg;
  document.getElementById('dl-toast-fill').style.width = progress + '%';
  t.classList.add('show');
}
function updateDlProgress(p) { document.getElementById('dl-toast-fill').style.width = p + '%'; }
function hideDlToast() { document.getElementById('dl-toast').classList.remove('show'); }

// =================== 共有 ===================
function shareCurrentVideo() {
  if (!currentVideoId) return;
  openSharePanel(`${location.origin}/watch?v=${currentVideoId}`);
}
function openSharePanel(url) {
  document.getElementById('share-url-input').value = url;
  document.getElementById('share-panel').classList.add('open');
}
function closeSharePanel() { document.getElementById('share-panel').classList.remove('open'); }
function copyShareUrl() {
  const input = document.getElementById('share-url-input');
  navigator.clipboard.writeText(input.value).then(() => {
    const btn = document.querySelector('.share-copy-btn');
    btn.textContent = 'コピー済み！'; btn.style.background = '#4caf50';
    setTimeout(() => { btn.textContent = 'コピー'; btn.style.background = ''; }, 2000);
  }).catch(() => { input.select(); document.execCommand('copy'); });
}
function shareShort(videoId) { openSharePanel(`${location.origin}/shorts/${videoId}`); }

// =================== 音声同期 ===================
function attachAudioVideoSync(gvV, gvA) {
  const syncTime = () => { if (Math.abs(gvA.currentTime - gvV.currentTime) > 0.3) gvA.currentTime = gvV.currentTime; };
  gvV.onplay = () => { gvA.play().catch(()=>{}); syncTime(); };
  gvV.onpause = () => gvA.pause();
  gvV.onwaiting = () => gvA.pause();
  gvV.onplaying = () => { gvA.play().catch(()=>{}); syncTime(); };
  gvV.onseeked = () => { gvA.currentTime = gvV.currentTime; };
  gvV.ontimeupdate = () => { syncTime(); };
  gvV.onratechange = () => { gvA.playbackRate = gvV.playbackRate; };
  gvV.onvolumechange = () => { gvA.volume = gvV.volume; gvA.muted = gvV.muted; };
}

// =================== ショートObserver ===================
const shortSrcMap = {};
let shortObserver = null;

function initShortObserver() {
  if (shortObserver) { shortObserver.disconnect(); shortObserver = null; }
  const sfp = document.getElementById('shorts-full-page');
  if (!sfp) return;
  shortObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const item = entry.target, videoId = item.dataset.id, iframe = item.querySelector('iframe');
      if (!iframe || !videoId) return;
      if (entry.isIntersecting) {
        const savedSrc = shortSrcMap[videoId];
        if (savedSrc && iframe.src !== savedSrc) iframe.src = savedSrc;
      } else {
        if (iframe.src && !iframe.src.includes('about:blank')) {
          shortSrcMap[videoId] = iframe.src; iframe.src = 'about:blank';
        }
      }
    });
  }, { root: sfp, threshold: 0.5 });
}
function observeShortItem(el) { if (shortObserver) shortObserver.observe(el); }

// =================== おすすめ ===================
function getWatchHistory() { try { return JSON.parse(localStorage.getItem('history') || '[]'); } catch(e) { return []; } }
function getSearchHistory() { try { return JSON.parse(localStorage.getItem('search_history') || '[]'); } catch(e) { return []; } }
function saveSearchHistory(query) {
  let sh = getSearchHistory();
  sh = sh.filter(q => q !== query); sh.unshift(query);
  localStorage.setItem('search_history', JSON.stringify(sh.slice(0, 30)));
}

async function loadRecommendations() {
  const history = getWatchHistory(), searches = getSearchHistory();
  const grid = document.getElementById('home-recommend-grid'), section = document.getElementById('home-recommend');
  if (!grid || !section || (history.length < 2 && searches.length < 2)) return;
  section.classList.remove('hidden');
  grid.innerHTML = '<div class="loader" style="grid-column:1/-1;">おすすめを生成中...</div>';
  const keywords = [];
  history.slice(0,5).forEach(v => { v.title.replace(/[【】「」『』\[\]]/g,' ').split(/\s+/).slice(0,2).forEach(w => { if (w.length > 2) keywords.push(w); }); });
  searches.slice(0,3).forEach(s => keywords.push(s));
  if (keywords.length === 0) { section.classList.add('hidden'); return; }
  const pick = keywords.sort(() => Math.random()-0.5).slice(0,2);
  const results = [];
  for (const kw of pick) {
    const data = await fetchFromInvidious(kw, 'trend', 1);
    if (data) data.filter(v => v.type==='video' && v.videoId).slice(0,4).forEach(v => {
      if (!history.some(h => h.id === v.videoId) && results.length < 8) {
        results.push({ id: v.videoId, title: v.title, channel: v.author, isShort: v.lengthSeconds > 0 && v.lengthSeconds <= 61, authorThumb: v.authorThumbnails?.[0]?.url || `https://i.pravatar.cc/150?u=${v.author}`, duration: v.lengthSeconds||0, published: v.publishedText||'' });
      }
    });
  }
  grid.innerHTML = '';
  if (results.length === 0) { section.classList.add('hidden'); return; }
  results.forEach(v => {
    const card = document.createElement('div'); card.className = 'video-card';
    const durStr = formatDuration(v.duration);
    card.onclick = () => playVideo(v.id, v.title, v.channel, v.authorThumb);
    card.innerHTML = `<div class="thumbnail-container"><img src="https://i.ytimg.com/vi/${v.id}/mqdefault.jpg" loading="lazy">${durStr?`<span class="duration-badge">${durStr}</span>`:''}</div><div class="video-info"><div class="channel-avatar" onclick="event.stopPropagation(); openChannel('${v.channel.replace(/'/g,"\\'")}', '${v.authorThumb}')"><img src="${v.authorThumb}" loading="lazy"></div><div class="video-details"><div class="video-title">${v.title}</div><div class="video-meta"><span>${v.channel}</span>${v.published?`<span>${v.published}</span>`:''}</div></div></div>`;
    grid.appendChild(card);
  });
}

// =================== APIフェッチ ===================
async function fetchFromInvidious(query, context, page = 1) {
  let q = query; if (context === 'shorts') q += ' #shorts';
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const url = buildFetchUrl(`${instance}/api/v1/search?q=${encodeURIComponent(q)}&page=${page}`);
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (res.ok) return await res.json();
    } catch(e) {}
  }
  return null;
}

async function fetchChannelInfoFromInvidious(channelName) {
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const sRes = await fetch(buildFetchUrl(`${instance}/api/v1/search?q=${encodeURIComponent(channelName)}&type=channel&page=1`), { signal: AbortSignal.timeout(8000) });
      if (!sRes.ok) continue;
      const sData = await sRes.json();
      const channel = sData.find(c => c.type === 'channel');
      if (!channel?.authorId) continue;
      try {
        const dRes = await fetch(buildFetchUrl(`${instance}/api/v1/channels/${channel.authorId}`), { signal: AbortSignal.timeout(8000) });
        if (dRes.ok) { const detail = await dRes.json(); return { ...channel, ...detail, authorId: channel.authorId }; }
      } catch(e) {}
      return channel;
    } catch(e) {}
  }
  return null;
}

async function fetchChannelVideos(channelName, page = 1) {
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const sRes = await fetch(buildFetchUrl(`${instance}/api/v1/search?q=${encodeURIComponent(channelName)}&type=channel&page=1`), { signal: AbortSignal.timeout(8000) });
      if (!sRes.ok) continue;
      const sData = await sRes.json();
      const channel = sData.find(c => c.type === 'channel');
      if (!channel) continue;
      const vRes = await fetch(buildFetchUrl(`${instance}/api/v1/channels/${channel.authorId}/videos?page=${page}`), { signal: AbortSignal.timeout(8000) });
      if (!vRes.ok) continue;
      const vData = await vRes.json();
      return { videos: vData.videos || [], channelInfo: channel };
    } catch(e) {}
  }
  return null;
}

async function fetchChannelLiveVideos(channelName) {
  let channelId = null, channelInfo = null;
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const sRes = await fetch(buildFetchUrl(`${instance}/api/v1/search?q=${encodeURIComponent(channelName)}&type=channel&page=1`), { signal: AbortSignal.timeout(8000) });
      if (!sRes.ok) continue;
      const sData = await sRes.json();
      const channel = sData.find(c => c.type === 'channel');
      if (channel) { channelId = channel.authorId; channelInfo = channel; break; }
    } catch(e) {}
  }
  if (!channelId) return { videos: [], channelInfo: null };
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const res = await fetch(buildFetchUrl(`${instance}/api/v1/channels/${channelId}/streams`), { signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const data = await res.json();
      const videos = data.videos || data || [];
      if (Array.isArray(videos) && videos.length > 0) return { videos, channelInfo };
    } catch(e) {}
  }
  return { videos: [], channelInfo };
}

async function fetchChannelShortsMultiPage(channelName, startPage = 1) {
  let channelId = null;
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const sRes = await fetch(buildFetchUrl(`${instance}/api/v1/search?q=${encodeURIComponent(channelName)}&type=channel&page=1`), { signal: AbortSignal.timeout(8000) });
      if (!sRes.ok) continue;
      const sData = await sRes.json();
      const channel = sData.find(c => c.type === 'channel');
      if (channel) { channelId = channel.authorId; break; }
    } catch(e) {}
  }
  if (!channelId) return { shorts: [], hasMore: false };
  const allVideos = [];
  for (const page of [startPage, startPage+1, startPage+2]) {
    for (const instance of INVIDIOUS_INSTANCES) {
      try {
        const vRes = await fetch(buildFetchUrl(`${instance}/api/v1/channels/${channelId}/videos?page=${page}`), { signal: AbortSignal.timeout(8000) });
        if (!vRes.ok) continue;
        const vData = await vRes.json();
        if (vData.videos?.length > 0) { allVideos.push(...vData.videos); break; }
      } catch(e) {}
    }
  }
  const shorts = allVideos.filter(v => v.lengthSeconds > 0 && v.lengthSeconds <= 61).map(v => ({
    id: v.videoId, title: v.title, channel: v.author || channelName, isShort: true,
    authorThumb: v.authorThumbnails?.[0]?.url || `https://i.pravatar.cc/150?u=${encodeURIComponent(v.author||channelName)}`,
    duration: v.lengthSeconds, published: v.publishedText||''
  }));
  return { shorts, hasMore: allVideos.length >= 20 };
}

// =================== CSE ===================
window.__gcse = {
  parsetags: 'explicit',
  initializationCallback: function() {
    google.search.cse.element.render({ div: "hidden-cse-container", tag: 'searchresults-only', gname: 'studyCse' });
    initApp();
    const config = getAppConfig();
    if (!config.isFirstVisit && config.trend) loadTrend();
    else if (!config.isFirstVisit && !config.trend) document.getElementById('home-loader')?.classList.add('hidden');
  },
  searchCallbacks: {
    web: {
      ready: function(name, q, promos, results) {
        isFetching = false; clearTimeout(captchaTimer);
        document.getElementById('hidden-cse-container').style.display = 'none';
        let videos = [];
        if (results?.length > 0) {
          results.forEach(r => {
            const urlStr = r.unescapedUrl || r.url || "", titleStr = r.titleNoFormatting || r.title || "";
            const isShort = urlStr.includes('/shorts/') || titleStr.toLowerCase().includes('#shorts');
            const id = (urlStr.match(/(?:v=|vi\/|youtu\.be\/|embed\/|v%3D|video\/|shorts\/)([a-zA-Z0-9_-]{11})/) || [])[1];
            if (searchContext === 'shorts' && !isShort && !urlStr.includes('shorts')) return;
            if (id && id.length === 11 && !seenVideoIds.has(id)) {
              seenVideoIds.add(id);
              videos.push({ id, title: titleStr, isShort, channel: (r.visibleUrl||"YouTube Channel").split('/')[0], authorThumb: `https://i.pravatar.cc/150?u=${(r.visibleUrl||"").split('/')[0]}` });
            }
          });
        }
        renderResults(videos, currentPage > 1);
        if (searchContext === 'trend' && currentPage <= 1) { fetchShortsForHome(); loadRecommendations(); }
        return true;
      }
    }
  }
};

async function triggerSearch(query, context, append = false) {
  if (isFetching) return; isFetching = true; searchContext = context; lastQuery = query;
  if (!append) { seenVideoIds.clear(); currentPage = 1; } else { currentPage++; }

  if (context === 'channel-home' || context === 'channel-videos') {
    const result = await fetchChannelVideos(query, currentPage);
    isFetching = false;
    if (result?.videos?.length > 0) {
      const videos = result.videos.map(v => ({ id: v.videoId, title: v.title, channel: v.author || query, isShort: false, authorThumb: v.authorThumbnails?.[0]?.url || `https://i.pravatar.cc/150?u=${encodeURIComponent(v.author||query)}`, duration: v.lengthSeconds||0, published: v.publishedText||'', isLive: v.liveNow||false, isArchived: !v.liveNow && v.lengthSeconds > 0 && (v.title && (v.title.includes('ライブ')||v.title.includes('配信')||v.title.includes('LIVE'))), publishedTimestamp: v.published||0 }));
      renderResults(videos, append);
      if (result.channelInfo && !append) updateChannelHeaderInfo(result.channelInfo);
      return;
    }
    const invData = await fetchFromInvidious(query, context, currentPage);
    if (invData?.length > 0) {
      const videos = invData.filter(item => {
        if (item.type !== 'video' || !item.videoId || seenVideoIds.has(item.videoId)) return false;
        const an = (item.author||'').toLowerCase().trim(), qn = query.toLowerCase().trim();
        return an.includes(qn) || qn.includes(an);
      }).map(item => { seenVideoIds.add(item.videoId); return { id: item.videoId, title: item.title, channel: item.author||query, isShort: false, isLive: item.liveNow||false, isArchived: !item.liveNow && (item.title&&(item.title.includes('ライブ')||item.title.includes('配信')||item.title.includes('LIVE'))), authorThumb: item.authorThumbnails?.[0]?.url || `https://i.pravatar.cc/150?u=${encodeURIComponent(item.author||query)}`, duration: item.lengthSeconds||0, published: item.publishedText||'', publishedTimestamp: item.published||0 }; });
      renderResults(videos, append);
    }
    return;
  }

  if (context === 'channel-shorts') {
    const cleanName = query.replace(/\s*shorts\s*/gi,'').replace(/#/g,'').trim();
    currentChannelShortsName = cleanName; isFetching = false;
    const { shorts, hasMore } = await fetchChannelShortsMultiPage(cleanName, currentChannelShortsPage);
    if (shorts.length > 0) {
      renderChannelShorts(shorts, append);
      const moreBtn = document.getElementById('channel-shorts-more-btn');
      if (moreBtn) moreBtn.style.display = hasMore ? 'block' : 'none';
    } else {
      const invData = await fetchFromInvidious(cleanName + ' #shorts', 'shorts', currentPage);
      if (invData?.length > 0) {
        const videos = invData.filter(item => item.type==='video' && item.videoId && item.lengthSeconds > 0 && item.lengthSeconds <= 61).map(item => ({ id: item.videoId, title: item.title, channel: item.author||cleanName, isShort: true, authorThumb: item.authorThumbnails?.[0]?.url || `https://i.pravatar.cc/150?u=${encodeURIComponent(item.author||cleanName)}`, duration: item.lengthSeconds, published: item.publishedText||'' }));
        renderChannelShorts(videos, append);
      } else {
        document.getElementById('channel-shorts-loader')?.classList.add('hidden');
        const grid = document.getElementById('channel-shorts-grid');
        if (grid && !append) grid.innerHTML = '<div style="padding:24px;color:var(--text-secondary);">ショート動画が見つかりませんでした</div>';
      }
    }
    return;
  }

  if (context === 'channel-live') {
    const chName = query.replace(/ ライブ$/, '').trim(); isFetching = false;
    const { videos: liveVideos, channelInfo } = await fetchChannelLiveVideos(chName);
    if (liveVideos?.length > 0) {
      const mapped = liveVideos.map(v => ({ id: v.videoId, title: v.title||'', channel: v.author||chName, isShort: false, isLive: !!(v.liveNow||v.isUpcoming), isUpcoming: !!v.isUpcoming, isArchived: !v.liveNow && !v.isUpcoming, authorThumb: v.authorThumbnails?.[0]?.url || `https://i.pravatar.cc/150?u=${encodeURIComponent(v.author||chName)}`, duration: v.lengthSeconds||0, published: v.publishedText||'', publishedTimestamp: v.published||0 }));
      renderChannelLive(mapped, append);
      if (channelInfo && !append) updateChannelHeaderInfo(channelInfo);
    } else {
      const result = await fetchChannelVideos(chName, 1);
      if (result?.videos) {
        const liveFiltered = result.videos.filter(v => v.liveNow || v.isUpcoming || (v.title && v.title.match(/ライブ|配信|LIVE|live|生放送|STREAM/i)));
        const mapped = (liveFiltered.length > 0 ? liveFiltered : result.videos.slice(0,12)).map(v => ({ id: v.videoId, title: v.title, channel: v.author||chName, isShort: false, isLive: !!(v.liveNow||v.isUpcoming), isUpcoming: !!v.isUpcoming, isArchived: !v.liveNow && !v.isUpcoming && (v.title && !!v.title.match(/ライブ|配信|LIVE|live|生放送/i)), authorThumb: v.authorThumbnails?.[0]?.url || `https://i.pravatar.cc/150?u=${encodeURIComponent(v.author||chName)}`, duration: v.lengthSeconds||0, published: v.publishedText||'', publishedTimestamp: v.published||0 }));
        renderChannelLive(mapped, append);
      } else {
        document.getElementById('channel-live-loader')?.classList.add('hidden');
        document.getElementById('channel-live-grid').innerHTML = '<div class="subs-empty">ライブ・配信動画が見つかりません</div>';
      }
    }
    return;
  }

  const invData = await fetchFromInvidious(query, context, currentPage);
  if (invData?.length > 0) {
    isFetching = false;
    const videos = invData.filter(item => {
      if (item.type !== 'video' || !item.videoId || seenVideoIds.has(item.videoId)) return false;
      if (context === 'shorts' && item.lengthSeconds > 61) return false;
      return true;
    }).map(item => { seenVideoIds.add(item.videoId); return { id: item.videoId, title: item.title, channel: item.author, isShort: item.lengthSeconds > 0 && item.lengthSeconds <= 61, isLive: item.liveNow||false, authorThumb: item.authorThumbnails?.[0]?.url || `https://i.pravatar.cc/150?u=${item.author}`, duration: item.lengthSeconds||0, published: item.publishedText||'' }; });
    renderResults(videos, append);
    if (context === 'search' && !append) fetchShortsForSearch(query);
    if (context === 'trend' && !append) { fetchShortsForHome(); loadRecommendations(); }
    return;
  }

  clearTimeout(captchaTimer);
  captchaTimer = setTimeout(() => {
    if (isFetching) {
      const c = document.getElementById('hidden-cse-container');
      c.style.display = 'block'; c.style.position = 'fixed'; c.style.top = '100px'; c.style.left = '50%'; c.style.transform = 'translateX(-50%)'; c.style.zIndex = '10000';
      alert("ロボット確認が必要です。画面の指示に従ってください。");
    }
  }, 3000);
  const element = google.search.cse.element.getElement('studyCse');
  element.execute(query + (append ? [" pv"," hd",""][Math.floor(Math.random()*3)] : "") + " site:youtube.com");
}

async function loadMoreChannelShorts() {
  currentChannelShortsPage += 3;
  document.getElementById('channel-shorts-more-btn').style.display = 'none';
  document.getElementById('channel-shorts-loader').classList.remove('hidden');
  const { shorts, hasMore } = await fetchChannelShortsMultiPage(currentChannelShortsName, currentChannelShortsPage);
  renderChannelShorts(shorts, true);
  const moreBtn = document.getElementById('channel-shorts-more-btn');
  if (moreBtn) moreBtn.style.display = hasMore && shorts.length > 0 ? 'block' : 'none';
}

function updateChannelHeaderInfo(channelInfo) {
  if (!channelInfo) return;
  const nameEl = document.getElementById('channel-page-name'), handleEl = document.getElementById('channel-page-handle'), metaEl = document.getElementById('channel-page-meta'), iconEl = document.getElementById('channel-page-icon');
  if (channelInfo.author) nameEl.innerText = channelInfo.author;
  if (channelInfo.authorId) { handleEl.innerText = `@${channelInfo.authorId}`; currentChannelId = channelInfo.authorId; }
  if (channelInfo.subCount) metaEl.innerText = `登録者数 ${formatSubCount(channelInfo.subCount)} • 動画 ${channelInfo.videoCount||'--'}件`;
  if (channelInfo.authorThumbnails?.length > 0) iconEl.src = channelInfo.authorThumbnails[channelInfo.authorThumbnails.length-1].url;
  if (channelInfo.authorBanners?.length > 0) {
    const best = channelInfo.authorBanners.reduce((b, c) => (!b || (c.width||0) > (b.width||0)) ? c : b, null);
    if (best?.url) drawChannelBanner(best.url);
  } else { drawChannelBanner(null); }
  updateChannelSubscribeUI(nameEl.innerText);
}

function formatSubCount(n) {
  if (!n) return '--';
  if (n >= 1000000) return (n/1000000).toFixed(1)+'万人';
  if (n >= 10000) return Math.floor(n/10000)+'万人';
  if (n >= 1000) return (n/1000).toFixed(1)+'K人';
  return n+'人';
}

function drawChannelBanner(bannerUrl) {
  const img = document.getElementById('channel-banner-img'), canvas = document.getElementById('channel-banner-canvas');
  if (bannerUrl) { img.src = bannerUrl; img.style.display = 'block'; canvas.style.display = 'none'; }
  else { img.style.display = 'none'; canvas.style.display = 'block'; drawFallbackBanner(canvas); }
}

function drawFallbackBanner(canvas) {
  canvas.width = canvas.offsetWidth || 1280; canvas.height = 180;
  const ctx = canvas.getContext('2d');
  const colors = [['#ff0000','#ff6b6b'],['#4285f4','#34a853'],['#ff6d00','#ffab00'],['#7c4dff','#e040fb'],['#00bcd4','#009688']];
  const c = colors[Math.floor(Math.random()*colors.length)];
  const grad = ctx.createLinearGradient(0,0,canvas.width,canvas.height);
  grad.addColorStop(0,c[0]); grad.addColorStop(1,c[1]);
  ctx.fillStyle = grad; ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.globalAlpha = 0.15; ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(canvas.width*0.8,canvas.height*0.3,120,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(canvas.width*0.2,canvas.height*0.9,80,0,Math.PI*2); ctx.fill();
  ctx.globalAlpha = 1;
}

async function fetchShortsForHome() {
  const container = document.getElementById('home-shorts-container'), section = document.getElementById('home-shorts');
  if (!container || !section) return;
  let shorts = [];
  for (const q of ["人気 #shorts","#shorts 人気","ショート 人気"]) {
    const data = await fetchFromInvidious(q,"shorts",1);
    if (data?.length > 0) { shorts = data.filter(v => v.videoId && v.lengthSeconds >= 0 && v.lengthSeconds <= 65); if (shorts.length > 0) break; }
  }
  if (shorts.length === 0) return;
  container.innerHTML = '';
  shorts.slice(0,10).forEach(v => {
    const div = document.createElement('div'); div.className = 'home-short-card';
    div.onclick = () => navigateToShortPage(v.videoId, v.title, v.author, v.authorThumbnails?.[0]?.url);
    div.innerHTML = `<div class="home-short-thumb"><img src="https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg" loading="lazy"></div><div class="home-short-title">${v.title}</div>`;
    container.appendChild(div);
  });
  section.classList.remove('hidden');
}

async function fetchShortsForSearch(query) {
  const data = await fetchFromInvidious(query + ' #shorts',"shorts",1);
  if (data?.length > 0) {
    const shorts = data.filter(v => v.videoId && v.lengthSeconds > 0 && v.lengthSeconds <= 61).slice(0,8);
    if (shorts.length === 0) return;
    const container = document.getElementById('search-shorts-container');
    container.innerHTML = '';
    shorts.forEach(v => {
      const div = document.createElement('div'); div.className = 'home-short-card';
      div.onclick = () => navigateToShortPage(v.videoId, v.title, v.author, v.authorThumbnails?.[0]?.url);
      div.innerHTML = `<div class="home-short-thumb"><img src="https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg" loading="lazy"></div><div class="home-short-title">${v.title}</div>`;
      container.appendChild(div);
    });
    document.getElementById('search-shorts-section').classList.remove('hidden');
  }
}

function navigateToShortPage(videoId, title, channel, thumb, noHistory = false) {
  navigate('shorts', { videoId, title, channel, thumb, noHistory });
  setTimeout(() => {
    const container = document.getElementById('shorts-container');
    container.innerHTML = ''; currentShortItems = []; initShortObserver();
    renderShorts([{ id: videoId, title: title||'', channel: channel||'', authorThumb: thumb || `https://i.pravatar.cc/80?u=${videoId}`, isShort: true }], false);
    triggerSearch("#shorts 人気",'shorts',true);
  }, 100);
}

// =================== ショートストリーム ===================
function buildShortNocookieSrc(videoId) { return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&rel=0`; }
function buildShortEduSrc(videoId, key) {
  if (!key) return buildShortNocookieSrc(videoId);
  return `https://www.youtubeeducation.com/embed/${videoId}?autoplay=1&origin=https%3A%2F%2Fcreate.kahoot.it&embed_config=${encodeURIComponent(JSON.stringify({enc:key,hideTitle:true}))}`;
}

function renderShorts(videos, append = false) {
  const container = document.getElementById('shorts-container');
  if (!append) { container.innerHTML = ''; currentShortItems = []; initShortObserver(); }
  currentShortItems = [...currentShortItems, ...videos];
  videos.forEach(v => {
    const item = document.createElement('div');
    item.className = 'short-snap-item'; item.dataset.id = v.id;
    const channelSafe = (v.channel||'').replace(/'/g,"\\'"), titleSafe = (v.title||'').replace(/</g,'&lt;');
    const initialSrc = buildShortNocookieSrc(v.id);
    shortSrcMap[v.id] = initialSrc;
    const likeCount = Math.floor(Math.random()*50000)+100;
    const likeStr = likeCount >= 10000 ? (likeCount/1000).toFixed(0)+'K' : likeCount.toLocaleString();
    const subbed = isSubscribed(v.channel||'');
    item.innerHTML = `
      <div class="short-center">
        <div class="short-video-wrap" id="short-wrap-${v.id}">
          <iframe src="about:blank" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
          <div class="short-stream-selector">
            <button class="short-stream-btn ${shortStreamType===1?'active':''}" onclick="changeShortStream(1,'${v.id}')">NC</button>
            <button class="short-stream-btn ${shortStreamType===2?'active':''}" onclick="changeShortStream(2,'${v.id}')">Edu</button>
            <button class="short-stream-btn ${shortStreamType===3?'active':''}" onclick="changeShortStream(3,'${v.id}')">MF</button>
          </div>
          <div class="short-overlay-bottom">
            <div class="short-channel" onclick="openChannel('${channelSafe}','${v.authorThumb||''}')">
              <img src="${v.authorThumb||`https://i.pravatar.cc/80?u=${v.channel}`}" onerror="this.src='https://i.pravatar.cc/80?u=${encodeURIComponent(v.channel||'')}'">
              <span class="short-channel-name">${v.channel||''}</span>
              <button class="short-sub-btn ${subbed?'subscribed':''}" id="short-sub-btn-${v.id}" onclick="event.stopPropagation();toggleSubscribeFromShort('${channelSafe}','${v.authorThumb||''}',this)">${subbed?'登録済み':'登録'}</button>
            </div>
            <div class="short-title">${titleSafe}</div>
          </div>
        </div>
        <div class="short-side-actions">
          <div class="short-action-btn" onclick="openChannel('${channelSafe}','${v.authorThumb||''}')">
            <div class="icon"><img src="${v.authorThumb||`https://i.pravatar.cc/80?u=${v.channel}`}" style="width:48px;height:48px;border-radius:50%;object-fit:cover;"></div>
          </div>
          <div class="short-action-btn" onclick="toggleShortLike(this)">
            <div class="icon"><svg viewBox="0 0 24 24" style="fill:currentColor;stroke:none;"><path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/></svg></div>
            <span class="short-like-count">${likeStr}</span>
          </div>
          <div class="short-action-btn" onclick="toggleShortDislike(this)">
            <div class="icon"><svg viewBox="0 0 24 24" style="fill:currentColor;stroke:none;"><path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z"/></svg></div>
            <span>低評価</span>
          </div>
          <div class="short-action-btn" onclick="openShortComments('${v.id}','${titleSafe}')">
            <div class="icon"><svg viewBox="0 0 24 24" style="fill:currentColor;stroke:none;"><path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18z"/></svg></div>
            <span>コメント</span>
          </div>
          <div class="short-action-btn" onclick="shareShort('${v.id}')">
            <div class="icon"><svg viewBox="0 0 24 24" style="fill:currentColor;stroke:none;"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/></svg></div>
            <span>共有</span>
          </div>
          <div class="short-action-btn" onclick="playVideo('${v.id}','${titleSafe}','${channelSafe}','${v.authorThumb||''}')">
            <div class="icon"><svg viewBox="0 0 24 24" style="fill:currentColor;stroke:none;"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg></div>
            <span>詳細</span>
          </div>
          <div class="short-action-btn" onclick="window.open('https://cobalt.tools/?url=https://www.youtube.com/shorts/${v.id}','_blank')">
            <div class="icon"><svg viewBox="0 0 24 24" style="fill:currentColor;stroke:none;"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg></div>
            <span>DL</span>
          </div>
        </div>
      </div>
      <div class="short-comments-panel" id="short-comments-panel-${v.id}" style="display:none;position:absolute;bottom:0;left:0;right:0;height:65%;background:var(--bg-color);border-radius:16px 16px 0 0;z-index:20;overflow-y:auto;padding:16px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;font-weight:bold;">
          <span>コメント</span>
          <button onclick="closeShortComments('${v.id}')" style="background:none;border:none;font-size:20px;cursor:pointer;color:var(--text-color);">×</button>
        </div>
        <div id="short-comments-content-${v.id}" class="loader">読み込み中...</div>
      </div>
    `;
    container.appendChild(item);
    observeShortItem(item);
  });
  document.getElementById('shorts-loader').classList.add('hidden');
}

async function changeShortStream(type, targetVideoId) {
  shortStreamType = type;
  const config = getAppConfig(); config.shortStream = type;
  localStorage.setItem('study2525_config', JSON.stringify(config));
  for (const v of currentShortItems) {
    const wrap = document.getElementById(`short-wrap-${v.id}`);
    if (!wrap) continue;
    wrap.querySelectorAll('.short-stream-btn').forEach((b,i) => b.classList.toggle('active', i+1===type));
  }
  if (type === 1) {
    for (const v of currentShortItems) {
      const newSrc = buildShortNocookieSrc(v.id);
      shortSrcMap[v.id] = newSrc;
      const wrap = document.getElementById(`short-wrap-${v.id}`);
      if (!wrap) continue;
      wrap.querySelectorAll('video, audio, .short-gv-loading').forEach(el => el.remove());
      let iframe = wrap.querySelector('iframe');
      if (!iframe) { iframe = document.createElement('iframe'); iframe.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'; iframe.allowFullscreen=true; wrap.insertBefore(iframe, wrap.firstChild); }
      iframe.style.display = ''; iframe.src = newSrc;
    }
  } else if (type === 2) {
    if (!currentEduKey) currentEduKey = await fetchKahootKey();
    if (!currentEduKey) { alert("Edu準備中"); shortStreamType=1; changeShortStream(1, targetVideoId); return; }
    for (const v of currentShortItems) {
      const newSrc = buildShortEduSrc(v.id, currentEduKey);
      shortSrcMap[v.id] = newSrc;
      const wrap = document.getElementById(`short-wrap-${v.id}`);
      if (!wrap) continue;
      wrap.querySelectorAll('video, audio, .short-gv-loading').forEach(el => el.remove());
      let iframe = wrap.querySelector('iframe');
      if (!iframe) { iframe = document.createElement('iframe'); iframe.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'; iframe.allowFullscreen=true; wrap.insertBefore(iframe, wrap.firstChild); }
      iframe.style.display = '';
      if (iframe.src && !iframe.src.includes('about:blank')) iframe.src = newSrc;
    }
  } else if (type === 3) {
    for (const v of currentShortItems) {
      const wrap = document.getElementById(`short-wrap-${v.id}`);
      if (!wrap) continue;
      const existingIframe = wrap.querySelector('iframe');
      if (existingIframe) { existingIframe.src = 'about:blank'; existingIframe.style.display = 'none'; }
      wrap.querySelectorAll('video, audio, .short-gv-loading').forEach(el => el.remove());
      const loadingDiv = document.createElement('div');
      loadingDiv.className = 'short-gv-loading';
      loadingDiv.innerHTML = '<div class="spinner"></div><span style="color:#0f0;font-family:monospace;">🚨 Manifest探索中...</span>';
      wrap.appendChild(loadingDiv);
    }
    for (const v of currentShortItems) {
      const wrap = document.getElementById(`short-wrap-${v.id}`);
      if (!wrap) continue;
      (async () => {
        const loadingEl = wrap.querySelector('.short-gv-loading');
        const huntResult = await manifestHunt(v.id);
        let videoUrl = null, audioUrl = null, isManifest = false, manifestUrl = null;
        if (huntResult) {
          if (huntResult.type === 'manifest' && huntResult.streams.length > 0) { manifestUrl = huntResult.streams[0].url; isManifest = true; }
          else if (huntResult.type === 'formats' && huntResult.streams.length > 0) {
            const { mp4Pairs } = parseSiawaseokFormats(huntResult.streams);
            const m4aFormats = huntResult.streams.filter(f => (f.ext==='m4a'||f.acodec==='mp4a.40.2') && f.url && (!f.vcodec||f.vcodec==='none'));
            const target = mp4Pairs.find(p=>p.label==='720p') || mp4Pairs.find(p=>p.label==='480p') || mp4Pairs.find(p=>p.label==='360p') || mp4Pairs[0];
            if (target) { videoUrl = target.videoFmt.url; audioUrl = target.audioFmt ? target.audioFmt.url : null; }
          }
        }
        if (!videoUrl && !isManifest) {
          const invFormats = await fetchGoogleVideoStreamsInvidious(v.id);
          if (invFormats) {
            const result = buildGoogleVideoPlayer(invFormats);
            if (result?.type==='dual') { videoUrl=result.videoUrl; audioUrl=result.audioUrl; }
            else if (result?.type==='single') videoUrl=result.url;
          }
        }
        if (loadingEl) loadingEl.remove();
        const iframe = wrap.querySelector('iframe');
        if (isManifest && manifestUrl) {
          if (iframe) iframe.style.display = 'none';
          const vid = document.createElement('video');
          vid.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000;';
          vid.autoplay=true; vid.loop=true; vid.playsInline=true;
          wrap.appendChild(vid);
          if (manifestUrl.includes('.m3u8') && typeof Hls !== 'undefined' && Hls.isSupported()) {
            const hls = new Hls(); hls.loadSource(manifestUrl); hls.attachMedia(vid);
            hls.on(Hls.Events.MANIFEST_PARSED, () => { vid.play().catch(()=>{}); });
            hls.on(Hls.Events.ERROR, () => { vid.remove(); if(iframe){iframe.style.display='';iframe.src=buildShortNocookieSrc(v.id);} });
          } else { vid.src=manifestUrl; vid.play().catch(()=>{}); vid.onerror=()=>{vid.remove();if(iframe){iframe.style.display='';iframe.src=buildShortNocookieSrc(v.id);}}; }
        } else if (videoUrl) {
          if (iframe) iframe.style.display = 'none';
          const vid = document.createElement('video');
          vid.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000;';
          vid.autoplay=true; vid.loop=true; vid.muted=!audioUrl; vid.playsInline=true; vid.crossOrigin='anonymous';
          vid.innerHTML = `<source src="${videoUrl}" type="video/mp4">`;
          wrap.appendChild(vid);
          if (audioUrl) {
            const aud = document.createElement('audio'); aud.style.display='none'; aud.loop=true; aud.crossOrigin='anonymous';
            aud.innerHTML=`<source src="${audioUrl}" type="audio/mp4">`; wrap.appendChild(aud); attachAudioVideoSync(vid,aud);
          }
          vid.play().catch(()=>{ vid.muted=true; vid.play(); });
        } else { if(iframe){iframe.style.display='';iframe.src=buildShortNocookieSrc(v.id);} }
      })();
    }
  }
}

// =================== レンダリング ===================
function formatDuration(sec) {
  if (!sec || sec <= 0) return '';
  const h=Math.floor(sec/3600), m=Math.floor((sec%3600)/60), s=sec%60;
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${m}:${String(s).padStart(2,'0')}`;
}
function formatTimestamp(ts) {
  if (!ts || ts === 0) return '';
  const d = new Date(ts*1000);
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function renderResults(videos, append = false) {
  if (searchContext === 'related') { renderRelatedVideos(videos, append); return; }
  if (searchContext === 'shorts') { renderShorts(videos, append); return; }
  if (searchContext === 'channel-shorts') { renderChannelShorts(videos, append); return; }
  if (searchContext === 'channel-live') { renderChannelLive(videos, append); return; }
  if (searchContext === 'search') { renderSearchResults(videos, append); return; }
  let containerId = 'home-grid';
  if (searchContext === 'channel' || searchContext === 'channel-home') containerId = 'channel-home-grid';
  if (searchContext === 'channel-videos') containerId = 'channel-grid';
  const container = document.getElementById(containerId);
  if (!container) return;
  if (!append) container.innerHTML = '';
  videos.forEach(v => {
    const card = document.createElement('div'); card.className = 'video-card';
    const isLive = v.isLive || (v.title && (v.title.includes('ライブ')||v.title.includes('LIVE')||v.title.includes('配信')));
    const isArchived = v.isArchived||false, durStr = formatDuration(v.duration), dateStr = v.publishedTimestamp ? formatTimestamp(v.publishedTimestamp) : '';
    card.onclick = () => playVideo(v.id, v.title, v.channel, v.authorThumb);
    card.innerHTML = `<div class="thumbnail-container"><img src="https://i.ytimg.com/vi/${v.id}/mqdefault.jpg" loading="lazy">${v.isLive?'<span class="live-thumb-badge">🔴 配信中</span>':isArchived?`<span class="archived-badge">📅 配信済み${dateStr?' '+dateStr:''}</span>`:(durStr?`<span class="duration-badge">${durStr}</span>`:'')}</div><div class="video-info"><div class="channel-avatar" onclick="event.stopPropagation(); openChannel('${v.channel.replace(/'/g,"\\'")}','${v.authorThumb}')"><img src="${v.authorThumb}" loading="lazy"></div><div class="video-details"><div class="video-title">${v.title}</div><div class="video-meta"><span style="cursor:pointer;" onclick="event.stopPropagation(); openChannel('${v.channel.replace(/'/g,"\\'")}','${v.authorThumb}')">${v.channel}</span>${v.isLive?'<span style="color:#ff0000;font-weight:bold;">● ライブ配信中</span>':isArchived&&dateStr?`<span>${dateStr} 配信済み</span>`:(v.published?`<span>${v.published}</span>`:'')}</div></div></div>`;
    container.appendChild(card);
  });
  document.getElementById('home-loader')?.classList.add('hidden');
  document.getElementById('channel-loader')?.classList.add('hidden');
  if ((searchContext==='channel'||searchContext==='channel-home') && videos.length > 0 && !append) renderChannelFeatured(videos[0]);
}

function renderSearchResults(videos, append = false) {
  const container = document.getElementById('search-results-list');
  if (!container) return;
  if (!append) container.innerHTML = '';
  videos.forEach(v => {
    const item = document.createElement('div'); item.className = 'search-result-item';
    const isLive = v.isLive || (v.title && (v.title.includes('ライブ')||v.title.includes('LIVE')||v.title.includes('配信')));
    const isArchived = v.isArchived||false, durStr = formatDuration(v.duration), dateStr = v.publishedTimestamp ? formatTimestamp(v.publishedTimestamp) : '';
    const channelSafe = v.channel.replace(/'/g,"\\'");
    item.onclick = () => playVideo(v.id, v.title, v.channel, v.authorThumb);
    item.innerHTML = `<div class="search-result-thumb"><img src="https://i.ytimg.com/vi/${v.id}/mqdefault.jpg" loading="lazy">${v.isLive?'<span class="live-thumb-badge">🔴 配信中</span>':isArchived?'<span class="archived-badge">📅 配信済み</span>':(durStr?`<span class="duration-badge">${durStr}</span>`:'')}</div><div class="search-result-info"><div class="search-result-title">${v.title}</div><div class="search-result-meta">${v.isLive?'<span style="color:#ff0000;font-weight:bold;">● ライブ配信中</span>':isArchived&&dateStr?`<span>${dateStr} 配信済み</span>`:(durStr?`<span>${durStr}</span>`:'')}${!v.isLive&&v.published?`<span>• ${v.published}</span>`:''}</div><div class="search-result-channel" onclick="event.stopPropagation(); openChannel('${channelSafe}','${v.authorThumb}')"><div class="search-result-channel-icon"><img src="${v.authorThumb}" loading="lazy"></div><span class="search-result-channel-name">${v.channel}</span></div></div>`;
    container.appendChild(item);
  });
  document.getElementById('search-loader')?.classList.add('hidden');
}

function renderChannelFeatured(v) {
  const el = document.getElementById('channel-featured-video');
  if (!el || !v) return;
  el.innerHTML = `<div class="channel-featured-video" onclick="playVideo('${v.id}','${v.title.replace(/'/g,"\\'")}','${v.channel.replace(/'/g,"\\'")}','${v.authorThumb}')"><div class="channel-featured-thumb"><img src="https://i.ytimg.com/vi/${v.id}/hqdefault.jpg"></div><div class="channel-featured-info"><div class="channel-featured-title">${v.title}</div><div style="font-size:13px;color:var(--text-secondary);margin-top:8px;">${v.channel}</div>${v.published?`<div style="font-size:12px;color:var(--text-secondary);">${v.published}</div>`:''}</div></div>`;
}

function renderChannelShorts(videos, append = false) {
  const grid = document.getElementById('channel-shorts-grid');
  if (!grid) return;
  if (!append) grid.innerHTML = '';
  if (videos.length === 0 && !append) { grid.innerHTML = '<div style="padding:24px;color:var(--text-secondary);">ショート動画が見つかりませんでした</div>'; document.getElementById('channel-shorts-loader')?.classList.add('hidden'); return; }
  const seen = new Set(Array.from(grid.querySelectorAll('[data-vid]')).map(el => el.dataset.vid));
  videos.forEach(v => {
    if (seen.has(v.id)) return; seen.add(v.id);
    const card = document.createElement('div'); card.className = 'channel-short-card'; card.dataset.vid = v.id;
    card.onclick = () => navigateToShortPage(v.id, v.title, v.channel, v.authorThumb);
    card.innerHTML = `<div class="channel-short-thumb"><img src="https://i.ytimg.com/vi/${v.id}/hqdefault.jpg" loading="lazy">${v.duration>0?`<span class="duration-badge">${formatDuration(v.duration)}</span>`:''}</div><div class="channel-short-title">${v.title}</div>`;
    grid.appendChild(card);
  });
  document.getElementById('channel-shorts-loader')?.classList.add('hidden');
}

function renderChannelLive(videos, append = false) {
  const container = document.getElementById('channel-live-grid');
  if (!container) return;
  if (!append) container.innerHTML = '';
  if (videos.length === 0 && !append) { container.innerHTML = '<div class="subs-empty">ライブ・配信動画が見つかりません</div>'; document.getElementById('channel-live-loader')?.classList.add('hidden'); return; }
  const sorted = [...videos].sort((a,b) => { const sA=a.isLive&&!a.isUpcoming?2:a.isUpcoming?1:0, sB=b.isLive&&!b.isUpcoming?2:b.isUpcoming?1:0; return sB-sA; });
  sorted.forEach(v => {
    const card = document.createElement('div'); card.className = 'video-card';
    const dateStr = v.publishedTimestamp ? formatTimestamp(v.publishedTimestamp) : '';
    card.onclick = () => playVideo(v.id, v.title, v.channel, v.authorThumb);
    card.innerHTML = `<div class="thumbnail-container"><img src="https://i.ytimg.com/vi/${v.id}/mqdefault.jpg">${v.isLive&&!v.isUpcoming?'<span class="live-thumb-badge">🔴 配信中</span>':v.isUpcoming?'<span class="live-thumb-badge" style="background:#1a73e8;">🕐 待機中</span>':`<span class="archived-badge">📅 配信済み${dateStr?' '+dateStr:''}</span>`}</div><div class="video-info"><div class="channel-avatar"><img src="${v.authorThumb||''}" onerror="this.src='https://i.pravatar.cc/40?u=${encodeURIComponent(v.channel)}'"></div><div class="video-details"><div class="video-title">${v.title}</div><div class="video-meta">${v.isLive&&!v.isUpcoming?'<span style="color:#ff0000;font-weight:bold;">● ライブ配信中</span>':v.isUpcoming?'<span style="color:#1a73e8;font-weight:bold;">⏰ 配信予定</span>':(dateStr?`<span>${dateStr} 配信済み</span>`:`<span>${v.published||''}</span>`)}</div></div></div>`;
    container.appendChild(card);
  });
  document.getElementById('channel-live-loader')?.classList.add('hidden');
}

let channelFilterMode = 'latest';
function setChannelFilter(btn, mode) {
  document.querySelectorAll('.channel-filter-chip').forEach(c => c.classList.remove('active')); btn.classList.add('active'); channelFilterMode = mode;
  const grid = document.getElementById('channel-grid'), cards = Array.from(grid.querySelectorAll('.video-card'));
  if (mode === 'popular') cards.sort(()=>Math.random()-0.5); else if (mode === 'oldest') cards.reverse();
  grid.innerHTML = ''; cards.forEach(c => grid.appendChild(c));
}

window.addEventListener('scroll', () => {
  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 1000 && !isFetching) {
    if (currentView === 'home' && getAppConfig().trend) { document.getElementById('home-loader').classList.remove('hidden'); triggerSearch(lastQuery||"人気",'trend',true); }
    else if (currentView === 'search') { document.getElementById('search-loader').classList.remove('hidden'); triggerSearch(lastQuery,'search',true); }
    else if (currentView === 'watch') { document.getElementById('related-loader').classList.remove('hidden'); triggerSearch(currentVideoTitle.substring(0,20),'related',true); }
    else if (currentView === 'channel' && currentChannelTab === 'videos') { document.getElementById('channel-loader').classList.remove('hidden'); triggerSearch(lastQuery,'channel-videos',true); }
  }
});

document.addEventListener('DOMContentLoaded', () => {
  const sfp = document.getElementById('shorts-full-page');
  if (sfp) {
    sfp.addEventListener('scroll', () => {
      if (sfp.scrollTop + sfp.clientHeight >= sfp.scrollHeight - 400 && !isFetching) {
        document.getElementById('shorts-loader').classList.remove('hidden');
        triggerSearch("#shorts",'shorts',true);
      }
    });
  }
});

function loadTrend() { triggerSearch("人気 日本",'trend'); }
function handleWelcomeSearch(e) {
  e.preventDefault(); const q = document.getElementById('welcome-search-input').value;
  if(!q) return; document.getElementById('search-input').value = q; saveSettings(); handleSearch(e, q);
}
function handleCategorySearch(cat, btn) {
  document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active')); btn.classList.add('active');
  let query = cat === 'すべて' ? '人気' : cat;
  document.getElementById('search-input').value = cat === 'すべて' ? '' : cat;
  navigate('search');
  document.getElementById('search-shorts-section').classList.add('hidden');
  document.getElementById('search-shorts-container').innerHTML = '';
  document.getElementById('search-results-list').innerHTML = '';
  triggerSearch(query,'search');
  if (cat !== 'すべて') fetchShortsForSearch(query);
}
function handleSearch(e, externalQuery = null) {
  if(e) e.preventDefault();
  const q = externalQuery || document.getElementById('search-input').value;
  if(!q) return;
  saveSearchHistory(q); lastQuery = q;
  document.getElementById('search-shorts-section').classList.add('hidden');
  document.getElementById('search-shorts-container').innerHTML = '';
  document.getElementById('search-results-list').innerHTML = '';
  try { history.pushState({ view: 'search', query: q }, '', `/search?q=${encodeURIComponent(q)}`); } catch(e) {}
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-search')?.classList.add('active');
  document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
  document.getElementById('categories-bar').style.display = 'flex';
  document.getElementById('main-content').style.padding = '24px';
  document.getElementById('main-content').style.marginTop = '112px';
  currentView = 'search';
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('main-content').classList.remove('sidebar-open');
  triggerSearch(q,'search');
}

let currentChannelData = { name: '', thumb: '' };
function openChannel(channelName, thumb = null) {
  currentChannelData = { name: channelName, thumb: thumb || `https://i.pravatar.cc/150?u=${channelName}` };
  currentChannelId = null;
  navigate('channel');
  document.getElementById('channel-page-name').innerText = channelName;
  document.getElementById('channel-page-handle').innerText = `@${channelName.toLowerCase().replace(/\s/g,'')}`;
  document.getElementById('channel-page-meta').innerText = `登録者数 -- • 動画 --件`;
  const iconEl = document.getElementById('channel-page-icon');
  iconEl.src = currentChannelData.thumb;
  iconEl.onerror = () => { iconEl.src = `https://i.pravatar.cc/150?u=${encodeURIComponent(channelName)}`; };
  const canvas = document.getElementById('channel-banner-canvas'), bannerImg = document.getElementById('channel-banner-img');
  bannerImg.style.display='none'; canvas.style.display='block';
  setTimeout(() => drawFallbackBanner(canvas), 50);
  updateChannelSubscribeUI(channelName);
  currentChannelShortsPage = 1;
  fetchChannelInfoFromInvidious(channelName).then(info => {
    if (!info) return;
    if (info.authorId) { currentChannelId = info.authorId; document.getElementById('channel-page-handle').innerText = `@${info.authorId}`; }
    if (info.subCount) document.getElementById('channel-page-meta').innerText = `登録者数 ${formatSubCount(info.subCount)} • 動画 ${info.videoCount||'--'}件`;
    if (info.authorThumbnails?.length > 0) iconEl.src = info.authorThumbnails[info.authorThumbnails.length-1].url;
    if (info.authorBanners?.length > 0) {
      const best = info.authorBanners.reduce((b,c) => (!b||(c.width||0)>(b.width||0))?c:b, null);
      if (best?.url) drawChannelBanner(best.url);
    }
  }).catch(()=>{});
  switchChannelTab('home');
}

function switchChannelTab(tab) {
  currentChannelTab = tab;
  ['home','shorts','videos','live'].forEach(t => {
    document.getElementById(`ch-tab-${t}`)?.classList.toggle('active', t===tab);
    const tabContent = document.getElementById(`channel-tab-${t}`);
    if (tabContent) tabContent.style.display = t===tab ? 'block' : 'none';
  });
  const name = currentChannelData.name; lastQuery = name;
  if (tab==='home') { document.getElementById('channel-home-grid').innerHTML=''; document.getElementById('channel-featured-video').innerHTML=''; triggerSearch(name,'channel-home'); }
  else if (tab==='shorts') { document.getElementById('channel-shorts-grid').innerHTML=''; document.getElementById('channel-shorts-loader').classList.remove('hidden'); currentChannelShortsPage=1; triggerSearch(name,'channel-shorts'); }
  else if (tab==='videos') { document.getElementById('channel-grid').innerHTML=''; document.getElementById('channel-loader').classList.remove('hidden'); triggerSearch(name,'channel-videos'); }
  else if (tab==='live') { document.getElementById('channel-live-grid').innerHTML=''; document.getElementById('channel-live-loader').classList.remove('hidden'); triggerSearch(name,'channel-live'); }
}

// =================== 動画再生 ===================
async function playVideo(id, title, channel = "投稿者", thumb = null) {
  currentVideoId = id; currentVideoTitle = title;
  currentChannelName = channel; currentChannelThumb = thumb || `https://i.pravatar.cc/150?u=${channel}`;
  currentGVFormats = null; currentGVAllFormats = null; selectedQuality = null;
  navigate('watch', { videoId: id, title, channel, thumb: thumb||null });
  document.getElementById('watch-title-text').innerText = title;
  document.getElementById('watch-channel-name').innerText = channel;
  const wci = document.getElementById('watch-channel-icon');
  wci.src = currentChannelThumb; wci.onerror = () => wci.src = `https://i.pravatar.cc/150?u=${encodeURIComponent(channel)}`;
  document.getElementById('watch-channel-trigger').onclick = () => openChannel(channel, currentChannelThumb);
  document.getElementById('related-videos').innerHTML = '';
  document.getElementById('api-views').innerText = "---"; document.getElementById('api-likes').innerText = "---";
  document.getElementById('api-date').innerText = ""; document.getElementById('api-desc').innerHTML = "概要欄を読み込んでいます...";
  document.getElementById('quality-wrap').style.display = 'none';
  updateWatchSubscribeUI(channel);
  setTimeout(() => switchStream(getAppConfig().stream), 50);
  saveToLocal('history', { id, title });
  triggerSearch(title.substring(0,20),'related'); fetchComments(id); fetchVideoApiDetails(id);
}

function toggleDescription() {
  const desc = document.getElementById('api-desc'); desc.classList.toggle('expanded');
  document.getElementById('desc-toggle-text').innerText = desc.classList.contains('expanded') ? "一部を表示" : "続きを読む";
}

async function fetchVideoApiDetails(videoId) {
  try {
    const res = await fetch(buildFetchUrl(`https://api.aijimy.com/get?code=get-youtube-videodata&text=${videoId}`));
    const t = await res.text();
    const views=(t.match(/再生回数:\s*(\d+)/)||[])[1], likes=(t.match(/高評価数:\s*(\d+)/)||[])[1];
    const date=(t.match(/公開日:\s*(.*?)\s*再生回数:/)||[])[1], des=(t.match(/概要欄:\s*([\s\S]*?)\s*公開日:/)||[])[1];
    document.getElementById('api-views').innerText = views ? parseInt(views).toLocaleString() : "---";
    document.getElementById('api-likes').innerText = likes ? parseInt(likes).toLocaleString() : "---";
    if(date) document.getElementById('api-date').innerText = ` • ${date.trim()}`;
    document.getElementById('api-desc').innerHTML = des ? des.trim().replace(/\n/g,'<br>') : "概要はありません。";
  } catch(e) { document.getElementById('api-desc').innerText = "取得失敗"; }
}

async function fetchKahootKey() {
  try { const res = await fetch(buildFetchUrl(KAHOOT_KEY_URL)); if(res.ok) { const data = await res.json(); return data.key||data.enc||data; } } catch(e) {}
  return null;
}

function buildEduUrl(videoId, enc) {
  return `https://www.youtubeeducation.com/embed/${videoId}?autoplay=1&origin=https%3A%2F%2Fcreate.kahoot.it&embed_config=${encodeURIComponent(JSON.stringify({enc,hideTitle:true}))}`;
}

async function switchStream(type) {
  [1,2,3].forEach(i => { document.getElementById(`btn-stream-${i}`)?.classList.toggle('active', type===i); });
  document.getElementById('quality-wrap').style.display = 'none';
  currentGVFormats = null; currentGVAllFormats = null;
  const wrapper = document.getElementById('player-wrapper');
  if (type === 1) {
    wrapper.innerHTML = '<iframe id="yt-player" allow="autoplay; fullscreen" allowfullscreen></iframe>';
    await new Promise(r=>setTimeout(r,80));
    const iframe = document.getElementById('yt-player');
    if (iframe) iframe.src = `https://www.youtube-nocookie.com/embed/${currentVideoId}?autoplay=1&rel=0&start=0`;
  } else if (type === 2) {
    wrapper.innerHTML = '<iframe id="yt-player" allow="autoplay; fullscreen" allowfullscreen></iframe>';
    const key = await fetchKahootKey();
    if(key) { await new Promise(r=>setTimeout(r,80)); const iframe=document.getElementById('yt-player'); if(iframe) iframe.src=buildEduUrl(currentVideoId,key); }
    else { alert("Edu準備中"); switchStream(1); }
  } else if (type === 3) {
    await setupWatchManifest(currentVideoId);
  }
}

function renderRelatedVideos(videos, append = false) {
  const container = document.getElementById('related-videos');
  const html = videos.map(v => `<div class="related-video" onclick="playVideo('${v.id}','${v.title.replace(/'/g,"\\'")}','${v.channel.replace(/'/g,"\\'")}')"><div class="related-thumb"><img src="https://i.ytimg.com/vi/${v.id}/mqdefault.jpg">${v.isLive?'<span class="live-thumb-badge">🔴</span>':v.isArchived?'<span class="archived-badge">配信済</span>':''}</div><div class="related-info"><div class="related-title">${v.title}</div><div style="font-size:12px;color:var(--text-secondary);">${v.channel}</div></div></div>`).join('');
  if (append) container.insertAdjacentHTML('beforeend',html); else container.innerHTML=html;
  document.getElementById('related-loader').classList.add('hidden');
}

// =================== ナビゲーション ===================
function navigate(viewName, opts = {}) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(`view-${viewName}`)?.classList.add('active');
  document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
  document.getElementById(`nav-${viewName}`)?.classList.add('active');
  const showCats = ['home','search','history','subscriptions'].includes(viewName);
  document.getElementById('categories-bar').style.display = showCats ? 'flex' : 'none';
  if (viewName === 'shorts') {
    document.getElementById('main-content').style.padding = '0';
    document.getElementById('main-content').style.marginTop = '56px';
  } else {
    document.getElementById('main-content').style.padding = '24px';
    document.getElementById('main-content').style.marginTop = showCats ? '112px' : '56px';
  }
  currentView = viewName;
  if (viewName !== 'watch') {
    const wrapper = document.getElementById('player-wrapper');
    if(wrapper) wrapper.innerHTML = '<iframe id="yt-player" allow="autoplay; fullscreen" allowfullscreen></iframe>';
    currentGVFormats = null; currentGVAllFormats = null;
  }
  if (viewName !== 'shorts') {
    document.querySelectorAll('#shorts-container .short-snap-item').forEach(item => {
      const iframe = item.querySelector('iframe'); if(iframe) iframe.src='about:blank';
      item.querySelectorAll('video, audio').forEach(el => { el.pause(); el.src=''; });
    });
    if (shortObserver) { shortObserver.disconnect(); shortObserver=null; }
  }
  if (viewName === 'shorts' && document.getElementById('shorts-container').children.length === 0) {
    document.getElementById('shorts-loader').classList.remove('hidden');
    Object.keys(shortSrcMap).forEach(k => delete shortSrcMap[k]);
    shortStreamType = getAppConfig().shortStream || 1;
    triggerSearch("#shorts 人気",'shorts');
  }
  if (viewName === 'history') renderLocalList('history');
  if (viewName === 'settings') { renderSettingsSubsList(); syncSettings(getAppConfig()); }
  if (viewName === 'subscriptions') renderSubscriptionsPage();
  window.scrollTo(0,0);
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('main-content').classList.remove('sidebar-open');
  if (!opts.noHistory) {
    let url = '/';
    if (viewName==='home') url='/home';
    else if (viewName==='history') url='/feed/history';
    else if (viewName==='settings') url='/setting';
    else if (viewName==='subscriptions') url='/feed/subscriptions';
    else if (viewName==='search') url=lastQuery?`/search?q=${encodeURIComponent(lastQuery)}`:'/search';
    else if (viewName==='channel') url=currentChannelId?`/channel/${currentChannelId}`:'/channel';
    else if (viewName==='welcome') url='/';
    else if (viewName==='watch'&&opts.videoId) url=`/watch?v=${opts.videoId}`;
    else if (viewName==='shorts'&&opts.videoId) url=`/shorts/${opts.videoId}`;
    else if (viewName==='shorts') url='/shorts';
    try { history.pushState({ view: viewName, ...opts }, '', url); } catch(e) {}
  }
}

window.addEventListener('popstate', (e) => {
  if (!e.state) { navigate('home',{noHistory:true}); return; }
  const { view, videoId, title, channel, thumb, query, channelName } = e.state;
  if (view==='watch'&&videoId) playVideo(videoId,title||'',channel||'',thumb||null);
  else if (view==='shorts'&&videoId) navigateToShortPage(videoId,title,channel,thumb,true);
  else if (view==='channel') { if(channelName) openChannel(channelName,null); else navigate('channel',{noHistory:true}); }
  else if (view==='search') {
    const searchQ = query || new URLSearchParams(location.search).get('q') || '';
    if (searchQ) { document.getElementById('search-input').value=searchQ; navigate('search',{noHistory:true}); triggerSearch(searchQ,'search'); }
    else navigate('search',{noHistory:true});
  }
  else if (view) navigate(view,{noHistory:true});
});

function parseInitialUrl() {
  const path = location.pathname + location.search;
  const watchMatch = path.match(/\/watch\?v=([a-zA-Z0-9_-]{11})/);
  const shortsMatch = path.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
  const searchMatch = path.match(/\/search\?q=(.+)/);
  const channelMatch = path.match(/\/channel\/([a-zA-Z0-9_@-]+)/);
  if (watchMatch) return { view:'watch', videoId:watchMatch[1] };
  if (shortsMatch) return { view:'shorts', videoId:shortsMatch[1] };
  if (searchMatch) return { view:'search', query:decodeURIComponent(searchMatch[1]) };
  if (channelMatch) return { view:'channel', channelId:channelMatch[1] };
  if (path==='/feed/history') return { view:'history' };
  if (path==='/setting'||path==='/settings') return { view:'settings' };
  if (path==='/feed/subscriptions') return { view:'subscriptions' };
  return null;
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('main-content').classList.toggle('sidebar-open');
}

function saveToLocal(key, video) {
  let list = JSON.parse(localStorage.getItem(key) || '[]');
  list = list.filter(v => v.id !== video.id); list.unshift(video);
  localStorage.setItem(key, JSON.stringify(list.slice(0,50)));
}

function renderLocalList(type) {
  document.getElementById(`${type}-grid`).innerHTML = JSON.parse(localStorage.getItem(type)||'[]').map(v => `<div class="video-card" onclick="playVideo('${v.id}','${v.title.replace(/'/g,"\\'")}','YouTube Channel')"><div class="thumbnail-container"><img src="https://i.ytimg.com/vi/${v.id}/mqdefault.jpg"></div><div class="video-details" style="padding:10px;"><div class="video-title">${v.title}</div></div></div>`).join('');
}

async function fetchComments(videoId) {
  const container = document.getElementById('comments-container');
  container.innerHTML = '<div class="loader">コメントを読み込み中...</div>';
  let comments = null;
  const apis = [`https://inv.nadeko.net/api/v1/comments/${videoId}`, ...INVIDIOUS_INSTANCES.slice(0,6).map(i=>`${i}/api/v1/comments/${videoId}`)];
  for (const url of apis) {
    try { const res=await fetch(url,{signal:AbortSignal.timeout(6000)}); if(!res.ok) continue; const data=await res.json(); if(data.comments?.length>0){comments=data.comments.map(c=>({author:c.author||'名無し',content:c.content||c.contentHtml?.replace(/<[^>]+>/g,'')||'',avatar:c.authorThumbnails?.[c.authorThumbnails.length-1]?.url||'',likes:c.likeCount||0})); break;} } catch(e) {}
  }
  if (!comments?.length) { container.innerHTML='<div style="color:var(--text-secondary);padding:8px;">コメントを読み込めませんでした。</div>'; document.getElementById('comment-count').innerText='0'; return; }
  document.getElementById('comment-count').innerText = comments.length;
  container.innerHTML = comments.slice(0,20).map(c => `<div class="comment"><img class="comment-avatar" src="${c.avatar}" onerror="this.src='https://i.pravatar.cc/40?u=${encodeURIComponent(c.author)}'"><div class="comment-body"><div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;"><span style="font-weight:bold;font-size:13px;">${c.author}</span>${c.likes>0?`<span style="font-size:12px;color:var(--text-secondary);">👍 ${c.likes.toLocaleString()}</span>`:''}</div><div style="font-size:14px;line-height:1.5;">${(c.content||'').replace(/\n/g,'<br>')}</div></div></div>`).join('');
}

// =================== ショートUIヘルパー ===================
function toggleShortLike(btn) {
  const icon=btn.querySelector('.icon'), span=btn.querySelector('.short-like-count'), isLiked=btn.dataset.liked==='1';
  btn.dataset.liked=isLiked?'0':'1'; icon.style.color=isLiked?'':'#ff0000';
  if(span){const cur=parseInt(span.textContent.replace(/[^0-9]/g,''))||0, newVal=isLiked?Math.max(0,cur-1):cur+1; span.textContent=newVal>=10000?(newVal/1000).toFixed(0)+'K':newVal.toLocaleString();}
}
function toggleShortDislike(btn) {
  const icon=btn.querySelector('.icon'), isD=btn.dataset.disliked==='1';
  btn.dataset.disliked=isD?'0':'1'; icon.style.color=isD?'':'#aaa';
}
async function openShortComments(videoId) {
  const panel=document.getElementById(`short-comments-panel-${videoId}`);
  if(!panel) return; panel.style.display='block';
  const content=document.getElementById(`short-comments-content-${videoId}`);
  if(content.dataset.loaded==='1') return;
  content.innerHTML='<div class="loader">読み込み中...</div>'; content.dataset.loaded='1';
  let comments=[];
  for(const url of [`https://inv.nadeko.net/api/v1/comments/${videoId}`,...INVIDIOUS_INSTANCES.slice(0,4).map(i=>`${i}/api/v1/comments/${videoId}`)]) {
    try{const res=await fetch(url,{signal:AbortSignal.timeout(6000)});if(!res.ok) continue;const data=await res.json();if(data.comments?.length>0){comments=data.comments;break;}}catch(e){}
  }
  if(!comments.length){content.innerHTML='<div style="color:var(--text-secondary);padding:8px;">コメントを読み込めませんでした。</div>';return;}
  content.innerHTML=comments.slice(0,15).map(c=>`<div style="display:flex;gap:10px;margin-bottom:14px;"><img src="${c.authorThumbnails?.[0]?.url||''}" style="width:36px;height:36px;border-radius:50%;flex-shrink:0;background:#eee;" onerror="this.src='https://i.pravatar.cc/36?u=${encodeURIComponent(c.author||'')}'"><div><div style="font-weight:bold;font-size:12px;margin-bottom:3px;">${c.author||'名無し'}</div><div style="font-size:13px;line-height:1.4;">${(c.content||'').replace(/\n/g,'<br>')}</div></div></div>`).join('');
}
function closeShortComments(videoId) { const p=document.getElementById(`short-comments-panel-${videoId}`); if(p) p.style.display='none'; }
function toggleSubscribeFromShort(channelName, thumb, btn) {
  let subs=getSubscriptions();
  if(isSubscribed(channelName)){subs=subs.filter(s=>s.name!==channelName);btn.textContent='登録';btn.classList.remove('subscribed');}
  else{subs.unshift({name:channelName,thumb,isLive:false});btn.textContent='登録済み';btn.classList.add('subscribed');}
  saveSubscriptions(subs); renderSidebarSubscriptions();
}