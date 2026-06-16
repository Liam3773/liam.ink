/* ═══════════════════════════════════════════════════════════════
   liam.ink — script.js
   • Entry screen + audio
   • Procedural neon city background (canvas)
   • White sparkle cursor trail (canvas)
   • Lanyard (Discord presence + Spotify)
   • View counter (CountAPI)
═══════════════════════════════════════════════════════════════ */

'use strict';

const DISCORD_ID = '901167156383854663';

/* ─── DOM REFS ──────────────────────────────────────────────────── */
const $ = id => document.getElementById(id);
const entryScreen  = $('entry-screen');
const enterBtn     = $('enter-btn');
const mainContent  = $('main-content');
const bgMusic      = $('bg-music');
const musicBtn     = $('music-btn');
const musicPlay    = $('music-icon-play');
const musicMute    = $('music-icon-mute');
const statusDot    = $('status-dot');
const statusLabel  = $('status-label');
const spotifyBlock = $('spotify-block');
const spotifyArt   = $('spotify-art');
const spotifySong  = $('spotify-song');
const spotifyArtist = $('spotify-artist');
const spotifyProg  = $('spotify-progress');
const viewCount    = $('view-count');
const cityCanvas   = $('city-canvas');
const cursorCanvas = $('cursor-canvas');

/* ══════════════════════════════════════════════════════════════════
   CITY BACKGROUND
══════════════════════════════════════════════════════════════════ */
const cityCtx = cityCanvas.getContext('2d');

let cityW, cityH;
let buildings = [];
let stars     = [];
let fogLayers = [];
let scanline  = 0;
let cityReady = false;

const NEON_COLORS = [
  '#9b3dff','#c084fc','#38bdf8','#818cf8','#f472b6','#34d399'
];

function rand(min, max) { return Math.random() * (max - min) + min; }
function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function resizeCity() {
  cityW = cityCanvas.width  = window.innerWidth;
  cityH = cityCanvas.height = window.innerHeight;
  buildScene();
}

function buildScene() {
  /* Stars */
  stars = Array.from({ length: 180 }, () => ({
    x:   rand(0, cityW),
    y:   rand(0, cityH * 0.55),
    r:   rand(0.4, 1.4),
    a:   rand(0.3, 1),
    twinkle: rand(0, Math.PI * 2)
  }));

  /* Buildings — back to front in layers */
  buildings = [];

  // Far layer: tiny dark towers
  for (let i = 0; i < 30; i++) {
    const w = rand(18, 50);
    const h = rand(cityH * 0.10, cityH * 0.28);
    buildings.push({
      x: rand(0, cityW),
      y: cityH - h,
      w, h,
      layer: 0,
      color: '#0d0520',
      windows: buildWindows(w, h, 0.08),
      neonEdge: null
    });
  }

  // Mid layer: medium purple/dark buildings
  for (let i = 0; i < 22; i++) {
    const w = rand(35, 80);
    const h = rand(cityH * 0.20, cityH * 0.48);
    const neon = Math.random() > 0.55 ? pick(NEON_COLORS) : null;
    buildings.push({
      x: rand(-10, cityW + 10),
      y: cityH - h,
      w, h,
      layer: 1,
      color: '#120730',
      windows: buildWindows(w, h, 0.15),
      neonEdge: neon
    });
  }

  // Front layer: large silhouettes
  for (let i = 0; i < 14; i++) {
    const w = rand(55, 130);
    const h = rand(cityH * 0.32, cityH * 0.62);
    const neon = Math.random() > 0.4 ? pick(NEON_COLORS) : null;
    buildings.push({
      x: rand(-20, cityW + 20),
      y: cityH - h,
      w, h,
      layer: 2,
      color: '#08021a',
      windows: buildWindows(w, h, 0.22),
      neonEdge: neon
    });
  }

  /* Sort back → front */
  buildings.sort((a, b) => a.layer - b.layer);

  /* Fog particles */
  fogLayers = Array.from({ length: 6 }, (_, i) => ({
    x: rand(0, cityW),
    y: rand(cityH * 0.4, cityH * 0.85),
    w: rand(200, 500),
    h: rand(40, 100),
    speed: rand(0.1, 0.4) * (i % 2 === 0 ? 1 : -1),
    a: rand(0.02, 0.07)
  }));
}

