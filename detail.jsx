/* ============================================================
   DoomInfo detail views — WADDetailView + MapFullView
   ============================================================ */

// ------------------------------------------------------------
// WADDetailView — single WAD page with editable header + maps list
// ------------------------------------------------------------
function WADDetailView({ wad, store, images, onBack, onUpdateWAD, onUpdateMap, onUploadImage, onOpenMap, onAddMap, onReorderMaps, onSortMaps, onDeleteWAD, onEditTiers, onNavigateWAD }) {
  const coverKey = `wad:${wad.id}`;
  const coverImg = images[coverKey];

  // Drag-to-reorder state (index being dragged + index hovered over)
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);

  const handleDrop = () => {
    if (dragIdx != null && overIdx != null && dragIdx !== overIdx) {
      onReorderMaps(wad.id, dragIdx, overIdx);
    }
    setDragIdx(null);
    setOverIdx(null);
  };

  // Prev/next WADs within the same IWAD (alphabetical, matches default sort)
  const { prevWad, nextWad, wadIdx, iwadTotal } = useMemo(() => {
    const list = (store?.wads || [])
      .filter(w => w.iwad === wad.iwad)
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    const idx = list.findIndex(w => w.id === wad.id);
    return {
      prevWad: idx > 0 ? list[idx - 1] : null,
      nextWad: idx >= 0 && idx < list.length - 1 ? list[idx + 1] : null,
      wadIdx: idx,
      iwadTotal: list.length,
    };
  }, [store, wad.id, wad.iwad]);

  // Averages: prefer stored spreadsheet values, fall back to recomputing from maps
  const qAvg = useMemo(() => {
    if (wad.qual_avg && !isNaN(parseFloat(wad.qual_avg))) {
      return { score: parseFloat(wad.qual_avg).toFixed(2) };
    }
    return avgFromMaps(wad.maps || [], 'q');
  }, [wad.qual_avg, wad.maps]);

  const dAvg = useMemo(() => {
    if (wad.diff_avg && !isNaN(parseFloat(wad.diff_avg))) {
      return { score: parseFloat(wad.diff_avg).toFixed(2) };
    }
    return avgFromMaps(wad.maps || [], 'd');
  }, [wad.diff_avg, wad.maps]);

  const tiers = wad.tiers || { quality: {}, difficulty: {} };

  // Inline edit handlers
  const set = (patch) => onUpdateWAD(wad.id, patch);

  return (
    <div className="wad-detail">
      <div className="crumbs">
        <button onClick={() => onBack(null)}>Home</button>
        <span className="sep">/</span>
        <button onClick={() => onBack(wad.iwad)}>{wad.iwad}</button>
        <span className="sep">/</span>
        <span style={{ color: 'var(--ink)' }}>{wad.name}</span>

        {iwadTotal > 1 && (
          <div className="wad-pager top">
            <button
              className="wad-pager-btn"
              disabled={!prevWad}
              onClick={(e) => { e.currentTarget.blur(); prevWad && onNavigateWAD(prevWad.id); }}
              title={prevWad ? `Previous: ${prevWad.name}` : 'No previous WAD'}
            >
              <span className="pager-arrow">←</span>
              <span className="pager-meta">
                <span className="pager-kicker">Prev WAD</span>
                <span className="pager-name">{prevWad ? prevWad.name : '—'}</span>
              </span>
            </button>
            <div className="wad-pager-counter">
              {wadIdx + 1} <span className="of">/</span> {iwadTotal}
            </div>
            <button
              className="wad-pager-btn next"
              disabled={!nextWad}
              onClick={(e) => { e.currentTarget.blur(); nextWad && onNavigateWAD(nextWad.id); }}
              title={nextWad ? `Next: ${nextWad.name}` : 'No next WAD'}
            >
              <span className="pager-meta">
                <span className="pager-kicker">Next WAD</span>
                <span className="pager-name">{nextWad ? nextWad.name : '—'}</span>
              </span>
              <span className="pager-arrow">→</span>
            </button>
          </div>
        )}
      </div>

      <div className="wad-detail-hero">
        <div
          className="wad-hero-cover"
          onClick={() => onUploadImage(coverKey, 'cover')}
          title="Click to add cover image"
        >
          {coverImg ? (
            <img src={coverImg} alt={wad.name} />
          ) : (
            <div className="placeholder">
              <span>{(wad.name[0] || '?').toUpperCase()}</span>
            </div>
          )}
          <span className="upload-hint">
            {coverImg ? 'Click to replace ↗' : '＋ Click to add WAD cover'}
          </span>
        </div>

        <div className="wad-hero-info">
          <div className="wad-hero-eyebrow">{wad.iwad} · {wad.format || 'Format unset'}</div>

          <h1 className="wad-hero-title">
            <EditableText
              value={wad.name}
              onChange={(v) => set({ name: v })}
              placeholder="Untitled WAD"
            />
          </h1>

          <div className="wad-hero-author">
            by <EditableText
              value={wad.author}
              onChange={(v) => set({ author: v })}
              placeholder="(author unknown)"
              style={{ width: 'auto', display: 'inline-block', minWidth: 200 }}
            />
          </div>

          <div className="wad-hero-meta">
            <div className="wad-hero-meta-item">
              <span className="l">Format</span>
              <select
                className="v"
                value={wad.format}
                onChange={(e) => set({ format: e.target.value })}
                style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--ink)', cursor: 'pointer', padding: 0 }}
              >
                <option value="">—</option>
                {FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div className="wad-hero-meta-item">
              <span className="l">Release</span>
              <input
                type="date"
                value={wad.release || ''}
                onChange={(e) => set({ release: e.target.value })}
                style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--ink)', fontFamily: 'var(--ui)', fontSize: 15, fontWeight: 500, padding: 0, colorScheme: 'dark' }}
              />
            </div>
            <div className="wad-hero-meta-item">
              <span className="l">Map count</span>
              <input
                value={wad.maps_count || ''}
                onChange={(e) => set({ maps_count: e.target.value })}
                placeholder={String(wad.maps?.length || 0)}
                style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--ink)', fontFamily: 'var(--ui)', fontSize: 15, fontWeight: 500, padding: 0, width: 80 }}
              />
            </div>
          </div>

          <div className="wad-hero-grades">
            <WADGradeCard
              label="Overall Quality"
              type="q"
              canonical={wad.q_grade}
              display={tierLabel(wad.q_grade, tiers, 'q')}
              avg={qAvg}
              tiers={DEFAULT_QUALITY_TIERS}
              overrides={tiers.quality}
              onChange={(v) => set({ q_grade: v })}
            />
            <WADGradeCard
              label="Overall Difficulty"
              type="d"
              canonical={wad.d_grade}
              display={tierLabel(wad.d_grade, tiers, 'd')}
              avg={dAvg}
              tiers={DEFAULT_DIFFICULTY_TIERS}
              overrides={tiers.difficulty}
              onChange={(v) => set({ d_grade: v })}
            />
            <WADGradeCard
              label="Soundtrack"
              type="q"
              canonical={wad.ost_grade}
              display={tierLabel(wad.ost_grade, tiers, 'q')}
              tiers={DEFAULT_QUALITY_TIERS}
              overrides={tiers.quality}
              onChange={(v) => set({ ost_grade: v })}
            />
            <div style={{ flex: 1 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignSelf: 'flex-start' }}>
              <button className="btn sm" onClick={onEditTiers}>⚙ Rename tiers</button>
              <button className="btn sm danger" onClick={() => {
                if (confirm(`Delete the WAD "${wad.name}" and all its maps? This cannot be undone.`)) {
                  onDeleteWAD(wad.id);
                }
              }}>🗑 Delete WAD</button>
            </div>
          </div>
        </div>
      </div>

      <section className="wad-intro">
        <div className="wad-intro-head">
          <span className="wad-intro-eyebrow">Introduction</span>
          <span className="wad-intro-eyebrow-sub">A note before the maps</span>
        </div>
        <AutoTextarea
          className="wad-intro-textarea"
          value={wad.intro || ''}
          onChange={(v) => set({ intro: v })}
          placeholder="Write the long-form introduction for this WAD — premise, history, what to expect, your overall take. Auto-saves as you type."
          minHeight={140}
        />
      </section>

      <div className="maps-section">
        <div className="maps-section-head">
          <div className="maps-section-title">
            Maps <em>({wad.maps?.length || 0})</em>
          </div>
          <div className="maps-section-controls">
            <span className="maps-reorder-hint">Drag ⠿ to reorder</span>
            <button className="btn sm" onClick={() => onSortMaps(wad.id)}>↕ Sort by slot</button>
            <button className="btn sm" onClick={() => onAddMap(wad.id)}>＋ Add map</button>
          </div>
        </div>

        {(!wad.maps || wad.maps.length === 0) ? (
          <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--ink-4)', fontFamily: 'var(--editorial)', fontStyle: 'normal', fontSize: 18 }}>
            No maps logged yet — add one above.
          </div>
        ) : (
          <div className="map-table">
            <div className="map-row map-row-header">
              <div className="mh-handle"></div>
              <div className="mh-thumb"></div>
              <div className="mh-number">Slot</div>
              <div className="mh-name">Map</div>
              <div className="mh-author">Author(s)</div>
              <div className="mh-num">Q</div>
              <div className="mh-num">D</div>
              <div className="mh-num">MIDI</div>
              <div className="mh-stat">Kills</div>
              <div className="mh-stat">Items</div>
              <div className="mh-stat">Secrets</div>
              <div className="mh-uvmax">UV-Max</div>
            </div>
            {wad.maps.map((map, idx) => (
              <MapRow
                key={map.id}
                map={map}
                idx={idx}
                wad={wad}
                images={images}
                isDragging={dragIdx === idx}
                isDropTarget={overIdx === idx && dragIdx !== idx}
                onDragStart={() => setDragIdx(idx)}
                onDragOver={() => setOverIdx(idx)}
                onDragEnd={handleDrop}
                onOpen={() => onOpenMap(wad.id, map.id)}
                onUploadThumb={() => onUploadImage(`map:${wad.id}:${map.id}`, 'thumb')}
                onUpdateMap={onUpdateMap}
              />
            ))}
          </div>
        )}
      </div>

      <section className="wad-intro wad-conclusion">
        <div className="wad-intro-head">
          <span className="wad-intro-eyebrow">Conclusion</span>
          <span className="wad-intro-eyebrow-sub">Final thoughts after the run</span>
        </div>
        <AutoTextarea
          className="wad-intro-textarea"
          value={wad.conclusion || ''}
          onChange={(v) => set({ conclusion: v })}
          placeholder="Wrap-up the WAD here — overall verdict, standout moments, who it&rsquo;s for, what comes next. Auto-saves as you type."
          minHeight={140}
        />
      </section>

      <section className="top-maps">
        <div className="top-maps-grid">
          <TopMapsList
            wad={wad}
            field="topBest"
            title="Top Maps"
            accent="var(--gold)"
            onChange={(list) => set({ topBest: list })}
          />
          <TopMapsList
            wad={wad}
            field="topHardest"
            title="Hardest Maps"
            accent="var(--crim)"
            onChange={(list) => set({ topHardest: list })}
          />
        </div>
      </section>

      {iwadTotal > 1 && (
        <nav className="wad-pager bottom">
          <button
            className="wad-pager-btn lg"
            disabled={!prevWad}
            onClick={(e) => { e.currentTarget.blur(); prevWad && onNavigateWAD(prevWad.id); }}
          >
            <span className="pager-arrow">←</span>
            <span className="pager-meta">
              <span className="pager-kicker">Previous WAD in {wad.iwad}</span>
              <span className="pager-name lg">{prevWad ? prevWad.name : 'No previous WAD'}</span>
              {prevWad?.author && <span className="pager-sub">by {prevWad.author}</span>}
            </span>
          </button>
          <button
            className="wad-pager-btn lg next"
            disabled={!nextWad}
            onClick={(e) => { e.currentTarget.blur(); nextWad && onNavigateWAD(nextWad.id); }}
          >
            <span className="pager-meta">
              <span className="pager-kicker">Next WAD in {wad.iwad}</span>
              <span className="pager-name lg">{nextWad ? nextWad.name : 'No next WAD'}</span>
              {nextWad?.author && <span className="pager-sub">by {nextWad.author}</span>}
            </span>
            <span className="pager-arrow">→</span>
          </button>
        </nav>
      )}
    </div>
  );
}

