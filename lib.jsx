/* ============================================================
   DoomInfo lib — constants, helpers, storage, tier system
   ============================================================ */

// ----- IWAD list (fixed) -----
const IWADS = ['Doom', 'Doom 2', 'Plutonia', 'TNT'];

// ----- Default tier lists (canonical keys) -----
// Top-tier first. Point values from the original DoomRanking spreadsheet (Tables sheet).
const QUALITY_TIER_POINTS = {
  'GOAT': 10,         'HOF+': 9.5,       'Hall of Fame': 9,
  'Amazing+': 8.5,    'Amazing': 8,
  'Spectacular+': 7.5,'Spectacular': 7,
  'Great+': 6.5,      'Great': 6,
  'Good+': 5.5,       'Good': 5,
  'Standard+': 4.5,   'Standard': 4,
  'Mid+': 3.5,        'Mid': 3,
  'Weak+': 2.5,       'Weak': 2,
  'Bad+': 1.5,        'Bad': 1,
  'Garbage+': 0.5,    'Garbage': 0,
};

const DIFFICULTY_TIER_POINTS = {
  'Beyond': 11,       'DOOMED': 10,
  'Kaizo+': 9.5,      'Kaizo': 9,
  'Legendary+': 8.5,  'Legendary': 8,
  'Extreme+': 7.5,    'Extreme': 7,
  'Brutal+': 6.5,     'Brutal': 6,
  'Hard+': 5.5,       'Hard': 5,
  'Demanding+': 4.5,  'Demanding': 4,
  'Normal+': 3.5,     'Normal': 3,
  'Moderate+': 2.5,   'Moderate': 2,
  'Easy+': 1.5,       'Easy': 1,
  'Unlosable+': 0.5,  'Unlosable': 0,
};

const DEFAULT_QUALITY_TIERS = Object.keys(QUALITY_TIER_POINTS);
const DEFAULT_DIFFICULTY_TIERS = Object.keys(DIFFICULTY_TIER_POINTS);

// Look up the numeric score for a canonical tier key. Returns null if unknown.
function tierPoints(canonical, type) {
  if (!canonical) return null;
  const map = type === 'q' ? QUALITY_TIER_POINTS : DIFFICULTY_TIER_POINTS;
  const v = map[canonical];
  return v === undefined ? null : v;
}

// Format a tier point as a short string: "10", "7.5", "0.5"
function fmtPoints(n) {
  if (n == null) return '';
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(1).replace(/\.0$/, '');
}

// ----- Map known formats -----
const FORMATS = ['Vanilla', 'Limit-Removing', 'Boom', 'MBF', 'MBF21', 'UDMF', 'GZDoom', 'Eternity', 'Other'];

// ----- Tier color palette (per-tier, ordered by progression) -----
// Quality (worst → best): charcoal → brown → olive → tan → slate → sage → sky → violet → orange → gold → radiant gold
// Each pair (T, T+) shares hue; "+" variants are a touch brighter to signal step-up.
const QUALITY_COLORS = {
  'Garbage':      '#665b52',
  'Garbage+':     '#776a5f',
  'Bad':          '#8a5a3e',
  'Bad+':         '#9c6a48',
  'Weak':         '#988a52',
  'Weak+':        '#a99a62',
  'Mid':          '#b8916b',
  'Mid+':         '#c8a17b',
  'Standard':     '#94a3b0',
  'Standard+':    '#a6b3bf',
  'Good':         '#84b277',
  'Good+':        '#96c489',
  'Great':        '#6f9dcc',
  'Great+':       '#82afde',
  'Spectacular':  '#9b7fcc',
  'Spectacular+': '#ad92de',
  'Amazing':      '#e07a3e',
  'Amazing+':     '#f08a52',
  'Hall of Fame': '#bd8420',
  'HOF+':         '#cf931f',
  'GOAT':         '#cf9f12',
};

