# Oil & Altar — single container serving the API and the static frontend.
#
#   docker build -t oilandaltar .
#   docker run -p 8000:8000 -v oilandaltar-data:/data \
#     -e OILANDALTAR_ADMIN_TOKEN=... oilandaltar
#
# Persistent state (SQLite db + uploaded photos) lives under /data — mount a
# volume there or everything resets on redeploy.

FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

WORKDIR /srv/backend

ENV UV_COMPILE_BYTECODE=1 \
    OILANDALTAR_DB=/data/oilandaltar.db \
    OILANDALTAR_MEDIA_DIR=/data/media \
    PATH="/srv/backend/.venv/bin:$PATH"

# Dependencies first, so code edits don't bust this layer.
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-dev

COPY backend/app ./app
COPY frontend /srv/frontend

EXPOSE 8000

# --proxy-headers + --forwarded-allow-ips: trust X-Forwarded-* from the
# platform's TLS-terminating proxy so redirects and logs see the real
# scheme/host/client.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", \
     "--proxy-headers", "--forwarded-allow-ips", "*"]
