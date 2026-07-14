# Oil & Altar

Portfolio site for photographer **Bren** ([@oilandaltar](https://www.instagram.com/oilandaltar/)).
Swiss/editorial design after brandnewalias.com: white page, bold black Helvetica,
red active nav, fixed corner identity block. Hash-routed pages — a crossfading
landing carousel (~40 images), Bible Belt (flagship project), a Photography
Portfolio dropdown (Abandoned America / Portraits / Everyday Exploration),
Films & Videography (stacked mp4 bays), and About with an inquiry form.

## Structure

```
frontend/   Static site (vanilla HTML/CSS/JS) — no build step
backend/    FastAPI app: serves the frontend, gallery API, inquiries, photo uploads
```

The gallery ships with generative canvas placeholders. Upload real photos via the
admin endpoint and they replace the placeholders automatically.

## Run it

```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload
```

Open http://127.0.0.1:8000 — the backend serves the frontend, so that's the whole site.
(Opening `frontend/index.html` directly also works; it falls back to embedded seed data.)

## API

| Method | Path                        | Auth          | Purpose                          |
| ------ | --------------------------- | ------------- | -------------------------------- |
| GET    | `/api/health`               | —             | Liveness check                   |
| GET    | `/api/series`               | —             | Series + plates for the gallery  |
| POST   | `/api/inquiries`            | —             | Contact-form submission          |
| GET    | `/api/inquiries`            | `X-Admin-Token` | Read inquiries                 |
| POST   | `/api/plates/{id}/image`    | `X-Admin-Token` | Upload a real photo for a plate |

### Admin setup

Set a token in the environment (see `.env.example`) — never commit it:

```bash
export OILANDALTAR_ADMIN_TOKEN="$(openssl rand -hex 24)"
```

Upload a photo onto plate 1:

```bash
curl -X POST http://127.0.0.1:8000/api/plates/1/image \
  -H "X-Admin-Token: $OILANDALTAR_ADMIN_TOKEN" \
  -F "file=@the-vigil.jpg"
```

Read inquiries:

```bash
curl http://127.0.0.1:8000/api/inquiries -H "X-Admin-Token: $OILANDALTAR_ADMIN_TOKEN"
```

## Develop

```bash
cd backend
uv run ruff check . && uv run ruff format --check .
uv run pytest          # coverage gate: 80%
```

Data lives in SQLite at `backend/data/oilandaltar.db` (auto-created and seeded on
first run); uploaded photos land in `backend/media/`. Both are gitignored.

Config (env vars): `OILANDALTAR_ADMIN_TOKEN`, `OILANDALTAR_DB`, `OILANDALTAR_MEDIA_DIR`,
`OILANDALTAR_CANONICAL_HOST` (see Deploy).

## Deploy (oilandaltar.com)

The whole site ships as one Docker image (API + frontend). SQLite means one
machine with a persistent volume — plenty for a portfolio, no database server
to run. Try it locally:

```bash
docker build -t oilandaltar .
docker run -p 8000:8000 -v oilandaltar-data:/data \
  -e OILANDALTAR_ADMIN_TOKEN="$(openssl rand -hex 24)" oilandaltar
```

The container keeps its state (db + photos) under `/data` — always mount a
volume there, or uploads vanish on redeploy.

### Example: Fly.io

```bash
fly launch --no-deploy            # detects the Dockerfile; pick a region near Bren
fly volumes create data --size 3
# in fly.toml: internal_port = 8000, and add
#   [mounts]  source = "data"  destination = "/data"
# and keep it to a single machine (SQLite): min_machines_running = 1
fly secrets set OILANDALTAR_ADMIN_TOKEN="$(openssl rand -hex 24)"
fly secrets set OILANDALTAR_CANONICAL_HOST="oilandaltar.com"
fly deploy
```

### Point the domain at it

1. Buy `oilandaltar.com` at any registrar.
2. `fly certs add oilandaltar.com && fly certs add www.oilandaltar.com`
   (the platform provisions and renews TLS automatically).
3. At the registrar, add the records `fly certs add` prints — typically an
   A/AAAA record on the apex (`@`) to the app's IPs from `fly ips list`, and a
   CNAME on `www` to `<app>.fly.dev`.
4. Done. `OILANDALTAR_CANONICAL_HOST` makes `www.oilandaltar.com` 308-redirect
   to `https://oilandaltar.com`, so there's one canonical URL.

Any Docker host works the same way (Render, Railway, a VPS behind Caddy):
run the image, mount `/data`, set the two env vars, terminate TLS in front.