function buildWindows(bW, bH, density) {
  const wins = [];
  const cols = Math.floor(bW / 8);
  const rows = Math.floor(bH / 10);
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      if (Math.random() < density) {
        wins.push({
          cx: 4 + c * 8,
          cy: 4 + r * 10,
          lit: Math.random() > 0.4,
          color: pick(['#ffe8a0','#c4b0ff','#87d4ff','#ffffff']),
          blink: Math.random() > 0.92,
          blinkPhase: rand(0, Math.PI * 2)
        });
      }
    }
  }
  return wins;
}

let cityTick = 0;
function drawCity(ts) {
  cityTick = ts * 0.001;
  cityCtx.clearRect(0, 0, cityW, cityH);

  /* Sky gradient */
  const sky = cityCtx.createLinearGradient(0, 0, 0, cityH * 0.75);
  sky.addColorStop(0,   '#06000f');
  sky.addColorStop(0.5, '#0e0128');
  sky.addColorStop(1,   '#18053a');
  cityCtx.fillStyle = sky;
  cityCtx.fillRect(0, 0, cityW, cityH);

  /* Horizon glow */
  const hGlow = cityCtx.createLinearGradient(0, cityH * 0.55, 0, cityH * 0.75);
  hGlow.addColorStop(0, 'rgba(155,61,255,0.0)');
  hGlow.addColorStop(1, 'rgba(155,61,255,0.22)');
  cityCtx.fillStyle = hGlow;
  cityCtx.fillRect(0, cityH * 0.55, cityW, cityH * 0.2);

  /* Stars */
  stars.forEach(s => {
    const twinkle = 0.5 + 0.5 * Math.sin(cityTick * 1.5 + s.twinkle);
    cityCtx.globalAlpha = s.a * twinkle;
    cityCtx.fillStyle = '#fff';
    cityCtx.beginPath();
    cityCtx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    cityCtx.fill();
  });
  cityCtx.globalAlpha = 1;

  /* Buildings */
  buildings.forEach(b => drawBuilding(b));

  /* Ground reflection strip */
  const gRef = cityCtx.createLinearGradient(0, cityH * 0.92, 0, cityH);
  gRef.addColorStop(0, 'rgba(155,61,255,0.1)');
  gRef.addColorStop(1, 'rgba(0,0,0,0.6)');
  cityCtx.fillStyle = gRef;
  cityCtx.fillRect(0, cityH * 0.92, cityW, cityH * 0.08);

  /* Fog */
  fogLayers.forEach(f => {
    f.x += f.speed;
    if (f.x > cityW + f.w / 2)  f.x = -f.w / 2;
    if (f.x < -f.w / 2) f.x = cityW + f.w / 2;

    const fog = cityCtx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.w / 2);
    fog.addColorStop(0, `rgba(180,120,255,${f.a})`);
    fog.addColorStop(1, 'rgba(0,0,0,0)');
    cityCtx.fillStyle = fog;
    cityCtx.fillRect(f.x - f.w / 2, f.y - f.h / 2, f.w, f.h);
  });

  /* Scanline overlay */
  scanline = (scanline + 0.5) % cityH;
  cityCtx.fillStyle = 'rgba(155,61,255,0.03)';
  for (let y = 0; y < cityH; y += 3) {
    cityCtx.fillRect(0, y, cityW, 1);
  }

  /* Vignette */
  const vig = cityCtx.createRadialGradient(cityW/2, cityH/2, cityH*0.2, cityW/2, cityH/2, cityH*0.85);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.65)');
  cityCtx.fillStyle = vig;
  cityCtx.fillRect(0, 0, cityW, cityH);
}

function drawBuilding(b) {
  /* Body */
  cityCtx.fillStyle = b.color;
  cityCtx.fillRect(b.x, b.y, b.w, b.h);

  /* Windows */
  b.windows.forEach(w => {
    let lit = w.lit;
    if (w.blink) lit = lit && (Math.sin(cityTick * 2 + w.blinkPhase) > 0);
    if (!lit) return;
    cityCtx.globalAlpha = 0.55 + 0.2 * Math.sin(cityTick + w.blinkPhase);
    cityCtx.fillStyle = w.color;
    cityCtx.fillRect(b.x + w.cx - 2, b.y + w.cy - 2, 4, 4);
  });
  cityCtx.globalAlpha = 1;

  /* Neon edge glow */
  if (b.neonEdge) {
    cityCtx.save();
    cityCtx.shadowColor = b.neonEdge;
    cityCtx.shadowBlur  = 10 + 5 * Math.sin(cityTick * 0.8);
    cityCtx.strokeStyle = b.neonEdge;
    cityCtx.lineWidth   = 1.5;
    cityCtx.globalAlpha = 0.6 + 0.2 * Math.sin(cityTick * 0.6);
    cityCtx.strokeRect(b.x, b.y, b.w, b.h);
    cityCtx.restore();
  }
}

