/* ============================================================
   DoomInfo components — small composable parts
   ============================================================ */

const { useState, useEffect, useRef, useMemo, useCallback } = React;

// ------------------------------------------------------------
// GradePill — small pill, color from canonical key.
// Shows the numerical tier point next to the label (smaller).
// type can be 'q', 'd', or 'ost' (uses the quality tier system).
// ------------------------------------------------------------
function GradePill({ canonical, label, type, size, withLabel }) {
  if (!canonical) return null;
  const colorType = type === 'ost' ? 'q' : type;
  const pal = gradePalette(canonical, colorType);
  const cls = 'gpill' + (size === 'lg' ? ' lg' : '');
  const pts = tierPoints(canonical, colorType);
  return (
    <span
      className={cls}
      style={{
        color: pal.fg,
        background: pal.bg,
        borderColor: pal.edge,
        boxShadow: pal.glow,
      }}
      title={canonical !== label ? `canonical: ${canonical}` : undefined}
    >
      <span className="gswatch" style={{ background: pal.fg }} />
      {withLabel && <span className="glabel">{type === 'q' ? 'Q' : type === 'd' ? 'D' : 'MIDI'}</span>}
      <span className="gname">{label || canonical}</span>
      {pts != null && <span className="gpts">{fmtPoints(pts)}</span>}
    </span>
  );
}

// ------------------------------------------------------------
// CoverImage — placeholder + image with click-to-upload
// ------------------------------------------------------------
function CoverImage({ src, placeholderText, hint, onUpload, className, glyphSize }) {
  return (
    <div className={className} onClick={(e) => { e.stopPropagation(); onUpload?.(); }}>
      {src ? (
        <img src={src} alt="" />
      ) : (
        <div className="placeholder">
          <span style={glyphSize ? { fontSize: glyphSize } : undefined}>
            {placeholderText || '◰'}
          </span>
        </div>
      )}
      {hint && !src && <span className="upload-hint">{hint}</span>}
    </div>
  );
}

// ------------------------------------------------------------
// Masthead
// ------------------------------------------------------------
function Masthead({ currentIWAD, onSelectIWAD, onHome, counts, onAddWAD, onImportExport }) {
  return (
    <header className="masthead">
      <div className="masthead-inner">
        <div className="masthead-brand" onClick={onHome}>
          <div className="brand-mark">D</div>
          <div className="brand-text">
            DoomInfo<em>archive</em>
          </div>
        </div>
        <div className="iwad-tabs">
          {IWADS.map(iw => (
            <button
              key={iw}
              className={'iwad-tab' + (currentIWAD === iw ? ' active' : '')}
              onClick={() => onSelectIWAD(iw)}
            >
              <span>{iw}</span>
              <span className="count">{counts[iw] || 0}</span>
            </button>
          ))}
        </div>
        <div className="masthead-actions">
          <button className="masthead-btn" onClick={onImportExport} title="Import / Export JSON">
            <span className="masthead-btn-glyph">⇅</span> Backup
          </button>
          <button className="masthead-btn primary" onClick={onAddWAD}>
            <span className="masthead-btn-glyph">＋</span> Add WAD
          </button>
        </div>
      </div>
    </header>
  );
}

