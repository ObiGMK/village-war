# ⚔️ Village War

A browser-based Clash-of-Clans-style village strategy game — build, train, raid, conquer.
Vanilla JS + SVG/WebGL on the front end, a zero-dependency Python backend for accounts,
cloud saves, a real global leaderboard, and real clans.

## Play

- **Hosted (always-up, static):** GitHub Pages serves the game. It runs fully on its own with
  local saves; the online social layer activates if a backend URL is set in `config.js`.
- **Local, full features:** `./run.sh` (auto-restarting supervisor) or `python3 server.py 3456`,
  then open `http://localhost:3456`.

## Features

Build/upgrade with builders & timers · live tap-to-deploy battles with troop AI, spells, defenses
that fire back, traps & star ratings · true 3D village mode (Three.js) · heroes, research,
campaign, leagues, season pass, talents, world regions, boss raids, tournaments · lucky wheel,
crates, market, bank, daily challenges · **real accounts, cloud saves, global leaderboard & clans**.

## Backend

`server.py` — Python stdlib + SQLite, no pip installs. Serves the game and the `/api/*` JSON API
on one origin. PBKDF2-hashed passwords, session tokens, per-IP rate limiting, security headers.

See **[DEPLOY.md](DEPLOY.md)** for Docker and cloud-hosting instructions.

## Resilience

- `run.sh` keeps the local server alive (respawns on crash).
- GitHub Actions (`.github/workflows/pages.yml`) auto-deploys the static game to Pages on every push.
- The client degrades gracefully to offline (localStorage) if no backend is reachable, so the
  game is never "down" even when the API is.