// ------------------------------------------------------------
// WADGradeCard — large editable grade selector with avg hint
// ------------------------------------------------------------
function WADGradeCard({ label, type, canonical, display, avg, tiers, overrides, onChange }) {
  const pal = canonical ? gradePalette(canonical, type) : null;
  const pts = canonical ? tierPoints(canonical, type) : null;

  const cardStyle = pal ? {
    background: `linear-gradient(180deg, ${pal.solid}1c 0%, transparent 100%), var(--bg-1)`,
    borderColor: pal.edge,
    boxShadow: pal.glow !== 'none' ? `0 0 32px ${pal.fg}22` : 'none',
  } : {};

  const accentStyle = pal ? {
    background: pal.solid,
  } : { background: 'var(--line-2)' };

  return (
    <div className="wad-grade-card" style={cardStyle} title={avg ? `Average: ${avg.score}` : undefined}>
      <div className="wad-grade-card-accent" style={accentStyle} />
      <div className="l">{label}</div>
      <div className="wad-grade-card-row">
        <select
          value={canonical || ''}
          onChange={(e) => onChange(e.target.value)}
          style={{
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontFamily: 'var(--display)',
            fontSize: 24,
            color: pal?.fg || 'var(--ink-3)',
            padding: 0,
            cursor: 'pointer',
            letterSpacing: '-0.3px',
            appearance: 'none',
            textOverflow: 'ellipsis',
            maxWidth: '100%',
            textShadow: pal?.glow !== 'none' && pal ? `0 0 16px ${pal.fg}55` : 'none',
          }}
        >
          <option value="">— Unrated —</option>
          {tiers.map(t => {
            const tp = tierPoints(t, type);
            return (
              <option key={t} value={t}>
                {(overrides?.[t] || t)}{overrides?.[t] ? ` (${t})` : ''}{tp != null ? `  · ${fmtPoints(tp)}` : ''}
              </option>
            );
          })}
        </select>
        {pts != null && (
          <span className="wad-grade-pts" style={{ background: pal.solid + '1f', color: pal.fg, borderColor: pal.edge }}>
            {fmtPoints(pts)}
          </span>
        )}
      </div>
      {avg && (
        <div className="avg-hint">avg <b style={{ color: 'var(--ink-2)', fontWeight: 500 }}>{avg.score}</b></div>
      )}
    </div>
  );
}

