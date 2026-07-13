# Oil & Altar

Portfolio site for photographer **Bren** ([@oilandaltar](https://www.instagram.com/oilandaltar/)).
Dark, painterly, chiaroscuro — a chapel-gallery aesthetic with a candlelight cursor,
animated film grain, scroll reveals, and a keyboard-navigable lightbox.

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

Config (env vars): `OILANDALTAR_ADMIN_TOKEN`, `OILANDALTAR_DB`, `OILANDALTAR_MEDIA_DIR`.
