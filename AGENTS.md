# Neo-Matrix Terminal Homepage

## What This Is

A custom browser start page / new-tab replacement with a Matrix/hacker terminal aesthetic (green-on-black, CRT scanlines, monospace fonts). Everything is vanilla HTML, CSS, and JavaScript — no frameworks, no build step, no dependencies.

## Project Structure

```
homepage/
├── index.html              # Main dashboard (130KB, self-contained)
├── extension/              # Firefox extension for tab tracking
│   ├── manifest.json
│   ├── background.js
│   └── content.js
└── pages/
    ├── board.html          # Real-time bulletin board (MQTT via HiveMQ)
    ├── news.html           # Hacker News stories as floating particle nodes
    ├── nature.html         # Live iNaturalist observations grid
    ├── discipline.html     # Motivational page with SVG animations
    └── tools.html          # Tools database grid with ASCII art background
```

## Main Page Features (`index.html`)

- **Login screen**: Fake terminal boot sequence, stores username in localStorage
- **Search bar**: DuckDuckGo default, bang shortcuts (`g` Google, `y` YouTube, `r` Reddit, `w` Wiki, `gh` GitHub)
- **Bento grid dashboard**:
  - Editable bookmark cards (localStorage)
  - Particle avatar (canvas)
  - Neofetch-style system info (OS, shell, CPU/RAM bars)
  - Live Hacker News ticker (HN API)
  - Weather widget (wttr.in)
  - SpaceX telemetry widget (canvas)
  - TABS.LIVE — tracks open sub-pages via BroadcastChannel
  - Mini matrix rain animation (canvas)
- **Terminal Pages hub**: Modal overlay to navigate to sub-pages
- **Command system**: Built-in terminal commands typed in the search bar

## Tech Stack

- **Pure HTML/CSS/JS** — each page is a single self-contained `.html` file
- **No npm, no bundler, no framework**
- **Fonts**: JetBrains Mono, IBM Plex Mono, Share Tech Mono (Google Fonts)
- **APIs**: Hacker News (Algolia + Firebase), wttr.in, iNaturalist, HiveMQ MQTT
- **Storage**: localStorage for bookmarks, username, preferences

## Design Language

- Color palette: `#00ff41` (green), `#00cc44` (mid), `#007a22` (dim), `#003b00` (dark) on `#000000` black
- CRT scanline overlays, vignette gradients, subtle glow animations
- Terminal-style borders, monospace typography throughout
- Gothic cross (`✟`) window dots instead of standard red/yellow/green circles

## Key Conventions

- All pages link back to `../index.html` via a return button
- Each sub-page registers itself via `BroadcastChannel('hp_tabs')` so the main page can track open pages
- Bookmarks are stored under `localStorage` key `startpage_bms`
- Username is stored under `localStorage` key `startpage_username`
- The bulletin board uses MQTT topic prefix `matrix-nexus-b3f7a2c9d1e8/pin/`