// Difficulty (easiest → hardest): mint → green → teal → sky → blue → amber → orange → red → crimson → magenta → purple → abyssal
const DIFFICULTY_COLORS = {
  'Unlosable':    '#5fa07d',
  'Unlosable+':   '#6cae8a',
  'Easy':         '#5aa05c',
  'Easy+':        '#6cb06e',
  'Moderate':     '#5fb09e',
  'Moderate+':    '#71c2b0',
  'Normal':       '#6296c4',
  'Normal+':      '#74a8d6',
  'Demanding':    '#5275bc',
  'Demanding+':   '#6485cc',
  'Hard':         '#cc8a3a',
  'Hard+':        '#dc9b4c',
  'Brutal':       '#dc6a30',
  'Brutal+':      '#ec7a42',
  'Extreme':      '#d8513c',
  'Extreme+':     '#ea624e',
  'Legendary':    '#c0404c',
  'Legendary+':   '#d1525e',
  'Kaizo':        '#a8487a',
  'Kaizo+':       '#ba5a8c',
  'DOOMED':       '#7c52a8',
  'Beyond':       '#5a36b4',
};

// Tints/decorations for the most prestigious tiers (subtle glow)
const TIER_GLOW = new Set(['GOAT', 'Beyond', 'DOOMED', 'HOF+', 'Hall of Fame']);

// Return the canonical hex color for a tier, falling back to muted ink.
function gradeColor(canonicalKey, type) {
  if (!canonicalKey) return '#5e594f';
  if (type === 'q' || type === 'ost') return QUALITY_COLORS[canonicalKey] || '#94a3b0';
  if (type === 'd') return DIFFICULTY_COLORS[canonicalKey] || '#94a3b0';
  return '#94a3b0';
}

// Mix a hex color toward a target hex by ratio t (0..1).
function hexMix(hex, target, t) {
  const h = hex.replace('#', '');
  const g = target.replace('#', '');
  const r1 = parseInt(h.slice(0, 2), 16), g1 = parseInt(h.slice(2, 4), 16), b1 = parseInt(h.slice(4, 6), 16);
  const r2 = parseInt(g.slice(0, 2), 16), g2 = parseInt(g.slice(2, 4), 16), b2 = parseInt(g.slice(4, 6), 16);
  const m = (a, b) => Math.round(a + (b - a) * t).toString(16).padStart(2, '0');
  return `#${m(r1, r2)}${m(g1, g2)}${m(b1, b2)}`;
}

// Return a richer palette for a tier, tuned for a light background.
//   solid — vivid tier hue (decorative bars/swatches)
//   fg    — darkened, high-contrast text/number color
//   bg    — soft tinted fill
//   edge  — crisp solid border in the tier hue
function gradePalette(canonicalKey, type) {
  const solid = gradeColor(canonicalKey, type);
  const fg = hexMix(solid, '#1a1712', 0.34);   // darken for legible text on light
  const edge = hexMix(solid, '#1a1712', 0.08); // near-vivid, fully opaque border
  const bg = solid + '24';                      // ~14% tint fill
  const glow = TIER_GLOW.has(canonicalKey) ? `0 0 0 1px ${solid}66, 0 1px 6px ${solid}33` : 'none';
  return { fg, bg, edge, solid, glow };
}

// Resolve display label for a canonical tier, given per-WAD overrides.
function tierLabel(canonical, wadTiers, type) {
  if (!canonical) return '';
  const overrides = wadTiers?.[type === 'q' ? 'quality' : 'difficulty'] || {};
  return overrides[canonical] || canonical;
}

// ----- Storage helpers -----
const STORAGE_KEY = 'dominfo:v1';

function loadStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
}

function saveStore(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Save failed', e);
  }
}

// ----- Image storage (IndexedDB — large quota, key/value records) -----
// localStorage cap is ~5MB total, which fills up quickly with hero JPEGs.
// IndexedDB typically gives 100s of MB up to several GB.
const IMG_KEY_LEGACY = 'dominfo:images:v1';
const IDB_NAME = 'dominfo';
const IDB_VERSION = 1;
const IDB_STORE = 'images';