// ------------------------------------------------------------
// GradeNum — compact tier-point chip (just the number, tier-colored)
// ------------------------------------------------------------
function GradeNum({ canonical, type }) {
  if (!canonical) return null;
  const ct = type === 'ost' ? 'q' : type;
  const pal = gradePalette(canonical, ct);
  const pts = tierPoints(canonical, ct);
  if (pts == null) return null;
  return (
    <span
      className="grade-num"
      style={{ color: pal.fg, background: pal.bg, borderColor: pal.edge, boxShadow: pal.glow }}
      title={canonical}
    >
      {fmtPoints(pts)}
    </span>
  );
}

// ------------------------------------------------------------
// MapRow — a row in the maps table
// ------------------------------------------------------------
function MapRow({ map, idx, wad, images, onOpen, onUploadThumb, onUpdateMap, isDragging, isDropTarget, onDragStart, onDragOver, onDragEnd }) {
  const thumbKey = `map:${wad.id}:${map.id}`;
  const img = images[thumbKey];
  const tiers = wad.tiers || {};
  const cls = 'map-row'
    + (isDragging ? ' dragging' : '')
    + (isDropTarget ? ' drop-target' : '');
  return (
    <div
      className={cls}
      onClick={onOpen}
      onDragOver={(e) => { e.preventDefault(); onDragOver?.(); }}
      onDrop={(e) => { e.preventDefault(); onDragEnd?.(); }}
    >
      <div
        className="map-row-handle"
        draggable
        title="Drag to reorder"
        onClick={(e) => e.stopPropagation()}
        onDragStart={(e) => { e.stopPropagation(); e.dataTransfer.effectAllowed = 'move'; onDragStart?.(); }}
        onDragEnd={(e) => { e.stopPropagation(); onDragEnd?.(); }}
      >⠿</div>
      <div className="map-row-thumb" onClick={(e) => { e.stopPropagation(); onUploadThumb(); }}>
        {img ? (
          <img src={img} alt={map.name} />
        ) : (
          <div className="thumb-placeholder">+IMG</div>
        )}
      </div>
      <div className="map-row-number">{map.number || `MAP${String(idx + 1).padStart(2, '0')}`}</div>
      <div className="map-row-name-cell">
        <div className="map-row-name">
          {map.name || <span style={{ color: 'var(--ink-4)', fontStyle: 'normal', fontFamily: 'var(--editorial)' }}>Untitled map</span>}
          {map.demo && <span className="map-flag demo" title="Demo recorded">▶ DEMO</span>}
          {map.best && <span className="map-flag">★ Best</span>}
          {map.hardest && <span className="map-flag hardest">▲ Hardest</span>}
        </div>
        <input
          className="map-row-sub-input"
          value={map.midi || ''}
          placeholder="MIDI name"
          title="Edit MIDI name"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => onUpdateMap(wad.id, map.id, { midi: e.target.value })}
        />
      </div>
      <div className="map-row-author-cell">
        <input
          className="map-row-author-input"
          value={map.author || ''}
          placeholder="—"
          title="Edit map author(s)"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => onUpdateMap(wad.id, map.id, { author: e.target.value })}
        />
        <input
          className="map-row-sub-input"
          value={map.midi_author || ''}
          placeholder="MIDI author"
          title="Edit MIDI author"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => onUpdateMap(wad.id, map.id, { midi_author: e.target.value })}
        />
      </div>
      <div className="map-row-num-cell">
        {map.quality && <GradeNum canonical={map.quality} type="q" />}
      </div>
      <div className="map-row-num-cell">
        {map.difficulty && <GradeNum canonical={map.difficulty} type="d" />}
      </div>
      <div className="map-row-num-cell">
        {map.ost && <GradeNum canonical={map.ost} type="ost" />}
      </div>
      <div className="map-row-stat">{map.kills || '—'}</div>
      <div className="map-row-stat">{map.items || '—'}</div>
      <div className="map-row-stat">{map.secrets || '—'}</div>
      <div className="map-row-uvmax">{map.uvmax || '—'}</div>
    </div>
  );
}

