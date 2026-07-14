"""Oil & Altar portfolio backend.

Serves the static frontend, the gallery API, an inquiries (contact form)
endpoint, and token-protected admin endpoints for reading inquiries and
uploading real photos onto plates.

Run locally:  uv run uvicorn app.main:app --reload
"""

from __future__ import annotations

import os
import secrets
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated

from fastapi import Depends, FastAPI, Header, HTTPException, Request, UploadFile
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, EmailStr, Field

from . import db

FRONTEND_DIR = Path(__file__).resolve().parents[2] / "frontend"

ALLOWED_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}
MAX_UPLOAD_BYTES = 25 * 1024 * 1024


class InquiryIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    email: EmailStr
    message: str = Field(min_length=1, max_length=5000)


class InquiryOut(InquiryIn):
    id: int
    created_at: str


class PlateOut(BaseModel):
    id: int
    title: str
    shape: str
    position: int
    image_url: str | None


class SeriesOut(BaseModel):
    slug: str
    numeral: str
    title: str
    blurb: str
    kind: str
    plates: list[PlateOut]


def require_admin(x_admin_token: Annotated[str | None, Header()] = None) -> None:
    """Guard admin routes with a token from the environment — never hardcoded."""
    expected = os.environ.get("OILANDALTAR_ADMIN_TOKEN")
    if not expected:
        raise HTTPException(status_code=503, detail="Admin access is not configured")
    if not x_admin_token or not secrets.compare_digest(x_admin_token, expected):
        raise HTTPException(status_code=401, detail="Invalid admin token")


@asynccontextmanager
async def lifespan(_: FastAPI):
    db.init_db()
    yield


def create_app() -> FastAPI:
    app = FastAPI(title="Oil & Altar", lifespan=lifespan)
    db.init_db()

    # In production, set OILANDALTAR_CANONICAL_HOST=oilandaltar.com so the www
    # subdomain permanently redirects to the apex. Only the www alias is
    # redirected — platform health checks hit the app by IP or internal host
    # and must keep working.
    canonical_host = os.environ.get("OILANDALTAR_CANONICAL_HOST")
    if canonical_host:

        @app.middleware("http")
        async def redirect_www_to_apex(request: Request, call_next):
            host = request.headers.get("host", "").split(":")[0]
            if host == f"www.{canonical_host}":
                url = request.url.replace(scheme="https", hostname=canonical_host, port=None)
                return RedirectResponse(str(url), status_code=308)
            return await call_next(request)

    @app.get("/api/health")
    def health() -> dict[str, str]:
        return {"status": "lit"}

    @app.get("/api/series", response_model=list[SeriesOut])
    def list_series() -> list[SeriesOut]:
        with db.get_conn() as conn:
            series_rows = conn.execute("SELECT * FROM series ORDER BY position").fetchall()
            out: list[SeriesOut] = []
            for s in series_rows:
                plate_rows = conn.execute(
                    "SELECT * FROM plates WHERE series_id = ? ORDER BY position", (s["id"],)
                ).fetchall()
                plates = [
                    PlateOut(
                        id=p["id"],
                        title=p["title"],
                        shape=p["shape"],
                        position=p["position"],
                        image_url=f"/media/{p['image_path']}" if p["image_path"] else None,
                    )
                    for p in plate_rows
                ]
                out.append(
                    SeriesOut(
                        slug=s["slug"],
                        numeral=s["numeral"],
                        title=s["title"],
                        blurb=s["blurb"],
                        kind=s["kind"],
                        plates=plates,
                    )
                )
        return out

    @app.post("/api/inquiries", status_code=201)
    def create_inquiry(inquiry: InquiryIn) -> dict[str, int]:
        with db.get_conn() as conn:
            cur = conn.execute(
                "INSERT INTO inquiries (name, email, message) VALUES (?, ?, ?)",
                (inquiry.name, inquiry.email, inquiry.message),
            )
        return {"id": cur.lastrowid}

    @app.get(
        "/api/inquiries",
        response_model=list[InquiryOut],
        dependencies=[Depends(require_admin)],
    )
    def list_inquiries() -> list[InquiryOut]:
        with db.get_conn() as conn:
            rows = conn.execute("SELECT * FROM inquiries ORDER BY created_at DESC").fetchall()
        return [InquiryOut(**dict(r)) for r in rows]

    @app.post(
        "/api/plates/{plate_id}/image",
        dependencies=[Depends(require_admin)],
    )
    async def upload_plate_image(plate_id: int, file: UploadFile) -> dict[str, str]:
        suffix = ALLOWED_IMAGE_TYPES.get(file.content_type or "")
        if suffix is None:
            raise HTTPException(status_code=415, detail="Upload a JPEG, PNG, or WebP image")

        content = await file.read()
        if len(content) > MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=413, detail="Image exceeds the 25 MB limit")

        with db.get_conn() as conn:
            row = conn.execute("SELECT id FROM plates WHERE id = ?", (plate_id,)).fetchone()
            if row is None:
                raise HTTPException(status_code=404, detail="No such plate")

            filename = f"{uuid.uuid4().hex}{suffix}"
            (db.media_dir() / filename).write_bytes(content)
            conn.execute("UPDATE plates SET image_path = ? WHERE id = ?", (filename, plate_id))

        return {"image_url": f"/media/{filename}"}

    app.mount("/media", StaticFiles(directory=db.media_dir()), name="media")
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
    return app


app = create_app()