let _idbPromise = null;
function openImgDB() {
  if (_idbPromise) return _idbPromise;
  _idbPromise = new Promise((resolve, reject) => {
    if (!window.indexedDB) { reject(new Error('IndexedDB unavailable')); return; }
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
  return _idbPromise;
}

async function idbGetAllImages() {
  try {
    const db = await openImgDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const out = {};
      const cur = store.openCursor();
      cur.onsuccess = (e) => {
        const c = e.target.result;
        if (c) { out[c.key] = c.value; c.continue(); } else resolve(out);
      };
      cur.onerror = (e) => reject(e.target.error);
    });
  } catch (e) {
    console.warn('IDB load failed, falling back to localStorage', e);
    try {
      const raw = localStorage.getItem(IMG_KEY_LEGACY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return {};
  }
}

async function idbSetImage(key, dataUrl) {
  try {
    const db = await openImgDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(dataUrl, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = (e) => reject(e.target.error);
      tx.onabort = (e) => reject(e.target.error || new Error('aborted'));
    });
  } catch (e) {
    console.warn('IDB save failed', key, e);
    return false;
  }
}

async function idbDelImage(key) {
  try {
    const db = await openImgDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).delete(key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = (e) => reject(e.target.error);
    });
  } catch (e) {
    console.warn('IDB delete failed', key, e);
    return false;
  }
}

// Migrate any pre-existing localStorage-backed images into IDB, then clear
// the localStorage key so it frees its 5MB slot.
async function migrateLocalStorageImages() {
  try {
    const raw = localStorage.getItem(IMG_KEY_LEGACY);
    if (!raw) return { migrated: 0 };
    const old = JSON.parse(raw);
    const keys = Object.keys(old);
    if (keys.length === 0) { localStorage.removeItem(IMG_KEY_LEGACY); return { migrated: 0 }; }
    let count = 0;
    for (const k of keys) {
      const ok = await idbSetImage(k, old[k]);
      if (ok) count++;
    }
    // Only remove legacy key once everything is in IDB
    if (count === keys.length) localStorage.removeItem(IMG_KEY_LEGACY);
    return { migrated: count, total: keys.length };
  } catch (e) {
    console.warn('Image migration failed', e);
    return { migrated: 0, error: e };
  }
}

// Compatibility shims for legacy call sites
function loadImages() {
  // Synchronous read no longer possible — return empty; the async load runs in App init.
  return {};
}
function saveImages(_imgs) { /* no-op — writes are per-key via idbSetImage */ }

// ----- Image resize utility -----
// mode 'cover' = fill target and crop (default, for thumbnails / covers)
// mode 'contain' = fit fully within max dimensions, preserve aspect ratio
function resizeImage(dataUrl, targetW, targetH, mode = 'cover') {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      if (mode === 'contain') {
        // Fit within target preserving aspect; canvas matches image's scaled dims
        const scale = Math.min(targetW / img.width, targetH / img.height, 1);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.9));
        return;
      }
      // Cover (default)
      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      const scale = Math.max(targetW / img.width, targetH / img.height);
      const sw = img.width * scale;
      const sh = img.height * scale;
      const ox = (targetW - sw) / 2;
      const oy = (targetH - sh) / 2;
      ctx.drawImage(img, ox, oy, sw, sh);
      resolve(canvas.toDataURL('image/jpeg', 0.88));
    };
    img.src = dataUrl;
  });
}

// ----- File input bridge -----
function pickImage(callback) {
  const input = document.getElementById('globalFileInput');
  input.value = '';
  const handler = (e) => {
    const file = e.target.files?.[0];
    input.removeEventListener('change', handler);
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => callback(ev.target.result);
    reader.readAsDataURL(file);
  };
  input.addEventListener('change', handler);
  input.click();
}

// ----- ID -----
function makeId() {
  return 'w_' + Math.random().toString(36).slice(2, 10);
}