// ------------------------------------------------------------
// Subbar — search + sort + count
// ------------------------------------------------------------
function Subbar({ query, onQuery, sort, onSort, count, context }) {
  return (
    <div className="subbar">
      <div className="search-wrap">
        <span className="search-glyph">⌕</span>
        <input
          className="search-input"
          placeholder="Search WADs, authors, maps…"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
        />
      </div>
      <div className="sort-control">
        <span className="sort-label">sort</span>
        <select className="sort-select" value={sort} onChange={(e) => onSort(e.target.value)}>
          <option value="alpha">A → Z</option>
          <option value="alpha-desc">Z → A</option>
          <option value="release">Newest first</option>
          <option value="release-asc">Oldest first</option>
          <option value="quality">Quality tier</option>
          <option value="difficulty">Difficulty tier</option>
        </select>
      </div>
      <div className="result-count">
        {count} {count === 1 ? 'entry' : 'entries'}
        {context && <> · {context}</>}
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// HomeView — landing page across all IWADs
// ------------------------------------------------------------
function HomeView({ store, onPickIWAD }) {
  const total = store.wads.length;
  const totalMaps = store.wads.reduce((s, w) => s + (w.maps?.length || 0), 0);
  const formats = new Set(store.wads.map(w => w.format).filter(Boolean));
  const authors = new Set(store.wads.map(w => w.author).filter(Boolean));

  const byIwad = useMemo(() => {
    const m = {};
    IWADS.forEach(iw => m[iw] = []);
    store.wads.forEach(w => { if (m[w.iwad]) m[w.iwad].push(w); });
    return m;
  }, [store.wads]);

  return (
    <div className="home">
      <div className="home-eyebrow">An archive of community Doom WADs</div>
      <h1 className="home-title">
        Catalog &<br />
        <em>Critique.</em>
      </h1>
      <p className="home-lede">
        A personal index of community-made Doom WADs — every map ranked, captured,
        and annotated. Built for the long-form review.
      </p>

      <div className="home-stats">
        <div className="home-stat">
          <div className="home-stat-num">{total}</div>
          <div className="home-stat-label">WADs catalogued</div>
        </div>
        <div className="home-stat">
          <div className="home-stat-num">{totalMaps.toLocaleString()}</div>
          <div className="home-stat-label">Maps logged</div>
        </div>
        <div className="home-stat">
          <div className="home-stat-num">{authors.size}</div>
          <div className="home-stat-label">Authors</div>
        </div>
        <div className="home-stat">
          <div className="home-stat-num">{formats.size}</div>
          <div className="home-stat-label">Source formats</div>
        </div>
      </div>

      <div className="home-section-title">
        Browse <em>by IWAD</em>
      </div>
      <div className="home-section-sub">
        WADs are grouped by their parent IWAD, then sorted alphabetically.
      </div>

      <div className="home-iwad-grid">
        {IWADS.map(iw => {
          const list = byIwad[iw] || [];
          const mapCount = list.reduce((s, w) => s + (w.maps?.length || 0), 0);
          return (
            <div key={iw} className="iwad-card" onClick={() => onPickIWAD(iw)}>
              <div className="iwad-card-eyebrow">{iw === 'Doom 3' ? 'Standalone' : 'IWAD'}</div>
              <div className="iwad-card-title">{iw}</div>
              <div className="iwad-card-meta">
                <span>{list.length} WADs</span>
                <span>{mapCount.toLocaleString()} maps</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// IWADGridView — list of WAD cards under one IWAD
// ------------------------------------------------------------
function IWADGridView({ iwad, store, images, query, sort, onOpenWAD, onUploadCover }) {
  const wads = useMemo(() => {
    const list = store.wads.filter(w => w.iwad === iwad);
    let entries = list.map(w => [w.name, w]);
    if (query) {
      const q = query.toLowerCase();
      entries = entries.filter(([name, w]) =>
        name.toLowerCase().includes(q)
        || (w.author || '').toLowerCase().includes(q)
        || (w.maps || []).some(m => (m.name || '').toLowerCase().includes(q))
      );
    }
    return sortWADs(entries, sort);
  }, [iwad, store, query, sort]);

  const mapCount = wads.reduce((s, [_, w]) => s + (w.maps?.length || 0), 0);

  return (
    <div className="wad-grid-wrap">
      <div className="iwad-hero">
        <div>
          <div className="iwad-hero-eyebrow">The {iwad} canon, sorted alphabetically</div>
          <h2 className="iwad-hero-title">{iwad}</h2>
        </div>
        <div className="iwad-hero-stats">
          <div className="iwad-hero-stat">
            <div className="n">{wads.length}</div>
            <div className="l">WADs</div>
          </div>
          <div className="iwad-hero-stat">
            <div className="n">{mapCount.toLocaleString()}</div>
            <div className="l">Maps</div>
          </div>
        </div>
      </div>

      {wads.length === 0 ? (
        <div style={{ padding: '64px 0', textAlign: 'center', color: 'var(--ink-4)', fontFamily: 'var(--editorial)', fontStyle: 'normal', fontSize: 18 }}>
          No WADs under {iwad} {query && <>matching &ldquo;{query}&rdquo;</>}. Add one with the button above.
        </div>
      ) : (
        <div className="wad-grid">
          {wads.map(([name, w]) => {
            const imgKey = `wad:${w.id}`;
            const img = images[imgKey];
            return (
              <article key={w.id} className="wad-card" onClick={() => onOpenWAD(w.id)}>
                <div className="wad-card-cover">
                  {img ? (
                    <img src={img} alt={name} />
                  ) : (
                    <div className="wad-card-cover-placeholder">
                      <span className="wad-card-cover-glyph">{(name[0] || '?').toUpperCase()}</span>
                    </div>
                  )}
                  <span
                    className="wad-card-cover-hint"
                    onClick={(e) => { e.stopPropagation(); onUploadCover(imgKey, 'cover'); }}
                  >
                    {img ? 'Replace ↗' : '＋ Add cover'}
                  </span>
                </div>
                <div className="wad-card-eyebrow">
                  <span>{w.maps?.length || 0} maps</span>
                  <span className="sep">·</span>
                  <span>{w.release ? w.release.slice(0, 4) : '——'}</span>
                  {w.format && <><span className="sep">·</span><span>{w.format}</span></>}
                </div>
                <h3 className="wad-card-title">{name}</h3>
                {w.author && <div className="wad-card-author">by {w.author}</div>}
                {(w.q_grade || w.d_grade || w.ost_grade) && (
                  <div className="wad-card-grades">
                    {w.q_grade && (
                      <GradePill
                        canonical={w.q_grade}
                        label={tierLabel(w.q_grade, w.tiers, 'q')}
                        type="q"
                        withLabel
                      />
                    )}
                    {w.d_grade && (
                      <GradePill
                        canonical={w.d_grade}
                        label={tierLabel(w.d_grade, w.tiers, 'd')}
                        type="d"
                        withLabel
                      />
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------
// EditableText — inline editable wrapper for plain text
// ------------------------------------------------------------
function EditableText({ value, onChange, placeholder, multiline, className, style }) {
  const ref = useRef(null);
  const handle = useCallback((e) => {
    onChange(e.target.value);
  }, [onChange]);
  if (multiline) {
    return (
      <textarea
        ref={ref}
        className={'editable-text ' + (className || '')}
        style={style}
        value={value || ''}
        placeholder={placeholder || ''}
        onChange={handle}
        rows={3}
      />
    );
  }
  return (
    <input
      ref={ref}
      className={'editable-text ' + (className || '')}
      style={style}
      value={value || ''}
      placeholder={placeholder || ''}
      onChange={handle}
    />
  );
}

// ------------------------------------------------------------
// AutoTextarea — auto-grows to fit content (no internal scroll)
// ------------------------------------------------------------
function AutoTextarea({ value, onChange, placeholder, className, style, minHeight = 80 }) {
  const ref = useRef(null);
  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    const next = Math.max(minHeight, el.scrollHeight);
    el.style.height = next + 'px';
  }, [minHeight]);

  useEffect(() => { resize(); }, [value, resize]);
  useEffect(() => {
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [resize]);

  return (
    <textarea
      ref={ref}
      className={className}
      style={{ ...style, overflow: 'hidden', resize: 'none' }}
      value={value || ''}
      placeholder={placeholder || ''}
      onChange={(e) => { onChange(e.target.value); resize(); }}
      onInput={resize}
    />
  );
}

// ------------------------------------------------------------
// Toast
// ------------------------------------------------------------
function Toast({ message, onDismiss }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => onDismiss(), 2200);
    return () => clearTimeout(t);
  }, [message, onDismiss]);
  if (!message) return null;
  return <div className="toast">{message}</div>;
}

// ------------------------------------------------------------
// Export to window
// ------------------------------------------------------------
Object.assign(window, {
  GradePill, CoverImage, Masthead, Subbar, HomeView, IWADGridView,
  EditableText, AutoTextarea, Toast,
});
