# Deploying Village War

The backend (`server.py`) is **zero-dependency** — Python 3 standard library + SQLite only.
It serves the game **and** the API on one port, so there are no CORS or split-origin issues.

## Run locally
```bash
python3 server.py 3456        # → http://localhost:3456
```

## Run with Docker (recommended for hosting)
```bash
docker compose up -d --build  # → http://localhost:8080
```
The SQLite DB persists in the named volume `vw-data` (so accounts/saves survive restarts).

## Put it on the internet
The server speaks plain HTTP. **Terminate TLS in front of it** with a reverse proxy so
traffic is encrypted (passwords are PBKDF2-hashed at rest, but you still want HTTPS on the wire).

Example Caddy config (auto-HTTPS via Let's Encrypt):
```
yourdomain.com {
    reverse_proxy localhost:8080
}
```
Or nginx / a cloud load balancer in front of the container. The app reads `X-Forwarded-For`
for per-IP rate limiting, so it works correctly behind a proxy.

### Config (env vars)
| Var | Default | Purpose |
|-----|---------|---------|
| `PORT` | `3456` | Listen port |
| `VW_ROOT` | script dir | Where static game files are served from |
| `VW_DB` | `<root>/villagewar.db` | SQLite database path |

## Security posture (honest)
- Passwords: **PBKDF2-HMAC-SHA256**, 120k iterations, per-user salt — never stored in plaintext.
- Session tokens: 128-bit random.
- **Rate limiting**: per-IP sliding window (60 req/min general, 10/min for auth) → blunts brute-force & spam.
- Request body capped at 256 KB; security headers (`nosniff`, `SAMEORIGIN`, `no-referrer`) on every response.
- SQL is fully parameterized (no injection).
- **Not** included (add before serious production use): HTTPS (use the proxy above), email verification,
  password reset, and a managed DB if you expect real scale. It's a solid hobby/indie backend, not a bank.
