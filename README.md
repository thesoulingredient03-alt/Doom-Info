# DoomInfo

A personal, interactive archive for cataloguing, ranking, and reviewing community-made **Doom** WADs and their individual maps.

DoomInfo turns a sprawling ranking spreadsheet into a browsable, editable website: every WAD is grouped by its parent IWAD and sorted alphabetically, every map gets its own detail page with a large screenshot, specs, a rich-text review, an embedded playthrough video, and a click-through image gallery.

![DoomInfo](screenshots/light-home.png)

## Features

- **Browse by IWAD** — WADs grouped under Doom, Doom 2, Plutonia, and TNT, sorted alphabetically (with sort-by-quality / difficulty / release options).
- **Full inline editing** — every field is editable in place: WAD name, author, format, release date, map counts, and per-map details.
- **Adjustable tier system** — quality, difficulty, and MIDI grades on a points scale, with per-WAD tier renaming that flows through to every map.
- **Map detail pages** — full-screen view with a large screenshot, editable specifications (kills / items / secrets, UV-Max time, MIDI name / origin / composer, demo-recorded flag), a rich-text review (bold / italic / underline), an embedded YouTube/Vimeo playthrough, and an extra-screenshot gallery.
- **Top / Hardest map lists** — build ranked shortlists per WAD from a dropdown of its maps.
- **Intro & conclusion write-ups** — long-form notes above and below each WAD's map list.
- **Images everywhere** — WAD covers, map thumbnails, and cinematic map heroes, stored in the browser's IndexedDB (no size limits like localStorage).
- **Backup & restore** — export your entire archive (data + images) as a portable `.zip` and restore it on any device.
- **Tweakable theme** — light editorial palette with a blue accent; adjustable ground tones and accent colors via the in-page Tweaks panel.

## Running it

DoomInfo is a static site — no build step, no server required.

### Quick start (standalone)

Open **`DoomInfo.html`** directly in any modern browser. It's a single self-contained file with everything inlined (seed data, styles, scripts) and works fully offline.

### Development (multi-file source)

Serve the project root with any static file server so the browser can `fetch` the seed data:

```bash
# Python
python3 -m http.server 8000

# or Node
npx serve .
```

Then open <http://localhost:8000/index.html>.

Opening `index.html` via `file://` will not load the seed catalog (browsers block `fetch` of local files); use the standalone `DoomInfo.html` for offline/no-server use, or a local server for development.

## Project structure

| Path | Purpose |
|------|---------|
| `index.html` | App entry point (multi-file dev version) |
| `DoomInfo.html` | Self-contained single-file build (offline-ready) |
| `styles.css` | All styling and theme tokens |
| `lib.jsx` | Data model, tier system, storage (IndexedDB), backup zip, helpers |
| `components.jsx` | Shared UI components (masthead, grids, home, pills) |
| `forms.jsx` | Add-WAD form, tier editor, import/export modal |
| `detail.jsx` | WAD detail page, map full-view, gallery, playthrough, rich-text editor |
| `app.jsx` | Root React app, routing, state, migrations, Tweaks panel |
| `tweaks-panel.jsx` | Tweaks panel host protocol + controls |
| `data/doom-data.json` | Seed catalog of WADs and maps |

## Data & storage

- The **seed catalog** (`data/doom-data.json`) is the starting dataset everyone loads.
- Your **edits, reviews, ratings, and images** live locally in your browser (localStorage + IndexedDB) and never leave your device.
- Use **Backup → Download** to export a `.zip` of everything, and **Restore** to load it elsewhere.

## Tech

Plain React (via CDN + in-browser Babel) — no bundler, no dependencies to install. Just HTML, CSS, and JSX.

## License

Released under the MIT License. See [LICENSE](LICENSE).

Doom is a trademark of id Software / ZeniMax. This is an unofficial fan project for personal cataloguing and is not affiliated with or endorsed by id Software.