// ------------------------------------------------------------
// RichTextEditor — contentEditable with bold / italic / underline.
// Stores HTML; auto-grows; supports ⌘/Ctrl + B / I / U.
// Back-compat: plain-text reviews are shown with line breaks preserved.
// ------------------------------------------------------------
const HTML_TAG_RE = /<\/?(b|strong|i|em|u|br|div|p|span)\b/i;

function plainToHtml(text) {
  // Escape, then preserve line breaks
  const esc = (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return esc.replace(/\n/g, '<br>');
}

function RichTextEditor({ value, onChange, placeholder, minHeight }) {
  const ref = useRef(null);
  const lastHtml = useRef('');

  // Normalize incoming value to HTML once (plain-text reviews → <br> HTML)
  const initialHtml = useMemo(() => {
    const v = value || '';
    return HTML_TAG_RE.test(v) ? v : plainToHtml(v);
  }, []); // only on mount; subsequent edits flow through the DOM

  // When switching to a different map, the component remounts (keyed), so we
  // only need to set initial content on mount.
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== initialHtml) {
      ref.current.innerHTML = initialHtml;
      lastHtml.current = initialHtml;
    }
  }, [initialHtml]);

  const emit = () => {
    const html = ref.current ? ref.current.innerHTML : '';
    if (html !== lastHtml.current) {
      lastHtml.current = html;
      onChange(html);
    }
  };

  const exec = (cmd) => {
    ref.current?.focus();
    document.execCommand(cmd, false);
    emit();
  };

  const onKeyDown = (e) => {
    if (e.metaKey || e.ctrlKey) {
      const k = e.key.toLowerCase();
      if (k === 'b' || k === 'i' || k === 'u') {
        e.preventDefault();
        document.execCommand(k === 'b' ? 'bold' : k === 'i' ? 'italic' : 'underline', false);
        emit();
      }
    }
  };

  const isEmpty = !value || (!HTML_TAG_RE.test(value) ? value.trim() === '' : ref.current && ref.current.textContent.trim() === '');

  return (
    <div className="rte">
      <div className="rte-toolbar">
        <button type="button" className="rte-btn" title="Bold (⌘B)" onMouseDown={(e) => { e.preventDefault(); exec('bold'); }}><b>B</b></button>
        <button type="button" className="rte-btn" title="Italic (⌘I)" onMouseDown={(e) => { e.preventDefault(); exec('italic'); }}><i>I</i></button>
        <button type="button" className="rte-btn" title="Underline (⌘U)" onMouseDown={(e) => { e.preventDefault(); exec('underline'); }}><u>U</u></button>
        <span className="rte-sep" />
        <button type="button" className="rte-btn rte-btn-clear" title="Clear formatting" onMouseDown={(e) => { e.preventDefault(); exec('removeFormat'); }}>⨯</button>
      </div>
      <div
        ref={ref}
        className="fv-review rte-area"
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder || ''}
        style={{ minHeight: minHeight || 280 }}
        onInput={emit}
        onBlur={emit}
        onKeyDown={onKeyDown}
      />
    </div>
  );
}

