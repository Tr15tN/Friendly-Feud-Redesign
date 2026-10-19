# Friendly-Feud scoring-ui pack

Built for Tristan on the local `scoring-ui` branch (18 commits on top of upstream master).
Nothing was pushed upstream.

## What's inside

- `Friendly-Feud/` — full source of the `scoring-ui` branch (ready to build / Docker)
- `extras/friendly-feud-guide.pdf` — host & rules guide
- `extras/screenshots/` — before/after and after shots of the TV board, host console, fast money, lobby, tablet, guide
- `extras/patches/` — `git format-patch` of every commit from master
- `extras/scoring-ui.bundle` — `git bundle` of master..HEAD (optional: apply onto a fresh upstream clone)
- `extras/COMMITS.txt` / `HEAD.txt` — commit list and tip SHA

## Quick run (dev)

```bash
cd Friendly-Feud
# needs Node 20+ and Go
make dev   # or follow README; docker/docker-compose-dev.yaml
```

Or the all-in-one image once you've built it:

```bash
docker build -f Dockerfile.allinone -t my-feud .
# then use docker-compose with image: my-feud
```

## Deploy (short version)

Use `ghcr.io` only if you want stock upstream. For this UI, build your own image:

```yaml
services:
  feud:
    image: my-feud   # from Dockerfile.allinone
    restart: unless-stopped
    ports: ["127.0.0.1:8081:80"]
    environment:
      FAMF_STORE: sqlite
      GAME_STORE: sqlite
      GAME_STORE_SQLITE_PATH: /data/famf.db
      ALLOWED_ORIGINS: https://YOUR.DOMAIN
      NEXT_PUBLIC_TITLE_URL: YOUR.DOMAIN
      ADMIN_CONSOLE_PASSWORD: <strong unique password>
      ADMIN_SESSION_SECRET: <long random string>
      ANNOUNCEMENT_BANNER_FILE: /data/announcement-banner.json
    volumes: ["./data:/data"]
```

Caddy:

```
YOUR.DOMAIN {
  encode gzip
  reverse_proxy 127.0.0.1:8081
}
```

**Must set at deploy:** `ALLOWED_ORIGINS` (exact `https://` origin; `*` disables the websocket origin check), `ADMIN_CONSOLE_PASSWORD`, `ADMIN_SESSION_SECRET`.

## Apply onto a fresh upstream clone (optional)

```bash
git clone https://github.com/joshzcold/Friendly-Feud.git
cd Friendly-Feud
git fetch ../extras/scoring-ui.bundle scoring-ui:scoring-ui
# or: git am ../extras/patches/*.patch
git checkout scoring-ui
```

## What changed (high level)

1. Scoring bugs fixed (multiplier, empty multiplier, double award, pot growing after bank)
2. Host console rework + lobby + phase stepper
3. Bigger TV scores, 3-slot strikes, buzzer banner, count-up, multiplied card values
4. Fast money scale-to-fit + theme colours + configurable win target
5. Server-side host authorization (players can no longer take over a room)
6. In-app + PDF game guide

See `Friendly-Feud/docs/GUIDE.md` and the PDF for how to play / host.
