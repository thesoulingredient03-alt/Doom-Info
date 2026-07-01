/* ============================================================
   DoomInfo — App root + state + Tweaks panel hookup
   ============================================================ */

const APP_TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "blue",
  "density": "comfortable",
  "ground": "paper",
  "showUvmax": true,
  "showSpecsHint": true
}/*EDITMODE-END*/;

function App() {
  // Load store (or seed)
  const [store, setStore] = useState(() => {
    const existing = loadStore();
    if (existing && existing.wads) return existing;
    return { wads: [], reviews: {}, version: 1 };
  });
  const [images, setImages] = useState({});
  const [seedLoading, setSeedLoading] = useState(false);

  // Async-load all images from IndexedDB on mount + run localStorage→IDB migration
  useEffect(() => {
    (async () => {
      const mig = await migrateLocalStorageImages();
      if (mig.migrated > 0) {
        console.info(`Migrated ${mig.migrated}/${mig.total} images from localStorage to IndexedDB.`);
      }
      const all = await idbGetAllImages();
      setImages(all);
    })();
  }, []);

  // Tweaks
  const [tweaks, setTweak] = (typeof useTweaks === 'function') ? useTweaks(APP_TWEAK_DEFAULTS) : [APP_TWEAK_DEFAULTS, () => {}];

  // Apply tweak side-effects (accent / ground)
  useEffect(() => {
    const root = document.documentElement;
    const accent = {
      blue: '#2f6fb0',
      teal: '#2f8f93',
      sage: '#5f9168',
      plum: '#8a5f80',
      crim: '#b3433a',
    }[tweaks.accent] || '#2f6fb0';
    root.style.setProperty('--rust', accent);

    const grounds = {
      'paper':     ['#d9d7d1', '#e2e0db', '#cfcdc6', '#c2bfb7'],
      'soft-gray': ['#dcdcde', '#e5e5e7', '#d1d1d4', '#c4c4c8'],
      'warm-gray': ['#dad7d0', '#e3e0d9', '#cfccc4', '#c1bdb4'],
      'cool-slate':['#d4d7da', '#dde0e3', '#c9cdd1', '#bbc0c5'],
    };
    const g = grounds[tweaks.ground] || grounds['paper'];
    root.style.setProperty('--bg', g[0]);
    root.style.setProperty('--bg-1', g[1]);
    root.style.setProperty('--bg-2', g[2]);
    root.style.setProperty('--bg-3', g[3]);
  }, [tweaks.accent, tweaks.ground]);

  // One-time rename migration: expand mapping aliases to "Real Name (Alias)"
  // across all stored text (authors, midi credits, reviews, etc.), idempotently.
  useEffect(() => {
    const CURRENT_RENAME = 2;
    if (store.wads.length === 0) return;            // fresh seed already normalized
    if ((store.rename_version || 0) >= CURRENT_RENAME) return;

    // Each rule: a regex (with guards) → replacement. Guards prevent double-wrapping
    // and avoid unrelated names (e.g. "Jimmy Sieben" is a different person).
    const RULES = [
      { re: /\bRibbiks\b(?!\))/g, to: 'Zachary Stephens (Ribbiks)' },
      { re: /\bJimmy\b(?! Sieben)(?!\))/g, to: 'James Paddock (Jimmy)' },
    ];

    let changed = false;
    const renameStr = (s) => {
      let out = s;
      for (const r of RULES) {
        r.re.lastIndex = 0;
        if (r.re.test(out)) out = out.replace(r.re, () => r.to);
      }
      if (out !== s) changed = true;
      return out;
    };

    const deepRename = (val) => {
      if (typeof val === 'string') return renameStr(val);
      if (Array.isArray(val)) return val.map(deepRename);
      if (val && typeof val === 'object') {
        const out = {};
        for (const k of Object.keys(val)) out[k] = deepRename(val[k]);
        return out;
      }
      return val;
    };

    setStore(s => {
      const renamed = deepRename({ wads: s.wads, reviews: s.reviews });
      return { ...s, wads: renamed.wads, reviews: renamed.reviews, rename_version: CURRENT_RENAME };
    });
    if (changed) setToast('Normalized author names to real name + alias');
  }, []); // eslint-disable-line

  // One-time: coerce stored item/secret/kill counts to integers (drop decimals).
  useEffect(() => {
    const CURRENT_INTCOUNT = 1;
    if (store.wads.length === 0) return;
    if ((store.intcount_version || 0) >= CURRENT_INTCOUNT) return;
    const toInt = (v) => {
      if (v == null || v === '') return v;
      const n = Number(v);
      if (isNaN(n)) return v;
      return String(Math.round(n));
    };
    let changed = false;
    setStore(s => ({
      ...s,
      intcount_version: CURRENT_INTCOUNT,
      wads: s.wads.map(w => ({
        ...w,
        maps: (w.maps || []).map(m => {
          const items = toInt(m.items), secrets = toInt(m.secrets), kills = toInt(m.kills);
          if (items !== m.items || secrets !== m.secrets || kills !== m.kills) {
            changed = true;
            return { ...m, items, secrets, kills };
          }
          return m;
        }),
      })),
    }));
  }, []); // eslint-disable-line

  // One-time: strip "(bespoke)" from MIDI names → MIDI origin = "Bespoke".
  useEffect(() => {
    const CURRENT_BESPOKE = 1;
    if (store.wads.length === 0) return;
    if ((store.bespoke_version || 0) >= CURRENT_BESPOKE) return;
    setStore(s => ({
      ...s,
      bespoke_version: CURRENT_BESPOKE,
      wads: s.wads.map(w => ({
        ...w,
        maps: (w.maps || []).map(m => {
          if (typeof m.midi !== 'string') return m;
          const mt = m.midi.match(/^(.*?)\s*\(bespoke\)\s*$/i);
          if (!mt) return m;
          return { ...m, midi: mt[1].trim(), midi_origin: m.midi_origin || 'Bespoke' };
        }),
      })),
    }));
  }, []); // eslint-disable-line

  // One-time spreadsheet refresh: rename abbreviated WADs to their full names and
  // refresh WAD author, map author, and MIDI author from the updated seed data.
  useEffect(() => {
    const CURRENT_SHEET = 1;
    if (store.wads.length === 0) return;            // fresh seed already current
    if ((store.sheet_refresh_version || 0) >= CURRENT_SHEET) return;

    const ABBREV = {
      "180MPV":"180 Minutes Pour Vivre","BB2025":"Blues Brothers 2025","CC2":"Community Chest 2","CC3":"Community Chest 3","CC4":"Community Chest 4",
      "D2ICO":"Doom 2 In City Only","D2INO":"Doom 2 In Name Only","D2IRO":"Doom 2 In Rural Only","D2ISO":"Doom 2 In Spain Only","D2TWID":"Doom 2 the Way id Did",
      "DotW":"Dance on the Water","FCFF":"Finely Crafted Fetish Film","GMP":"Good Morning Phobos","HR1":"Hell Revealed 1","HR2":"Hell Revealed 2",
      "MSCP":"Micro Slaughter Community Project","PPSS":"Pacifist Paradise Secret Santa","PPSS2":"Pacifist Paradise Secret Santa 2","ROC2":"Realm of Chaos 2",
      "SWTW":"Swim With The Whales","DTWID":"Doom the Way id Did","UDINO":"Ultimate Doom In Name Only","PRCP":"Plutonia Revisited Community Project","PRCP 2":"Plutonia Revisited Community Project 2",
      "1KL1":"1000 Lines 1","1KL2":"1000 Lines 2","1KL3":"1000 Lines 3","3ha1":"3 heures d'agonie 1","3ha2":"3 heures d'agonie 2","3ha3":"3 heures d'agonie 3",
      "BTSX 1":"Back to Saturn X Episode 1","BTSX 2":"Back to Saturn X Episode 2","CC1 (w/ .MID the Way id Did)":"Community Chest 1 (w/ .MID the Way id Did)",
      "HF1":"Hardfest 1","HF2":"Hardfest 2","HF3":"Hardfest 3","Icarus":"Icarus: Alien Vanguard","JPCP":"Japanese Community Project",
      "NRFTL (w/ MIDI Pack)":"No Rest For the Living (w/ MIDI Pack)","ROC (25th Anniversary Ed.)":"Realm of Chaos (25th Anniversary Ed.)",
      "SD20X6":"Stardate 20X6","SD20X7":"Stardate 20X7","SF2011":"Slaughterfest 2011","SF2012":"Slaughterfest 2012","SF3":"Slaughterfest 3",
      "SMAX":"SlaughterMAX","Sojourner Episode 1":"Sojourner","WW1":"Wormwood","WW2EU":"Wormwood 2: Extended Universe","WW3":"Wormwood 3: The Horror","WW4":"Wormwood 4: The Final Chapter","WW5":"Wormwood 5"
    };
    const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    fetch(window.__resources?.doomData || 'data/doom-data.json')
      .then(r => r.json())
      .then(seed => {
        // seed lookup: full name -> wad (with author + maps)
        const seedByName = {};
        Object.entries(seed).forEach(([iwad, wadMap]) => {
          Object.entries(wadMap).forEach(([name, wd]) => { seedByName[norm(name)] = { name, ...wd }; });
        });

        setStore(s => ({
          ...s,
          sheet_refresh_version: CURRENT_SHEET,
          wads: s.wads.map(w => {
            const fullName = ABBREV[w.name] || w.name;
            const seedW = seedByName[norm(fullName)];
            let next = w.name !== fullName ? { ...w, name: fullName } : { ...w };
            if (!seedW) return next;
            // Refresh WAD author
            if (seedW.author) next.author = seedW.author;
            // Build map author/midi lookups from seed
            const aByName = {}, aByNum = {}, mByName = {}, mByNum = {};
            for (const sm of (seedW.maps || [])) {
              if (sm.author) { if (sm.name) aByName[norm(sm.name)] = sm.author; if (sm.number) aByNum[sm.number] = sm.author; }
              if (sm.midi_author) { if (sm.name) mByName[norm(sm.name)] = sm.midi_author; if (sm.number) mByNum[sm.number] = sm.midi_author; }
            }
            next.maps = (next.maps || []).map(m => {
              const a = aByName[norm(m.name || '')] || aByNum[m.number];
              const mi = mByName[norm(m.name || '')] || mByNum[m.number];
              let nm = m;
              if (a && a !== m.author) nm = { ...nm, author: a };
              if (mi && mi !== m.midi_author) nm = { ...nm, midi_author: mi };
              return nm;
            });
            return next;
          }),
        }));
        setToast('Updated WAD names & author credits from spreadsheet');
      })
      .catch(err => console.warn('Sheet refresh failed', err));
  }, []); // eslint-disable-line

  // First-run seed + migration: hydrate from doom-data.json if store is empty,
  // OR patch missing qual_avg/diff_avg/map OST grades / demo flags from the seed.
  useEffect(() => {
    const needsSeed = store.wads.length === 0;
    const needsAvgPatch = store.wads.some(w => w.qual_avg == null || w.qual_avg === '');
    const CURRENT_OST_PATCH = 2;
    const needsOstPatch = !needsSeed && (store.ost_patch_version || 0) < CURRENT_OST_PATCH;
    const CURRENT_REHOME_VERSION = 1;
    const needsRehome = !needsSeed && (store.rehome_version || 0) < CURRENT_REHOME_VERSION;
    const CURRENT_DEMO_PATCH = 1;
    const needsDemoPatch = !needsSeed && (store.demo_patch_version || 0) < CURRENT_DEMO_PATCH;
    const CURRENT_AUTHOR_PATCH = 1;
    const needsAuthorPatch = !needsSeed && (store.author_patch_version || 0) < CURRENT_AUTHOR_PATCH;
    if (!needsSeed && !needsAvgPatch && !needsOstPatch && !needsRehome && !needsDemoPatch && !needsAuthorPatch) return;
    setSeedLoading(needsSeed);
    fetch(window.__resources?.doomData || 'data/doom-data.json')
      .then(r => r.json())
      .then(seed => {
        if (needsSeed) {
          const next = seedToStore(seed);
          next.ost_patch_version = CURRENT_OST_PATCH;
          next.rehome_version = CURRENT_REHOME_VERSION;
          next.demo_patch_version = CURRENT_DEMO_PATCH;
          next.author_patch_version = CURRENT_AUTHOR_PATCH;
          setStore(next);
          saveStore(next);
        } else {
          // Build lookups
          const seedIwadByName = {};
          Object.entries(seed).forEach(([iwad, wadMap]) => {
            Object.keys(wadMap).forEach(name => { seedIwadByName[name] = iwad; });
          });
          const wadLookup = {};
          Object.entries(seed).forEach(([iwad, wadMap]) => {
            Object.entries(wadMap).forEach(([name, wd]) => {
              wadLookup[`${iwad}::${name}`] = wd;
            });
          });
          setStore(s => ({
            ...s,
            ost_patch_version: CURRENT_OST_PATCH,
            rehome_version: CURRENT_REHOME_VERSION,
            demo_patch_version: CURRENT_DEMO_PATCH,
            author_patch_version: CURRENT_AUTHOR_PATCH,
            wads: s.wads.map(w => {
              const seedIwad = seedIwadByName[w.name];
              const correctIwad = seedIwad && seedIwad !== w.iwad ? seedIwad : w.iwad;
              const seedW = wadLookup[`${correctIwad}::${w.name}`];
              const base = correctIwad !== w.iwad ? { ...w, iwad: correctIwad } : w;
              if (!seedW) return base;
              const ostByName = {};
              const ostByNum = {};
              const demoByName = {};
              const demoByNum = {};
              const authByName = {};
              const authByNum = {};
              const midiByName = {};
              const midiByNum = {};
              for (const sm of (seedW.maps || [])) {
                if (sm.ost) {
                  if (sm.name) ostByName[sm.name] = sm.ost;
                  if (sm.number) ostByNum[sm.number] = sm.ost;
                }
                if (sm.demo) {
                  if (sm.name) demoByName[sm.name] = true;
                  if (sm.number) demoByNum[sm.number] = true;
                }
                if (sm.author) {
                  if (sm.name) authByName[sm.name] = sm.author;
                  if (sm.number) authByNum[sm.number] = sm.author;
                }
                if (sm.midi_author) {
                  if (sm.name) midiByName[sm.name] = sm.midi_author;
                  if (sm.number) midiByNum[sm.number] = sm.midi_author;
                }
              }
              const newMaps = (base.maps || []).map(m => {
                let next = m;
                if (!next.ost) {
                  const ost = ostByName[next.name] || ostByNum[next.number] || '';
                  if (ost) next = { ...next, ost };
                }
                if (next.demo === undefined) {
                  const hasDemo = demoByName[next.name] || demoByNum[next.number] || false;
                  next = { ...next, demo: hasDemo };
                }
                // Refresh author + MIDI author from the (updated) seed, where present
                const newAuthor = authByName[next.name] || authByNum[next.number];
                if (newAuthor && newAuthor !== next.author) next = { ...next, author: newAuthor };
                const newMidi = midiByName[next.name] || midiByNum[next.number];
                if (newMidi && newMidi !== next.midi_author) next = { ...next, midi_author: newMidi };
                return next;
              });
              return {
                ...base,
                qual_avg: base.qual_avg || seedW.qual_avg || '',
                diff_avg: base.diff_avg || seedW.diff_avg || '',
                mus_avg: base.mus_avg || seedW.mus_avg || '',
                maps: newMaps,
              };
            }),
          }));
        }
        setSeedLoading(false);
      })
      .catch(err => {
        console.warn('Seed load failed', err);
        setSeedLoading(false);
      });
  }, []); // eslint-disable-line

  // Persist store on change. Images are persisted per-key via IDB writes elsewhere.
  useEffect(() => { saveStore(store); }, [store]);

  // Route state
  // { view: 'home' | 'iwad' | 'wad' | 'map', iwad?, wadId?, mapId? }
  const [route, setRoute] = useState({ view: 'home' });
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('alpha');
  const [showAddWAD, setShowAddWAD] = useState(false);
  const [tierEditingWADId, setTierEditingWADId] = useState(null);
  const [showImportExport, setShowImportExport] = useState(false);
  const [toast, setToast] = useState('');

  // --- Sync route to URL hash so refresh keeps place ---
  useEffect(() => {
    const parseHash = () => {
      const h = window.location.hash.slice(1);
      if (!h) { setRoute({ view: 'home' }); return; }
      const parts = h.split('/');
      if (parts[0] === 'iwad' && parts[1]) setRoute({ view: 'iwad', iwad: decodeURIComponent(parts[1]) });
      else if (parts[0] === 'wad' && parts[1]) {
        const r = { view: 'wad', wadId: parts[1] };
        if (parts[2] === 'map' && parts[3]) { r.view = 'map'; r.mapId = parts[3]; }
        setRoute(r);
      }
      else setRoute({ view: 'home' });
    };
    window.addEventListener('hashchange', parseHash);
    parseHash();
    return () => window.removeEventListener('hashchange', parseHash);
  }, []);

  const navigate = (next) => {
    let hash = '';
    if (next.view === 'iwad') hash = `iwad/${encodeURIComponent(next.iwad)}`;
    else if (next.view === 'wad') hash = `wad/${next.wadId}`;
    else if (next.view === 'map') hash = `wad/${next.wadId}/map/${next.mapId}`;
    if (window.location.hash !== '#' + hash) window.location.hash = hash;
    else setRoute(next);
  };

  // --- Counts by IWAD ---
  const counts = useMemo(() => {
    const c = {};
    IWADS.forEach(iw => c[iw] = 0);
    store.wads.forEach(w => { if (c[w.iwad] != null) c[w.iwad]++; });
    return c;
  }, [store.wads]);

  // --- CRUD helpers ---
  const updateWAD = (id, patch) => {
    setStore(s => ({
      ...s,
      wads: s.wads.map(w => w.id === id ? { ...w, ...patch } : w),
    }));
  };

  const updateMap = (wadId, mapId, patch) => {
    setStore(s => ({
      ...s,
      wads: s.wads.map(w => {
        if (w.id !== wadId) return w;
        return {
          ...w,
          maps: w.maps.map(m => m.id === mapId ? { ...m, ...patch } : m),
        };
      }),
    }));
  };

  const addWAD = (data) => {
    const newWad = {
      id: makeId(),
      iwad: data.iwad,
      name: data.name,
      author: data.author,
      format: data.format,
      release: data.release,
      maps_count: data.maps_count || '',
      q_grade: data.q_grade || '',
      d_grade: data.d_grade || '',
      ost_grade: data.ost_grade || '',
      tiers: { quality: {}, difficulty: {} },
      maps: [],
    };
    setStore(s => ({ ...s, wads: [...s.wads, newWad] }));
    setShowAddWAD(false);
    setToast(`Added "${data.name}" to ${data.iwad}`);
    setTimeout(() => navigate({ view: 'wad', wadId: newWad.id }), 100);
  };

  const deleteWAD = (id) => {
    const w = store.wads.find(x => x.id === id);
    setStore(s => ({ ...s, wads: s.wads.filter(x => x.id !== id) }));
    // Remove WAD + map images from both memory state and IndexedDB
    setImages(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => {
        if (k === `wad:${id}` || k.startsWith(`map:${id}:`) || k.startsWith(`gallery:${id}:`)) {
          delete next[k];
          idbDelImage(k);
        }
      });
      return next;
    });
    setToast(`Deleted ${w?.name || 'WAD'}`);
    navigate({ view: 'iwad', iwad: w?.iwad || 'Doom 2' });
  };

  const addMap = (wadId) => {
    const wad = store.wads.find(w => w.id === wadId);
    if (!wad) return;
    // Pick the next free MAP## slot so the auto-number doesn't collide
    const used = new Set((wad.maps || []).map(m => (m.number || '').toUpperCase()));
    let n = 1;
    while (used.has(`MAP${String(n).padStart(2, '0')}`)) n++;
    const newMap = {
      id: makeId(),
      name: '',
      number: `MAP${String(n).padStart(2, '0')}`,
      author: '',
      quality: '',
      difficulty: '',
      ost: '',
      kills: '', items: '', secrets: '',
      midi: '', midi_author: '',
      uvmax: '',
      demo: false,
      best: false, hardest: false,
    };
    setStore(s => ({
      ...s,
      wads: s.wads.map(w => {
        if (w.id !== wadId) return w;
        // Insert into natural slot order
        const maps = [...w.maps];
        const at = slotInsertIndex(maps, newMap.number);
        maps.splice(at, 0, newMap);
        return { ...w, maps };
      }),
    }));
    navigate({ view: 'map', wadId, mapId: newMap.id });
  };

  // Move a map from one position to another (drag reorder)
  const reorderMaps = (wadId, fromIdx, toIdx) => {
    setStore(s => ({
      ...s,
      wads: s.wads.map(w => {
        if (w.id !== wadId) return w;
        const maps = [...w.maps];
        if (fromIdx < 0 || fromIdx >= maps.length || toIdx < 0 || toIdx >= maps.length) return w;
        const [moved] = maps.splice(fromIdx, 1);
        maps.splice(toIdx, 0, moved);
        return { ...w, maps };
      }),
    }));
  };

  // Sort all maps in a WAD by their slot number (MAP01, E1M4, …)
  const sortMapsBySlot = (wadId) => {
    setStore(s => ({
      ...s,
      wads: s.wads.map(w => {
        if (w.id !== wadId) return w;
        return { ...w, maps: [...w.maps].sort(compareMapSlots) };
      }),
    }));
    setToast('Maps sorted by slot');
  };

  const deleteMap = (wadId, mapId) => {
    setStore(s => ({
      ...s,
      wads: s.wads.map(w => w.id === wadId ? { ...w, maps: w.maps.filter(m => m.id !== mapId) } : w),
    }));
    const key = `map:${wadId}:${mapId}`;
    setImages(prev => {
      const next = { ...prev };
      delete next[key];
      // Also drop any gallery images for this map
      Object.keys(next).forEach(k => {
        if (k.startsWith(`gallery:${wadId}:${mapId}:`)) { delete next[k]; idbDelImage(k); }
      });
      return next;
    });
    idbDelImage(key);
    navigate({ view: 'wad', wadId });
  };

  const updateReview = (mapId, text) => {
    setStore(s => ({ ...s, reviews: { ...s.reviews, [mapId]: text } }));
  };

  const saveTiers = (wadId, tiers) => {
    updateWAD(wadId, { tiers });
    setTierEditingWADId(null);
    setToast('Tier names saved');
  };

  // --- Image upload (writes to IndexedDB, not localStorage) ---
  const uploadImage = async (key, kind) => {
    pickImage(async (dataUrl) => {
      let w, h, mode;
      if (kind === 'hero') { w = 2000; h = 1500; mode = 'contain'; }
      else if (kind === 'cover') { w = 1280; h = 960; mode = 'cover'; }
      else { w = 640; h = 480; mode = 'cover'; }
      const resized = await resizeImage(dataUrl, w, h, mode);
      const ok = await idbSetImage(key, resized);
      if (ok) {
        setImages(prev => ({ ...prev, [key]: resized }));
      } else {
        setToast('Image save failed — storage may be full');
      }
    });
  };

  // --- Map gallery (extra screenshots, click-through) ---
  const addGalleryImage = (wadId, mapId) => {
    pickImage(async (dataUrl) => {
      const resized = await resizeImage(dataUrl, 2000, 1500, 'contain');
      const gid = makeId();
      const key = `gallery:${wadId}:${mapId}:${gid}`;
      const ok = await idbSetImage(key, resized);
      if (!ok) { setToast('Image save failed — storage may be full'); return; }
      setImages(prev => ({ ...prev, [key]: resized }));
      setStore(s => ({
        ...s,
        wads: s.wads.map(w => w.id === wadId ? {
          ...w,
          maps: w.maps.map(m => m.id === mapId ? { ...m, gallery: [...(m.gallery || []), gid] } : m),
        } : w),
      }));
    });
  };

  const removeGalleryImage = (wadId, mapId, gid) => {
    const key = `gallery:${wadId}:${mapId}:${gid}`;
    idbDelImage(key);
    setImages(prev => { const n = { ...prev }; delete n[key]; return n; });
    setStore(s => ({
      ...s,
      wads: s.wads.map(w => w.id === wadId ? {
        ...w,
        maps: w.maps.map(m => m.id === mapId ? { ...m, gallery: (m.gallery || []).filter(g => g !== gid) } : m),
      } : w),
    }));
  };

  const importJSON = async (newStore, newImages) => {
    setStore(newStore);
    // Persist each image to IDB and clear any prior cached images
    const keys = Object.keys(newImages || {});
    for (const k of keys) {
      await idbSetImage(k, newImages[k]);
    }
    setImages(newImages || {});
    setShowImportExport(false);
    setToast(`Restored ${newStore.wads.length} WADs from backup`);
  };

  // --- Render ---
  const currentWad = route.wadId ? store.wads.find(w => w.id === route.wadId) : null;
  const currentMap = route.mapId && currentWad ? currentWad.maps.find(m => m.id === route.mapId) : null;
  const tierEditingWAD = tierEditingWADId ? store.wads.find(w => w.id === tierEditingWADId) : null;

  // Context label for subbar count
  let contextLabel = '';
  let resultCount = 0;
  if (route.view === 'home') resultCount = store.wads.length;
  else if (route.view === 'iwad') {
    resultCount = store.wads.filter(w => w.iwad === route.iwad).length;
    contextLabel = route.iwad;
  } else if (currentWad) {
    resultCount = currentWad.maps?.length || 0;
    contextLabel = currentWad.name;
  }

  return (
    <div className="app">
      <Masthead
        currentIWAD={route.view === 'iwad' ? route.iwad : (currentWad?.iwad || null)}
        onSelectIWAD={(iw) => navigate({ view: 'iwad', iwad: iw })}
        onHome={() => navigate({ view: 'home' })}
        counts={counts}
        onAddWAD={() => setShowAddWAD(true)}
        onImportExport={() => setShowImportExport(true)}
      />

      {(route.view === 'home' || route.view === 'iwad') && (
        <Subbar
          query={query}
          onQuery={setQuery}
          sort={sort}
          onSort={setSort}
          count={resultCount}
          context={contextLabel}
        />
      )}

      <main>
        {seedLoading && (
          <div style={{ padding: 80, textAlign: 'center', color: 'var(--ink-3)', fontFamily: 'var(--editorial)', fontStyle: 'normal', fontSize: 20 }}>
            Loading the archive…
          </div>
        )}

        {!seedLoading && route.view === 'home' && (
          <HomeView store={store} onPickIWAD={(iw) => navigate({ view: 'iwad', iwad: iw })} />
        )}

        {!seedLoading && route.view === 'iwad' && (
          <IWADGridView
            iwad={route.iwad}
            store={store}
            images={images}
            query={query}
            sort={sort}
            onOpenWAD={(id) => navigate({ view: 'wad', wadId: id })}
            onUploadCover={(key, kind) => uploadImage(key, kind)}
          />
        )}

        {!seedLoading && route.view === 'wad' && currentWad && (
          <WADDetailView
            wad={currentWad}
            store={store}
            images={images}
            onBack={(iw) => navigate(iw ? { view: 'iwad', iwad: iw } : { view: 'home' })}
            onUpdateWAD={updateWAD}
            onUpdateMap={updateMap}
            onUploadImage={uploadImage}
            onOpenMap={(wadId, mapId) => navigate({ view: 'map', wadId, mapId })}
            onAddMap={addMap}
            onReorderMaps={reorderMaps}
            onSortMaps={sortMapsBySlot}
            onDeleteWAD={deleteWAD}
            onEditTiers={() => setTierEditingWADId(currentWad.id)}
            onNavigateWAD={(wadId) => navigate({ view: 'wad', wadId })}
          />
        )}

        {!seedLoading && (route.view === 'wad' && !currentWad) && (
          <div style={{ padding: 80, textAlign: 'center', color: 'var(--ink-4)', fontFamily: 'var(--editorial)', fontStyle: 'normal', fontSize: 20 }}>
            That WAD couldn&rsquo;t be found. <button className="btn sm" style={{ marginLeft: 16 }} onClick={() => navigate({ view: 'home' })}>Back to home</button>
          </div>
        )}
      </main>

      {route.view === 'map' && currentWad && currentMap && (
        <MapFullView
          wad={currentWad}
          map={currentMap}
          images={images}
          review={store.reviews[currentMap.id] || ''}
          onBack={() => navigate({ view: 'wad', wadId: currentWad.id })}
          onUpdateMap={updateMap}
          onUploadImage={uploadImage}
          onUpdateReview={updateReview}
          onDeleteMap={deleteMap}
          onNavigateMap={(mapId) => navigate({ view: 'map', wadId: currentWad.id, mapId })}
          onAddGalleryImage={addGalleryImage}
          onRemoveGalleryImage={removeGalleryImage}
        />
      )}

      {showAddWAD && (
        <AddWADForm
          defaultIWAD={route.iwad || currentWad?.iwad}
          onClose={() => setShowAddWAD(false)}
          onSubmit={addWAD}
        />
      )}

      {tierEditingWAD && (
        <TierEditor
          wad={tierEditingWAD}
          onClose={() => setTierEditingWADId(null)}
          onSave={(tiers) => saveTiers(tierEditingWAD.id, tiers)}
        />
      )}

      {showImportExport && (
        <ImportExportModal
          store={store}
          images={images}
          onClose={() => setShowImportExport(false)}
          onImport={importJSON}
        />
      )}

      <Toast message={toast} onDismiss={() => setToast('')} />

      {/* Tweaks panel */}
      {(typeof TweaksPanel === 'function') && (
        <TweaksPanel title="Tweaks">
          <TweakSection label="Accent color" />
          <TweakSelect
            label="Accent"
            value={tweaks.accent}
            options={[
              { label: 'Blue', value: 'blue' },
              { label: 'Teal', value: 'teal' },
              { label: 'Sage', value: 'sage' },
              { label: 'Plum', value: 'plum' },
              { label: 'Crimson', value: 'crim' },
            ]}
            onChange={(v) => setTweak('accent', v)}
          />
          <TweakSection label="Background" />
          <TweakSelect
            label="Ground"
            value={tweaks.ground}
            options={[
              { label: 'Soft gray', value: 'paper' },
              { label: 'Neutral gray', value: 'soft-gray' },
              { label: 'Warm gray', value: 'warm-gray' },
              { label: 'Cool slate', value: 'cool-slate' },
            ]}
            onChange={(v) => setTweak('ground', v)}
          />
          <TweakSection label="Display" />
          <TweakToggle
            label="UV-Max times"
            value={!!tweaks.showUvmax}
            onChange={(v) => setTweak('showUvmax', v)}
          />
        </TweaksPanel>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
