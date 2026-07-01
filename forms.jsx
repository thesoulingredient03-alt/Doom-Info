/* ============================================================
   DoomInfo forms — AddWADForm, TierEditor, ImportExport
   ============================================================ */

// ------------------------------------------------------------
// AddWADForm — modal form to add a new WAD
// ------------------------------------------------------------
function AddWADForm({ onClose, onSubmit, defaultIWAD }) {
  const [name, setName] = useState('');
  const [author, setAuthor] = useState('');
  const [iwad, setIwad] = useState(defaultIWAD || 'Doom 2');
  const [format, setFormat] = useState('Boom');
  const [release, setRelease] = useState('');
  const [mapsCount, setMapsCount] = useState('');
  const [qGrade, setQGrade] = useState('');
  const [dGrade, setDGrade] = useState('');
  const [ostGrade, setOstGrade] = useState('');

  function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      author: author.trim(),
      iwad,
      format,
      release: release || '',
      maps_count: mapsCount || '',
      q_grade: qGrade,
      d_grade: dGrade,
      ost_grade: ostGrade,
    });
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="modal-eyebrow">New entry</div>
        <h2 className="modal-title">Add a WAD</h2>

        <form onSubmit={submit}>
          <div className="form-grid">
            <div className="form-field wide">
              <label>WAD Name *</label>
              <input
                autoFocus
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sunlust"
              />
            </div>

            <div className="form-field">
              <label>Author</label>
              <input
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Ribbiks, dannebubinga…"
              />
            </div>

            <div className="form-field">
              <label>IWAD</label>
              <select value={iwad} onChange={(e) => setIwad(e.target.value)}>
                {IWADS.map(iw => <option key={iw} value={iw}>{iw}</option>)}
              </select>
            </div>

            <div className="form-field">
              <label>Format</label>
              <select value={format} onChange={(e) => setFormat(e.target.value)}>
                {FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>

            <div className="form-field">
              <label>Release date</label>
              <input
                type="date"
                value={release}
                onChange={(e) => setRelease(e.target.value)}
              />
            </div>

            <div className="form-field">
              <label>Map count</label>
              <input
                type="number"
                min="1"
                value={mapsCount}
                onChange={(e) => setMapsCount(e.target.value)}
                placeholder="32"
              />
            </div>

            <div className="form-field">
              <label>Overall quality</label>
              <select value={qGrade} onChange={(e) => setQGrade(e.target.value)}>
                <option value="">— not yet rated —</option>
                {DEFAULT_QUALITY_TIERS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="form-field">
              <label>Overall difficulty</label>
              <select value={dGrade} onChange={(e) => setDGrade(e.target.value)}>
                <option value="">— not yet rated —</option>
                {DEFAULT_DIFFICULTY_TIERS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="form-field wide">
              <label>Soundtrack rating</label>
              <select value={ostGrade} onChange={(e) => setOstGrade(e.target.value)}>
                <option value="">— not yet rated —</option>
                {DEFAULT_QUALITY_TIERS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn primary">Create WAD</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// TierEditor — rename quality/difficulty tiers for ONE WAD
// ------------------------------------------------------------
function TierEditor({ wad, onClose, onSave }) {
  const initialQ = { ...(wad.tiers?.quality || {}) };
  const initialD = { ...(wad.tiers?.difficulty || {}) };
  const [qNames, setQNames] = useState(initialQ);
  const [dNames, setDNames] = useState(initialD);

  function setQ(canonical, val) {
    const next = { ...qNames };
    if (!val || val === canonical) delete next[canonical];
    else next[canonical] = val;
    setQNames(next);
  }
  function setD(canonical, val) {
    const next = { ...dNames };
    if (!val || val === canonical) delete next[canonical];
    else next[canonical] = val;
    setDNames(next);
  }

  function resetAll() {
    setQNames({});
    setDNames({});
  }

  function save() {
    onSave({ quality: qNames, difficulty: dNames });
  }

  return (
    <div className="tier-popover-backdrop" onClick={onClose}>
      <div className="tier-popover" onClick={(e) => e.stopPropagation()}>
        <div className="tier-popover-head">
          <div className="tier-popover-eyebrow">Per-WAD tier overrides</div>
          <div className="tier-popover-title">Rename tiers for {wad.name}</div>
          <div className="tier-popover-sub">
            Renames only affect this WAD. Leave a field blank to use the default. All map ratings
            stay linked to their canonical tier — only the display name changes.
          </div>
        </div>

        <div className="tier-cols">
          <div>
            <div className="tier-col-head">Quality Tiers</div>
            {DEFAULT_QUALITY_TIERS.map(t => {
              const color = gradeColor(t, 'q');
              const current = qNames[t] || '';
              return (
                <div key={t} className="tier-row">
                  <div className="tier-swatch" style={{ background: color }} />
                  <div className="tier-default">{t}</div>
                  <input
                    className={'tier-input' + (current ? ' changed' : '')}
                    value={current}
                    placeholder={t}
                    onChange={(e) => setQ(t, e.target.value)}
                  />
                </div>
              );
            })}
          </div>

          <div>
            <div className="tier-col-head">Difficulty Tiers</div>
            {DEFAULT_DIFFICULTY_TIERS.map(t => {
              const color = gradeColor(t, 'd');
              const current = dNames[t] || '';
              return (
                <div key={t} className="tier-row">
                  <div className="tier-swatch" style={{ background: color }} />
                  <div className="tier-default">{t}</div>
                  <input
                    className={'tier-input' + (current ? ' changed' : '')}
                    value={current}
                    placeholder={t}
                    onChange={(e) => setD(t, e.target.value)}
                  />
                </div>
              );
            })}
          </div>
        </div>

        <div className="tier-actions">
          <button className="btn ghost" onClick={resetAll}>Reset all</button>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={save}>Save tier names</button>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// ImportExportModal
// ------------------------------------------------------------
function ImportExportModal({ store, images, onClose, onImport }) {
  const fileRef = useRef(null);
  const [status, setStatus] = useState('');

  async function exportJSON() {
    setStatus('Building backup…');
    try {
      const blob = exportBackupZip(store, images);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const date = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `dominfo-backup-${date}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      const mb = (blob.size / 1048576).toFixed(1);
      setStatus(`Exported · ${Object.keys(images).length} images · ${mb} MB`);
    } catch (err) {
      setStatus('Export failed: ' + err.message);
    }
  }

  function importFromFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setStatus('Reading backup…');
    const isZip = /\.zip$/i.test(f.name) || f.type === 'application/zip';
    const reader = new FileReader();
    reader.onerror = () => setStatus('Import failed: could not read file');
    reader.onload = async (ev) => {
      try {
        let nextStore, nextImages;
        if (isZip) {
          ({ store: nextStore, images: nextImages } = await importBackupZip(ev.target.result));
        } else {
          // Legacy single-JSON backups
          const data = JSON.parse(ev.target.result);
          if (!data.store) throw new Error('Unrecognised backup format');
          nextStore = data.store;
          nextImages = data.images || {};
        }
        if (!nextStore || !Array.isArray(nextStore.wads)) throw new Error('Backup data looks corrupt');
        setStatus('Restoring…');
        await onImport(nextStore, nextImages);
        setStatus(`Imported ${nextStore.wads.length} WADs · ${Object.keys(nextImages).length} images`);
      } catch (err) {
        setStatus('Import failed: ' + err.message);
      }
    };
    if (isZip) reader.readAsArrayBuffer(f);
    else reader.readAsText(f);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ width: 560 }}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="modal-eyebrow">Local backup</div>
        <h2 className="modal-title">Import / Export</h2>

        <p style={{ fontFamily: 'var(--editorial)', fontSize: 16, color: 'var(--ink-2)', lineHeight: 1.55, marginBottom: 28, fontStyle: 'normal' }}>
          All edits — WAD info, map ratings, reviews, tier renames, and images — live in this
          browser. Export a <b style={{ color: 'var(--ink)' }}>.zip</b> backup to move everything,
          images included, to another device or keep it safe.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <button className="btn primary" onClick={exportJSON} style={{ justifyContent: 'center', padding: '14px 16px' }}>
            ↓ Download backup (.zip)
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".zip,application/zip,.json,application/json"
            style={{ display: 'none' }}
            onChange={importFromFile}
          />
          <button className="btn" onClick={() => fileRef.current?.click()} style={{ justifyContent: 'center', padding: '14px 16px' }}>
            ↑ Restore from backup
          </button>
          {status && (
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--sage)', letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 8 }}>
              {status}
            </div>
          )}
        </div>

        <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--line)', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-4)', letterSpacing: 0.4, lineHeight: 1.7 }}>
          {store.wads.length} WADs &middot; {store.wads.reduce((s, w) => s + (w.maps?.length || 0), 0).toLocaleString()} maps &middot; {Object.keys(images).length} images stored
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { AddWADForm, TierEditor, ImportExportModal });