// ------------------------------------------------------------
// MapFullView — full-screen overlay with hero, stats, review
// ------------------------------------------------------------
function MapFullView({ wad, map, images, review, onBack, onUpdateMap, onUploadImage, onUpdateReview, onDeleteMap, onNavigateMap, onAddGalleryImage, onRemoveGalleryImage }) {
  const heroKey = `map:${wad.id}:${map.id}`;
  const heroImg = images[heroKey];
  const tiers = wad.tiers || {};

  // Prev/next map siblings
  const mapIdx = wad.maps.findIndex(m => m.id === map.id);
  const prevMap = mapIdx > 0 ? wad.maps[mapIdx - 1] : null;
  const nextMap = mapIdx < wad.maps.length - 1 ? wad.maps[mapIdx + 1] : null;

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Scroll the overlay back to top whenever the map id changes
  useEffect(() => {
    const overlay = document.querySelector('.fullview');
    if (overlay) overlay.scrollTo({ top: 0, behavior: 'auto' });
  }, [map.id]);

  // Escape closes the overlay
  useEffect(() => {
    const h = (e) => {
      if (e.key === 'Escape') onBack();
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onBack]);

  const update = (patch) => onUpdateMap(wad.id, map.id, patch);

  const qPal = map.quality ? gradePalette(map.quality, 'q') : null;
  const dPal = map.difficulty ? gradePalette(map.difficulty, 'd') : null;
  const oPal = map.ost ? gradePalette(map.ost, 'q') : null;

  const fvGradeStyle = (pal) => pal ? {
    background: `linear-gradient(180deg, ${pal.solid}1c 0%, transparent 100%), var(--bg-1)`,
    borderColor: pal.edge,
    boxShadow: pal.glow !== 'none' ? `0 0 32px ${pal.fg}22` : 'none',
  } : {};

  return (
    <div className="fullview">
      <button className="fullview-back" onClick={onBack}>
        ← Back to {wad.name}
      </button>

      <div className="fullview-pager top">
        <button
          className="fullview-pager-btn"
          disabled={!prevMap}
          onClick={(e) => { e.currentTarget.blur(); prevMap && onNavigateMap(prevMap.id); }}
          title={prevMap ? `Previous: ${prevMap.name || prevMap.number}` : 'No previous map'}
        >
          <span className="pager-arrow">←</span>
          <span className="pager-meta">
            <span className="pager-kicker">Prev</span>
            <span className="pager-name">{prevMap ? (prevMap.name || prevMap.number || 'untitled') : '—'}</span>
          </span>
        </button>
        <div className="fullview-pager-counter">
          {mapIdx + 1} <span className="of">of</span> {wad.maps.length}
        </div>
        <button
          className="fullview-pager-btn next"
          disabled={!nextMap}
          onClick={(e) => { e.currentTarget.blur(); nextMap && onNavigateMap(nextMap.id); }}
          title={nextMap ? `Next: ${nextMap.name || nextMap.number}` : 'No next map'}
        >
          <span className="pager-meta">
            <span className="pager-kicker">Next</span>
            <span className="pager-name">{nextMap ? (nextMap.name || nextMap.number || 'untitled') : '—'}</span>
          </span>
          <span className="pager-arrow">→</span>
        </button>
      </div>

      <div className="fullview-hero-wrap">
        <div className="fullview-hero" onClick={() => onUploadImage(heroKey, 'hero')}>
          {heroImg ? (
            <img src={heroImg} alt={map.name} />
          ) : (
            <div className="placeholder">
              <div className="ph-glyph">{(map.number || 'MAP').slice(-2)}</div>
              <div className="ph-label">Click to add a screenshot</div>
            </div>
          )}
          {heroImg && <div className="upload-hint">Click hero to replace ↗</div>}
        </div>
      </div>

      <div className="fullview-body">
        <div className="fullview-eyebrow">
          <span>{wad.iwad}</span>
          <span className="dot">·</span>
          <span>{wad.name}</span>
          <span className="dot">·</span>
          <span>{map.number || `MAP${String((wad.maps.findIndex(m => m.id === map.id)) + 1).padStart(2, '0')}`}</span>
        </div>

        <h1 className="fullview-title">
          <AutoTextarea
            value={map.name}
            onChange={(v) => update({ name: v })}
            placeholder="Untitled map"
            className="fullview-title-input"
            minHeight={56}
          />
        </h1>
        <div className="fullview-author">
          <span className="byline-prefix">by</span>
          <AutoTextarea
            className="fullview-author-input"
            value={map.author || ''}
            onChange={(v) => update({ author: v })}
            placeholder={wad.author ? `(default: ${wad.author})` : '(authors)'}
            minHeight={32}
          />
        </div>

        <div className="fullview-grid">
          <div>
            <div className="fullview-grades">
              <div className="fv-grade" style={fvGradeStyle(qPal)}>
                <div className="fv-grade-accent" style={{ background: qPal ? qPal.solid : 'var(--line-2)' }} />
                <div className="l">
                  Quality
                  {map.quality && qPal && (
                    <span className="fv-grade-pts" style={{ background: qPal.solid + '1f', color: qPal.fg, borderColor: qPal.edge }}>
                      {fmtPoints(tierPoints(map.quality, 'q'))}
                    </span>
                  )}
                </div>
                <select
                  className="fv-grade-select"
                  style={{ color: qPal ? qPal.fg : 'var(--ink-3)', textShadow: qPal?.glow !== 'none' && qPal ? `0 0 18px ${qPal.fg}55` : 'none' }}
                  value={map.quality || ''}
                  onChange={(e) => update({ quality: e.target.value })}
                >
                  <option value="">— Unrated —</option>
                  {DEFAULT_QUALITY_TIERS.map(t => (
                    <option key={t} value={t}>{(tiers.quality?.[t] || t)} · {fmtPoints(tierPoints(t, 'q'))}</option>
                  ))}
                </select>
              </div>
              <div className="fv-grade" style={fvGradeStyle(dPal)}>
                <div className="fv-grade-accent" style={{ background: dPal ? dPal.solid : 'var(--line-2)' }} />
                <div className="l">
                  Difficulty
                  {map.difficulty && dPal && (
                    <span className="fv-grade-pts" style={{ background: dPal.solid + '1f', color: dPal.fg, borderColor: dPal.edge }}>
                      {fmtPoints(tierPoints(map.difficulty, 'd'))}
                    </span>
                  )}
                </div>
                <select
                  className="fv-grade-select"
                  style={{ color: dPal ? dPal.fg : 'var(--ink-3)', textShadow: dPal?.glow !== 'none' && dPal ? `0 0 18px ${dPal.fg}55` : 'none' }}
                  value={map.difficulty || ''}
                  onChange={(e) => update({ difficulty: e.target.value })}
                >
                  <option value="">— Unrated —</option>
                  {DEFAULT_DIFFICULTY_TIERS.map(t => (
                    <option key={t} value={t}>{(tiers.difficulty?.[t] || t)} · {fmtPoints(tierPoints(t, 'd'))}</option>
                  ))}
                </select>
              </div>
              <div className="fv-grade" style={{ ...fvGradeStyle(oPal), gridColumn: '1 / -1' }}>
                <div className="fv-grade-accent" style={{ background: oPal ? oPal.solid : 'var(--line-2)' }} />
                <div className="l">
                  MIDI (quality &amp; usage)
                  {map.ost && oPal && (
                    <span className="fv-grade-pts" style={{ background: oPal.solid + '1f', color: oPal.fg, borderColor: oPal.edge }}>
                      {fmtPoints(tierPoints(map.ost, 'q'))}
                    </span>
                  )}
                </div>
                <select
                  className="fv-grade-select"
                  style={{ color: oPal ? oPal.fg : 'var(--ink-3)', textShadow: oPal?.glow !== 'none' && oPal ? `0 0 18px ${oPal.fg}55` : 'none' }}
                  value={map.ost || ''}
                  onChange={(e) => update({ ost: e.target.value })}
                >
                  <option value="">— Unrated —</option>
                  {DEFAULT_QUALITY_TIERS.map(t => (
                    <option key={t} value={t}>{(tiers.quality?.[t] || t)} · {fmtPoints(tierPoints(t, 'q'))}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="fv-flags">
              <button
                className={'fv-flag' + (map.best ? ' on best' : '')}
                onClick={() => update({ best: !map.best })}
              >
                ★ Best in WAD
              </button>
              <button
                className={'fv-flag' + (map.hardest ? ' on hardest' : '')}
                onClick={() => update({ hardest: !map.hardest })}
              >
                ▲ Hardest in WAD
              </button>
            </div>

            <div className="fv-section-title">
              Review <em>/ notes</em>
              {(() => {
                // Count words/chars from plain text (strip any HTML)
                let plain = review || '';
                if (HTML_TAG_RE.test(plain)) {
                  const tmp = document.createElement('div');
                  tmp.innerHTML = plain;
                  plain = tmp.textContent || '';
                }
                plain = plain.replace(/\u00a0/g, ' ');
                const t = plain.trim();
                const words = t ? t.split(/\s+/).length : 0;
                const chars = plain.length;
                return (
                  <span className="fv-review-count">
                    <b>{words.toLocaleString()}</b> {words === 1 ? 'word' : 'words'}
                    <span className="dot">·</span>
                    <b>{chars.toLocaleString()}</b> {chars === 1 ? 'char' : 'chars'}
                  </span>
                );
              })()}
            </div>
            <RichTextEditor
              key={map.id}
              value={review || ''}
              onChange={(v) => onUpdateReview(map.id, v)}
              placeholder="Write your review or notes for this map… (auto-saves as you type)"
              minHeight={280}
            />

            <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
              <button className="btn sm danger" onClick={() => {
                if (confirm(`Delete map "${map.name}"? This cannot be undone.`)) {
                  onDeleteMap(wad.id, map.id);
                }
              }}>🗑 Delete map</button>
            </div>
          </div>

          <aside>
            <div className="fv-section-title">Specifications</div>
            <div className="fv-specs">
              <div className="fv-spec">
                <div className="l">Map slot</div>
                <input
                  className="fv-spec-input mono"
                  value={map.number || ''}
                  onChange={(e) => update({ number: e.target.value })}
                  placeholder="MAP01"
                />
              </div>
              <div className="fv-spec">
                <div className="l">UV-Max time</div>
                <input
                  className="fv-spec-input mono"
                  value={map.uvmax || ''}
                  onChange={(e) => update({ uvmax: e.target.value })}
                  placeholder="00:00:00"
                />
              </div>
              <div className="fv-spec">
                <div className="l">Monster count</div>
                <input
                  className="fv-spec-input mono"
                  value={map.kills || ''}
                  onChange={(e) => update({ kills: e.target.value })}
                  placeholder="—"
                />
              </div>
              <div className="fv-spec">
                <div className="l">Items</div>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className="fv-spec-input mono"
                  value={map.items || ''}
                  onChange={(e) => update({ items: e.target.value.replace(/[^0-9]/g, '') })}
                  placeholder="—"
                />
              </div>
              <div className="fv-spec">
                <div className="l">Secrets</div>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className="fv-spec-input mono"
                  value={map.secrets || ''}
                  onChange={(e) => update({ secrets: e.target.value.replace(/[^0-9]/g, '') })}
                  placeholder="—"
                />
              </div>
              <div className="fv-spec">
                <div className="l">Demo recorded</div>
                <button
                  type="button"
                  className={'fv-spec-toggle' + (map.demo ? ' on' : '')}
                  onClick={() => update({ demo: !map.demo })}
                >
                  <span className="fv-spec-toggle-box">{map.demo ? '✓' : ''}</span>
                  <span className="fv-spec-toggle-label">{map.demo ? 'Yes' : 'No'}</span>
                </button>
              </div>
              <div className="fv-spec" style={{ gridColumn: '1 / -1' }}>
                <div className="l">MIDI</div>
                <AutoTextarea
                  className="fv-spec-input"
                  value={map.midi || ''}
                  onChange={(v) => update({ midi: v })}
                  placeholder="track name"
                  minHeight={22}
                />
              </div>
              <div className="fv-spec" style={{ gridColumn: '1 / -1' }}>
                <div className="l">MIDI origin</div>
                <AutoTextarea
                  className="fv-spec-input"
                  value={map.midi_origin || ''}
                  onChange={(v) => update({ midi_origin: v })}
                  placeholder="bespoke, or source WAD / game"
                  minHeight={22}
                />
              </div>
              <div className="fv-spec" style={{ gridColumn: '1 / -1' }}>
                <div className="l">MIDI composer</div>
                <AutoTextarea
                  className="fv-spec-input"
                  value={map.midi_author || ''}
                  onChange={(v) => update({ midi_author: v })}
                  placeholder="—"
                  minHeight={22}
                />
              </div>
            </div>

            <div className="fv-after-specs">
              <PlaythroughEmbed
                url={map.playthrough || ''}
                onChange={(v) => update({ playthrough: v })}
              />
            </div>
          </aside>
        </div>

        <MapGallery
          wad={wad}
          map={map}
          images={images}
          onAdd={() => onAddGalleryImage(wad.id, map.id)}
          onRemove={(gid) => onRemoveGalleryImage(wad.id, map.id, gid)}
        />

        <nav className="fullview-pager bottom">
          <button
            className="fullview-pager-btn lg"
            disabled={!prevMap}
            onClick={(e) => { e.currentTarget.blur(); prevMap && onNavigateMap(prevMap.id); }}
          >
            <span className="pager-arrow">←</span>
            <span className="pager-meta">
              <span className="pager-kicker">Previous map</span>
              <span className="pager-name lg">{prevMap ? (prevMap.name || prevMap.number || 'untitled') : 'No previous map'}</span>
              {prevMap?.number && <span className="pager-sub">{prevMap.number}</span>}
            </span>
          </button>
          <button
            className="fullview-pager-btn lg next"
            disabled={!nextMap}
            onClick={(e) => { e.currentTarget.blur(); nextMap && onNavigateMap(nextMap.id); }}
          >
            <span className="pager-meta">
              <span className="pager-kicker">Next map</span>
              <span className="pager-name lg">{nextMap ? (nextMap.name || nextMap.number || 'untitled') : 'No next map'}</span>
              {nextMap?.number && <span className="pager-sub">{nextMap.number}</span>}
            </span>
            <span className="pager-arrow">→</span>
          </button>
        </nav>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// TopMapsList — ranked list of best/hardest maps, add/remove
// placements, each a dropdown of the WAD's maps.
// ------------------------------------------------------------
function TopMapsList({ wad, field, title, accent, onChange }) {
  const list = wad[field] || [];
  const maps = wad.maps || [];

  // Build the display label for a chosen map id
  const labelFor = (mapId) => {
    const m = maps.find(x => x.id === mapId);
    if (!m) return null;
    const slot = m.number || '—';
    const name = m.name || 'Untitled';
    return `${slot}: ${name}`;
  };

  const setAt = (i, mapId) => {
    const next = [...list];
    next[i] = mapId;
    onChange(next);
  };
  const removeAt = (i) => {
    const next = list.filter((_, idx) => idx !== i);
    onChange(next);
  };
  const addPlacement = () => {
    if (list.length >= 20) return;
    onChange([...list, '']);
  };

  return (
    <div className="top-list">
      <div className="top-list-head" style={{ borderColor: accent }}>
        <span className="top-list-rank-badge" style={{ background: accent }} />
        <h3 className="top-list-title">{title}</h3>
        <span className="top-list-count">{list.length}</span>
      </div>

      {list.length === 0 ? (
        <button className="top-list-empty" onClick={addPlacement}>
          ＋ Add first placement
        </button>
      ) : (
        <ol className="top-list-rows">
          {list.map((mapId, i) => {
            const label = mapId ? labelFor(mapId) : null;
            return (
              <li key={i} className="top-row">
                <span className="top-row-rank" style={{ color: accent }}>{i + 1}</span>
                <select
                  className="top-row-select"
                  value={mapId || ''}
                  onChange={(e) => setAt(i, e.target.value)}
                >
                  <option value="">— Select a map —</option>
                  {maps.map(m => (
                    <option key={m.id} value={m.id}>
                      {(m.number || '—')}: {m.name || 'Untitled'}
                    </option>
                  ))}
                </select>
                <span className={'top-row-label' + (label ? '' : ' empty')}>
                  {label || 'no map chosen'}
                </span>
                <button
                  className="top-row-remove"
                  title="Remove placement"
                  onClick={() => removeAt(i)}
                >✕</button>
              </li>
            );
          })}
        </ol>
      )}

      {list.length > 0 && (
        <button className="top-list-add" onClick={addPlacement}>
          ＋ Add placement
        </button>
      )}
    </div>
  );
}

// ------------------------------------------------------------
// PlaythroughEmbed — paste a video link; shows thumbnail, plays
// inline, title links out to the source.
// ------------------------------------------------------------
function PlaythroughEmbed({ url, onChange }) {
  const [playing, setPlaying] = useState(false);
  const video = useMemo(() => parseVideo(url), [url]);

  // Reset the inline player whenever the URL changes
  useEffect(() => { setPlaying(false); }, [url]);

  return (
    <div className="playthrough">
      <div className="fv-section-title">
        Playthrough <em>/ video</em>
      </div>

      <div className="playthrough-input-row">
        <span className="playthrough-input-glyph">▶</span>
        <input
          className="playthrough-input"
          value={url || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Paste a YouTube or Vimeo link…"
        />
        {url && (
          <button className="playthrough-clear" title="Clear" onClick={() => onChange('')}>✕</button>
        )}
      </div>

      {!url ? (
        <div className="playthrough-placeholder">
          <span className="pt-ph-glyph">▶</span>
          <span className="pt-ph-text">No playthrough linked yet</span>
          <span className="pt-ph-sub">Paste a video URL above to embed it here</span>
        </div>
      ) : video && video.provider === 'link' ? (
        <a className="playthrough-link-only" href={video.watch} target="_blank" rel="noopener noreferrer">
          <span className="pt-link-glyph">↗</span>
          <span className="pt-link-text">Open external link</span>
          <span className="pt-link-url">{video.watch}</span>
        </a>
      ) : playing && video.embed ? (
        <div className="playthrough-player">
          <iframe
            src={video.embed}
            title="Playthrough"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        <div className="playthrough-card">
          <button className="playthrough-thumb" onClick={() => setPlaying(true)} title="Play">
            {video.thumb ? (
              <img src={video.thumb} alt="" onError={(e) => { e.target.style.display = 'none'; }} />
            ) : (
              <div className="pt-thumb-fallback" />
            )}
            <span className="pt-play-badge">▶</span>
            <span className="pt-provider">{video.provider === 'youtube' ? 'YouTube' : 'Vimeo'}</span>
          </button>
          <div className="playthrough-meta">
            <button className="pt-play-inline" onClick={() => setPlaying(true)}>▶ Play here</button>
            <a
              className="pt-open-source"
              href={video.watch}
              target="_blank"
              rel="noopener noreferrer"
            >Open on {video.provider === 'youtube' ? 'YouTube' : 'Vimeo'} ↗</a>
          </div>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------
// MapGallery — extra screenshots with click-through arrows
// ------------------------------------------------------------
function MapGallery({ wad, map, images, onAdd, onRemove }) {
  const ids = map.gallery || [];
  const [idx, setIdx] = useState(0);

  // Keep index in range as images are added/removed
  useEffect(() => {
    if (idx > ids.length - 1) setIdx(Math.max(0, ids.length - 1));
  }, [ids.length, idx]);

  const safeIdx = Math.min(idx, Math.max(0, ids.length - 1));
  const curId = ids[safeIdx];
  const curKey = curId ? `gallery:${wad.id}:${map.id}:${curId}` : null;
  const curImg = curKey ? images[curKey] : null;

  const go = (dir) => {
    if (!ids.length) return;
    setIdx((safeIdx + dir + ids.length) % ids.length);
  };

  return (
    <section className="map-gallery">
      <div className="fv-section-title">
        Gallery <em>/ extra shots</em>
        <span className="map-gallery-count-label">
          {ids.length > 0 ? `${ids.length} ${ids.length === 1 ? 'image' : 'images'}` : 'none yet'}
        </span>
      </div>

      {ids.length === 0 ? (
        <button className="map-gallery-empty" onClick={onAdd}>
          <span className="mge-glyph">＋</span>
          <span className="mge-text">Add extra screenshots</span>
          <span className="mge-sub">Build a small click-through gallery for this map</span>
        </button>
      ) : (
        <div className="map-gallery-viewer">
          <div className="map-gallery-stage">
            {curImg ? (
              <img src={curImg} alt={`${map.name} — ${safeIdx + 1}`} />
            ) : (
              <div className="map-gallery-missing">image unavailable</div>
            )}

            {ids.length > 1 && (
              <>
                <button className="mg-arrow prev" onClick={() => go(-1)} title="Previous">‹</button>
                <button className="mg-arrow next" onClick={() => go(1)} title="Next">›</button>
              </>
            )}

            <div className="mg-counter">{safeIdx + 1} / {ids.length}</div>
            <button
              className="mg-remove"
              onClick={() => onRemove(curId)}
              title="Remove this image"
            >✕ Remove</button>
          </div>

          <div className="map-gallery-strip">
            {ids.map((gid, i) => {
              const k = `gallery:${wad.id}:${map.id}:${gid}`;
              const thumb = images[k];
              return (
                <button
                  key={gid}
                  className={'mg-thumb' + (i === safeIdx ? ' active' : '')}
                  onClick={() => setIdx(i)}
                >
                  {thumb ? <img src={thumb} alt="" /> : <span className="mg-thumb-missing">?</span>}
                </button>
              );
            })}
            <button className="mg-thumb add" onClick={onAdd} title="Add image">＋</button>
          </div>
        </div>
      )}
    </section>
  );
}

Object.assign(window, { WADDetailView, WADGradeCard, MapRow, GradeNum, MapFullView, MapGallery, TopMapsList, PlaythroughEmbed, RichTextEditor });