/* ══════════════════════════════════════════════════════════════════
   CURSOR SPARKLE TRAIL
══════════════════════════════════════════════════════════════════ */
const curCtx    = cursorCanvas.getContext('2d');
let curW, curH;
let particles   = [];
let mouseX = -999, mouseY = -999;

function resizeCursor() {
  curW = cursorCanvas.width  = window.innerWidth;
  curH = cursorCanvas.height = window.innerHeight;
}

document.addEventListener('mousemove', e => {
  mouseX = e.clientX;
  mouseY = e.clientY;
  spawnSparkles(mouseX, mouseY);
});

function spawnSparkles(x, y) {
  const count = 3;
  for (let i = 0; i < count; i++) {
    const angle = rand(0, Math.PI * 2);
    const speed = rand(0.4, 2.2);
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - rand(0.5, 1.5),
      life: 1,
      decay: rand(0.025, 0.06),
      r: rand(1, 3),
      shape: Math.random() > 0.5 ? 'circle' : 'star'
    });
  }
}

function drawParticle(p) {
  const alpha = p.life;
  curCtx.globalAlpha = alpha;
  curCtx.fillStyle = `rgba(255,255,255,${alpha})`;

  if (p.shape === 'circle') {
    curCtx.beginPath();
    curCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    curCtx.fill();
  } else {
    /* 4-pointed star */
    const s = p.r * 1.4;
    curCtx.beginPath();
    curCtx.moveTo(p.x,     p.y - s);
    curCtx.lineTo(p.x + s*0.3, p.y - s*0.3);
    curCtx.lineTo(p.x + s, p.y);
    curCtx.lineTo(p.x + s*0.3, p.y + s*0.3);
    curCtx.lineTo(p.x,     p.y + s);
    curCtx.lineTo(p.x - s*0.3, p.y + s*0.3);
    curCtx.lineTo(p.x - s, p.y);
    curCtx.lineTo(p.x - s*0.3, p.y - s*0.3);
    curCtx.closePath();
    curCtx.fill();
  }
}

function drawCursor(ts) {
  curCtx.clearRect(0, 0, curW, curH);

  /* Update + draw particles */
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x   += p.vx;
    p.y   += p.vy;
    p.vy  += 0.06; /* gravity */
    p.life -= p.decay;
    if (p.life <= 0) { particles.splice(i, 1); continue; }
    drawParticle(p);
  }
  curCtx.globalAlpha = 1;

  /* Custom cursor dot */
  if (mouseX > -900) {
    curCtx.fillStyle = '#fff';
    curCtx.shadowColor = 'rgba(200,180,255,0.9)';
    curCtx.shadowBlur  = 8;
    curCtx.beginPath();
    curCtx.arc(mouseX, mouseY, 3.5, 0, Math.PI * 2);
    curCtx.fill();
    curCtx.shadowBlur = 0;
  }
}

/* ══════════════════════════════════════════════════════════════════
   MAIN LOOP
══════════════════════════════════════════════════════════════════ */
function loop(ts) {
  drawCity(ts);
  drawCursor(ts);
  requestAnimationFrame(loop);
}

/* ══════════════════════════════════════════════════════════════════
   ENTRY SCREEN
══════════════════════════════════════════════════════════════════ */
enterBtn.addEventListener('click', () => {
  entryScreen.style.opacity = '0';
  setTimeout(() => {
    entryScreen.style.display = 'none';
    mainContent.classList.remove('hidden');
  }, 800);

  bgMusic.volume = 0.45;
  bgMusic.play().catch(() => {});

  initLanyard();
  fetchViews();
});

/* ══════════════════════════════════════════════════════════════════
   MUSIC TOGGLE
══════════════════════════════════════════════════════════════════ */
let musicPlaying = true;
musicBtn.addEventListener('click', () => {
  if (musicPlaying) {
    bgMusic.pause();
    musicPlay.classList.add('hidden');
    musicMute.classList.remove('hidden');
  } else {
    bgMusic.play().catch(() => {});
    musicMute.classList.add('hidden');
    musicPlay.classList.remove('hidden');
  }
  musicPlaying = !musicPlaying;
});