// ----- Sort helpers -----
function sortWADs(entries, sortKey) {
  const sorted = [...entries];
  sorted.sort((a, b) => {
    const wa = a[1], wb = b[1];
    if (sortKey === 'alpha') return a[0].localeCompare(b[0], undefined, { sensitivity: 'base' });
    if (sortKey === 'alpha-desc') return b[0].localeCompare(a[0], undefined, { sensitivity: 'base' });
    if (sortKey === 'release') return (wb.release || '').localeCompare(wa.release || '');
    if (sortKey === 'release-asc') return (wa.release || '').localeCompare(wb.release || '');
    if (sortKey === 'quality') {
      // Higher points = better — descending
      const qa = tierPoints(wa.q_grade, 'q');
      const qb = tierPoints(wb.q_grade, 'q');
      return (qb == null ? -1 : qb) - (qa == null ? -1 : qa);
    }
    if (sortKey === 'difficulty') {
      const da = tierPoints(wa.d_grade, 'd');
      const db = tierPoints(wb.d_grade, 'd');
      return (db == null ? -1 : db) - (da == null ? -1 : da);
    }
    return 0;
  });
  return sorted;
}

// ----- Video URL parsing (YouTube / Vimeo) -----
function parseVideo(url) {
  if (!url) return null;
  const u = url.trim();
  // YouTube: youtu.be/ID, youtube.com/watch?v=ID, /embed/ID, /shorts/ID, /live/ID
  let m = u.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (m) {
    const id = m[1];
    // Grab a start time if present (t=, start=)
    const tMatch = u.match(/[?&#](?:t|start)=(\d+)/);
    const start = tMatch ? parseInt(tMatch[1], 10) : 0;
    return {
      provider: 'youtube',
      id,
      thumb: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      embed: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0${start ? `&start=${start}` : ''}`,
      watch: `https://www.youtube.com/watch?v=${id}${start ? `&t=${start}` : ''}`,
    };
  }
  // Vimeo: vimeo.com/ID
  m = u.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (m) {
    const id = m[1];
    return {
      provider: 'vimeo',
      id,
      thumb: null, // Vimeo thumbs need an API call; we show a generic poster
      embed: `https://player.vimeo.com/video/${id}?autoplay=1`,
      watch: `https://vimeo.com/${id}`,
    };
  }
  // Unknown — treat as a plain external link
  return { provider: 'link', id: null, thumb: null, embed: null, watch: u };
}
// Handles MAP01, E1M4, "Map 08", bare numbers, etc.
function parseMapSlot(s) {
  const str = (s || '').trim().toUpperCase();
  // Episode/mission format: E1M4, E2M07
  let m = str.match(/E\s*(\d+)\s*M\s*(\d+)/);
  if (m) return { ep: parseInt(m[1], 10), num: parseInt(m[2], 10) };
  // MAP## or any first run of digits
  m = str.match(/(\d+)/);
  if (m) return { ep: 0, num: parseInt(m[1], 10) };
  // No number — sort to the end
  return { ep: 9999, num: 9999 };
}

function compareMapSlots(a, b) {
  const pa = parseMapSlot(a.number);
  const pb = parseMapSlot(b.number);
  if (pa.ep !== pb.ep) return pa.ep - pb.ep;
  if (pa.num !== pb.num) return pa.num - pb.num;
  return (a.number || '').localeCompare(b.number || '', undefined, { numeric: true });
}

// Find the index at which a map with the given slot should be inserted so the
// list stays in natural slot order (assumes `maps` is already sorted).
function slotInsertIndex(maps, number) {
  const probe = { number };
  for (let i = 0; i < maps.length; i++) {
    if (compareMapSlots(probe, maps[i]) < 0) return i;
  }
  return maps.length;
}


function avgFromMaps(maps, type) {
  const vals = maps
    .map(m => tierPoints(type === 'q' ? m.quality : m.difficulty, type))
    .filter(v => v != null);
  if (!vals.length) return null;
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  return { score: mean.toFixed(2) };
}

// ----- Convert legacy/seed data to v1 store shape -----
// Seed format: { "IWAD": { "wadName": { ...fields, maps: [...] } } }
// Store format: { wads: [ { id, iwad, name, ...fields, tiers: {quality:{},difficulty:{}}, maps: [{id, ...}] } ], reviews: {mapId: text} }
function seedToStore(seed) {
  const wads = [];
  const reviews = {};
  Object.entries(seed).forEach(([iwad, wadMap]) => {
    Object.entries(wadMap).forEach(([name, wd]) => {
      const wid = makeId();
      const maps = (wd.maps || []).map(m => ({
        id: makeId(),
        name: m.name || '',
        number: m.number || '',
        author: m.author || '',
        quality: m.quality || '',
        difficulty: m.difficulty || '',
        ost: m.ost || '',
        kills: m.kills || '',
        items: m.items || '',
        secrets: m.secrets || '',
        midi: m.midi || '',
        midi_author: m.midi_author || '',
        uvmax: m.uvmax || '',
        best: !!m.best,
        hardest: !!m.hardest,
      }));
      wads.push({
        id: wid,
        iwad,
        name,
        author: wd.author || '',
        format: wd.format || '',
        release: wd.release || '',
        maps_count: wd.maps_count || String(maps.length),
        q_grade: wd.q_grade || '',
        d_grade: wd.d_grade || '',
        ost_grade: wd.ost_grade || '',
        qual_avg: wd.qual_avg || '',
        diff_avg: wd.diff_avg || '',
        mus_avg: wd.mus_avg || '',
        intro: '',
        tiers: { quality: {}, difficulty: {} },
        maps,
      });
    });
  });
  return { wads, reviews, version: 1 };
}

// ============================================================
// Backup format — ZIP archive (robust, portable across devices)
// Images are stored as raw binary files instead of base64 inside a
// giant JSON string, so large libraries round-trip reliably.
// ============================================================

const _CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) c = _CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

// Build a ZIP Blob (store method — no compression; JPEGs are already compressed).
// files: [{ name, bytes:Uint8Array }]
function zipCreate(files) {
  const enc = new TextEncoder();
  const chunks = [];
  const central = [];
  let offset = 0;
  for (const f of files) {
    const nameBytes = enc.encode(f.name);
    const crc = crc32(f.bytes);
    const size = f.bytes.length;
    const lh = new Uint8Array(30 + nameBytes.length);
    const dv = new DataView(lh.buffer);
    dv.setUint32(0, 0x04034b50, true);
    dv.setUint16(4, 20, true);
    dv.setUint16(6, 0x0800, true); // UTF-8 names
    dv.setUint16(8, 0, true);      // store
    dv.setUint16(10, 0, true);
    dv.setUint16(12, 0, true);
    dv.setUint32(14, crc, true);
    dv.setUint32(18, size, true);
    dv.setUint32(22, size, true);
    dv.setUint16(26, nameBytes.length, true);
    dv.setUint16(28, 0, true);
    lh.set(nameBytes, 30);
    chunks.push(lh, f.bytes);

    const ch = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(ch.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, size, true);
    cv.setUint32(24, size, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    ch.set(nameBytes, 46);
    central.push(ch);

    offset += lh.length + f.bytes.length;
  }
  const centralStart = offset;
  let centralSize = 0;
  for (const c of central) { chunks.push(c); centralSize += c.length; }
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, centralStart, true);
  chunks.push(eocd);
  return new Blob(chunks, { type: 'application/zip' });
}

// Extract a ZIP ArrayBuffer → { name: Uint8Array }
async function zipExtract(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  const dv = new DataView(arrayBuffer);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('Not a valid backup (.zip) file');
  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const out = {};
  const dec = new TextDecoder();
  for (let i = 0; i < count; i++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true);
    const compSize = dv.getUint32(p + 20, true);
    const nameLen = dv.getUint16(p + 28, true);
    const extraLen = dv.getUint16(p + 30, true);
    const commentLen = dv.getUint16(p + 32, true);
    const lho = dv.getUint32(p + 42, true);
    const name = dec.decode(bytes.subarray(p + 46, p + 46 + nameLen));
    const lNameLen = dv.getUint16(lho + 26, true);
    const lExtraLen = dv.getUint16(lho + 28, true);
    const dataStart = lho + 30 + lNameLen + lExtraLen;
    const data = bytes.subarray(dataStart, dataStart + compSize);
    if (method === 0) {
      out[name] = data;
    } else {
      const ds = new DecompressionStream('deflate-raw');
      const buf = await new Response(new Blob([data]).stream().pipeThrough(ds)).arrayBuffer();
      out[name] = new Uint8Array(buf);
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

function dataURLToBytes(dataURL) {
  const comma = dataURL.indexOf(',');
  const meta = dataURL.slice(0, comma);
  const bin = atob(dataURL.slice(comma + 1));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const mime = (meta.match(/data:([^;]+)/) || [])[1] || 'image/jpeg';
  return { bytes, mime };
}

function bytesToDataURL(bytes, mime) {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return `data:${mime || 'image/jpeg'};base64,${btoa(bin)}`;
}

// Build the full backup as a ZIP Blob.
function exportBackupZip(store, images) {
  const enc = new TextEncoder();
  const files = [{ name: 'data.json', bytes: enc.encode(JSON.stringify(store)) }];
  const manifest = [];
  let idx = 0;
  for (const [key, dataURL] of Object.entries(images || {})) {
    if (typeof dataURL !== 'string' || !dataURL.startsWith('data:')) continue;
    let parsed;
    try { parsed = dataURLToBytes(dataURL); } catch (e) { continue; }
    const ext = parsed.mime.includes('png') ? 'png' : parsed.mime.includes('webp') ? 'webp' : 'jpg';
    const fname = `images/${idx}.${ext}`;
    files.push({ name: fname, bytes: parsed.bytes });
    manifest.push({ file: fname, key, mime: parsed.mime });
    idx++;
  }
  files.push({ name: 'images.json', bytes: enc.encode(JSON.stringify(manifest)) });
  files.push({ name: 'README.txt', bytes: enc.encode(
    'DoomInfo backup\nOpen the DoomInfo app and use Backup → Restore to import this file.\nContains data.json (your archive) and images/ (covers, map shots, galleries).\n'
  ) });
  return zipCreate(files);
}

// Read a backup ZIP ArrayBuffer → { store, images }
async function importBackupZip(arrayBuffer) {
  const entries = await zipExtract(arrayBuffer);
  const dec = new TextDecoder();
  if (!entries['data.json']) throw new Error('Backup is missing data.json');
  const store = JSON.parse(dec.decode(entries['data.json']));
  const images = {};
  if (entries['images.json']) {
    const manifest = JSON.parse(dec.decode(entries['images.json']));
    for (const m of manifest) {
      const b = entries[m.file];
      if (b) images[m.key] = bytesToDataURL(b, m.mime);
    }
  }
  return { store, images };
}

// ----- Export to window -----
Object.assign(window, {
  IWADS,
  DEFAULT_QUALITY_TIERS,
  DEFAULT_DIFFICULTY_TIERS,
  QUALITY_TIER_POINTS,
  DIFFICULTY_TIER_POINTS,
  QUALITY_COLORS,
  DIFFICULTY_COLORS,
  TIER_GLOW,
  FORMATS,
  gradeColor,
  gradePalette,
  tierLabel,
  tierPoints,
  fmtPoints,
  loadStore, saveStore,
  loadImages, saveImages,
  idbGetAllImages, idbSetImage, idbDelImage, migrateLocalStorageImages,
  exportBackupZip, importBackupZip,
  resizeImage, pickImage,
  makeId,
  sortWADs,
  parseVideo,
  parseMapSlot, compareMapSlots, slotInsertIndex,
  avgFromMaps,
  seedToStore,
});
