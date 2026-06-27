# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Local development:
npm start                    # http://localhost:3000
PORT=8080 npm start

# Deploy to Synology dev server (rsync + PM2 restart):
npm run deploy

# Watch mode — auto-deploy on file changes (run in a dedicated terminal):
npm run watch
```

No build step — the server serves static files directly from `public/`.

## Dev deployment (Synology NAS at 192.168.86.33)

`npm run deploy` rsyncs changed files to `/volume1/web/statmanager/` on the Synology
then restarts PM2. SSH key authentication is configured — no password prompt required.
Always use `npm run deploy` after code changes rather than restarting PM2 directly,
so files arrive on the server before the restart.

Files excluded from sync: `node_modules/`, `xml-archives/`, `statmanager.ini`,
`.git/`, `db/testdata/`, `Design Notes/`, `samples/`.

The app runs at `http://dev.hardfouls.com/statmanager/` via nginx reverse proxy.
nginx strips the `/statmanager/` prefix before forwarding to Node.js on port 3000.
PM2 config is in `ecosystem.config.js` (cwd: `/volume1/web/statmanager`).

## Prod deployment (Docker on 192.168.86.38)

Create a GitHub release → GitHub Actions builds the image → pushes to
`ghcr.io/hardfouls/statmanager:latest` → redeploy the Portainer stack to pull it.

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