/* ══════════════════════════════════════════════════════════════════
   LANYARD — DISCORD PRESENCE
══════════════════════════════════════════════════════════════════ */
const STATUS_MAP = {
  online:  ['online',  'online'],
  idle:    ['idle',    'idle'],
  dnd:     ['dnd',     'do not disturb'],
  offline: ['offline', 'offline']
};

function setDiscordStatus(status) {
  const [cls, label] = STATUS_MAP[status] || STATUS_MAP.offline;
  statusDot.className = `status-dot ${cls}`;
  statusLabel.textContent = label;
}

let spotifyStart = 0, spotifyEnd = 0;
let spotifyTimer = null;

function updateSpotify(spotify) {
  if (!spotify) {
    spotifyBlock.classList.add('hidden');
    if (spotifyTimer) clearInterval(spotifyTimer);
    return;
  }

  spotifyBlock.classList.remove('hidden');
  spotifySong.textContent   = spotify.song   || '—';
  spotifyArtist.textContent = spotify.artist || '—';

  if (spotify.album_art_url) {
    spotifyArt.src = spotify.album_art_url;
    spotifyArt.alt = `${spotify.album} album art`;
  }

  /* Progress bar */
  if (spotify.timestamps) {
    spotifyStart = spotify.timestamps.start;
    spotifyEnd   = spotify.timestamps.end;
    if (spotifyTimer) clearInterval(spotifyTimer);
    spotifyTimer = setInterval(() => {
      const now  = Date.now();
      const pct  = Math.min(100, ((now - spotifyStart) / (spotifyEnd - spotifyStart)) * 100);
      spotifyProg.style.width = pct + '%';
      if (pct >= 100) clearInterval(spotifyTimer);
    }, 1000);
  }
}

function fetchLanyard() {
  fetch(`https://api.lanyard.rest/v1/users/${DISCORD_ID}`)
    .then(r => r.json())
    .then(data => {
      if (!data.success) return;
      const d = data.data;
      setDiscordStatus(d.discord_status || 'offline');
      updateSpotify(d.listening_to_spotify ? d.spotify : null);
    })
    .catch(() => setDiscordStatus('offline'));
}

function initLanyard() {
  fetchLanyard();
  setInterval(fetchLanyard, 30000); /* refresh every 30 s */

  /* Also try WebSocket for live updates */
  try {
    const ws = new WebSocket('wss://api.lanyard.rest/socket');
    ws.addEventListener('open', () => {
      ws.send(JSON.stringify({ op: 2, d: { subscribe_to_id: DISCORD_ID } }));
    });
    ws.addEventListener('message', e => {
      const msg = JSON.parse(e.data);
      if (msg.t === 'INIT_STATE' || msg.t === 'PRESENCE_UPDATE') {
        const d = msg.d;
        setDiscordStatus(d.discord_status || 'offline');
        updateSpotify(d.listening_to_spotify ? d.spotify : null);
      }
      /* Heartbeat */
      if (msg.op === 1) {
        setInterval(() => ws.send(JSON.stringify({ op: 3 })), msg.d.heartbeat_interval);
      }
    });
    ws.addEventListener('error', () => {}); /* silent fallback to polling */
  } catch (_) {}
}

/* ══════════════════════════════════════════════════════════════════
   VIEW COUNTER
══════════════════════════════════════════════════════════════════ */
function fetchViews() {
  /* Using api.counterapi.dev (CountAPI successor) */
  fetch('https://api.counterapi.dev/v1/liamink/visits/up')
    .then(r => r.json())
    .then(data => {
      if (data && data.count != null) {
        viewCount.textContent = Number(data.count).toLocaleString();
      }
    })
    .catch(() => {
      /* Silent fail — counter not critical */
      viewCount.textContent = '—';
    });
}

/* ══════════════════════════════════════════════════════════════════
   RESIZE
══════════════════════════════════════════════════════════════════ */
window.addEventListener('resize', () => {
  resizeCity();
  resizeCursor();
});

/* ══════════════════════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════════════════════ */
resizeCity();
resizeCursor();
requestAnimationFrame(loop);