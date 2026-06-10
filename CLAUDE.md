# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# On the Synology (SSH):
npm install                  # no --no-bin-links needed on native Linux
pm2 start ecosystem.config.js
pm2 save

# Local development (WSL2 — Windows mapped drive):
npm install --no-bin-links   # symlinks not supported on NTFS via WSL2
npm start                    # http://localhost:3000
PORT=8080 npm start
```

No build step — the server serves static files directly from `public/`.

## Synology deployment

The app is deployed at `http://<synology>/statmanager/` via nginx reverse proxy.
nginx strips the `/statmanager/` prefix before forwarding to Node.js on port 3000,
so Node.js always sees paths starting at `/`. See `nginx-statmanager.conf` for the
location block — place it at `/etc/nginx/conf.d/http.statmanager.conf` on the Synology
and reload nginx. PM2 config is in `ecosystem.config.js`; update `cwd` if the
web root volume differs from `/volume1/web/`.

## Architecture

**Backend** — `server.js` (Node.js + Express):
- Serves `public/` as the web root; files outside `public/` are never reachable via HTTP.
- `statmanager.ini` is stored at the project root (NOT in `public/`) — this is what keeps it protected from browser access.
- API routes: `GET /api/settings`, `POST /api/settings`, `POST /api/settings/test`.
- `GET *` falls back to `public/index.html` to support SPA navigation.

**Frontend** — `public/` (vanilla HTML + JS, no framework):
- `index.html` — app shell with all CSS; renders a fixed header, collapsible sidebar, and a `<main>` content area.
- `app.js` — single-file SPA. Hash-based routing (`#/settings`, `#/home`). To add a page: add an entry to the `pages` object (with `render()` and optional `async init()`) and a corresponding entry in `MENU_ITEMS`.
- `sw.js` — service worker for PWA/offline support; caches static assets, bypasses cache for `/api/*`.
- `manifest.json` — PWA manifest (standalone display, gold theme color).

**Config file** — `statmanager.ini` (INI format, created on first settings save):
```ini
[database]
host=localhost
port=3306
name=statmanager
user=root
password=secret
```

The GET `/api/settings` endpoint never returns the password — it returns `passwordSet: true|false`. The POST endpoint preserves the existing password if the client sends an empty string.

## Design Tokens

| Variable | Value | Use |
|---|---|---|
| `--bg` | `#0f0f0f` | Page background |
| `--surface` | `#1a1a1a` | Cards, sidebar, header |
| `--surface2` | `#222` | Secondary buttons |
| `--border` | `#2a2a2a` | Borders |
| `--accent` | `#e5a00d` | Gold — primary accent, active menu, titles |
| `--text` | `#e8e8e8` | Body text |
| `--text-muted` | `#888` | Labels, placeholders |

Use these CSS variables for all new UI; do not hardcode colors.

## Adding a Page

1. Add to `MENU_ITEMS` in `app.js` with `label`, `route`, and `icon` (inline SVG string).
2. Add a key to the `pages` object with `render()` returning an HTML string and optionally `async init()` for post-render setup (event listeners, data fetching).
3. No routing config needed — the router resolves `#/<route>` automatically.
