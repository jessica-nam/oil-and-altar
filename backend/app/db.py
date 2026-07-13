"""SQLite persistence for the Oil & Altar portfolio.

Paths are read from env vars at call time (not import time) so tests can
point the app at a temp database. Env vars:
  OILANDALTAR_DB         path to the SQLite file (default: backend/data/oilandaltar.db)
  OILANDALTAR_MEDIA_DIR  directory for uploaded photos (default: backend/media)
"""

from __future__ import annotations

import os
import sqlite3
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]

SCHEMA = """
CREATE TABLE IF NOT EXISTS series (
    id INTEGER PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    numeral TEXT NOT NULL,
    title TEXT NOT NULL,
    blurb TEXT NOT NULL,
    kind TEXT NOT NULL,
    position INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS plates (
    id INTEGER PRIMARY KEY,
    series_id INTEGER NOT NULL REFERENCES series(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    shape TEXT NOT NULL DEFAULT '',
    position INTEGER NOT NULL,
    image_path TEXT
);

CREATE TABLE IF NOT EXISTS inquiries (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
"""

SEED = [
    {
        "slug": "votive",
        "numeral": "I",
        "title": "Votive",
        "kind": "votive",
        "blurb": "Portraits by a single flame. One light, one face, nothing else permitted.",
        "plates": [
            ("The Vigil", "tall"),
            ("Anointed", ""),
            ("Her Hands, Folded", "wide"),
            ("Candlemas", ""),
            ("Saint of the Kitchen Table", "tall"),
        ],
    },
    {
        "slug": "still-lifes",
        "numeral": "II",
        "title": "Still Lifes for a Dark Room",
        "kind": "still",
        "blurb": "Fruit, cloth, brass, and bone — arranged the way the Dutch left them.",
        "plates": [
            ("Pomegranate & Brass", "wide"),
            ("Linen Study No. 4", ""),
            ("The Last Pear", ""),
            ("Vanitas, Interrupted", "wide"),
        ],
    },
    {
        "slug": "nocturnes",
        "numeral": "III",
        "title": "Nocturnes",
        "kind": "nocturne",
        "blurb": "The city after midnight, exposed long enough for the dark to speak.",
        "plates": [
            ("Vespers on 6th Street", ""),
            ("Blue Hour Mass", "tall"),
            ("The All-Night Diner", "wide"),
            ("Streetlight Annunciation", ""),
            ("Last Train Psalm", ""),
        ],
    },
]


def db_path() -> Path:
    return Path(os.environ.get("OILANDALTAR_DB", str(BACKEND_DIR / "data" / "oilandaltar.db")))


def media_dir() -> Path:
    return Path(os.environ.get("OILANDALTAR_MEDIA_DIR", str(BACKEND_DIR / "media")))


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(db_path())
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    """Create the schema and seed the gallery if it's empty."""
    db_path().parent.mkdir(parents=True, exist_ok=True)
    media_dir().mkdir(parents=True, exist_ok=True)
    with get_conn() as conn:
        conn.executescript(SCHEMA)
        if conn.execute("SELECT COUNT(*) FROM series").fetchone()[0] == 0:
            for s_pos, s in enumerate(SEED, start=1):
                cur = conn.execute(
                    "INSERT INTO series (slug, numeral, title, blurb, kind, position)"
                    " VALUES (?, ?, ?, ?, ?, ?)",
                    (s["slug"], s["numeral"], s["title"], s["blurb"], s["kind"], s_pos),
                )
                series_id = cur.lastrowid
                for p_pos, (title, shape) in enumerate(s["plates"], start=1):
                    conn.execute(
                        "INSERT INTO plates (series_id, title, shape, position)"
                        " VALUES (?, ?, ?, ?)",
                        (series_id, title, shape, p_pos),
                    )
