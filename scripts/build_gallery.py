#!/usr/bin/env python3
"""Build web-optimized media + the frontend gallery data from photosandvideos/.

Reads Brenden's raw drop in ``photosandvideos/`` (untracked, full-res), writes
web-sized assets into ``frontend/media/<slug>/`` and emits
``frontend/gallery-data.js`` (a ``window.GALLERY`` global the frontend reads).

Incremental: already-built outputs are skipped, so re-runs only process new or
removed source files. Delete a file under ``frontend/media/`` to force a
rebuild of it.

Each image is exported twice:
  media/<slug>/NN.jpg    full  (<= 2000px long edge)  — scroll pages, carousel
  media/<slug>/t/NN.jpg  thumb (<=  900px long edge)  — grids via srcset

    python3 scripts/build_gallery.py

Needs macOS ``sips`` (images) and ``ffmpeg`` (video). If ffmpeg is missing the
image build still completes and the video section is left empty with a warning.
"""

from __future__ import annotations

import json
import re
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "photosandvideos"
MEDIA = ROOT / "frontend" / "media"
DATA_FILE = ROOT / "frontend" / "gallery-data.js"

MAX_DIM = 2000  # longest edge for full-size stills, px
JPEG_Q = 72  # sips JPEG quality (full)
THUMB_DIM = 900  # longest edge for grid thumbnails, px
THUMB_Q = 70  # sips JPEG quality (thumb)
VIDEO_MAX = 1280  # longest edge for video, px

HAS_FFMPEG = shutil.which("ffmpeg") is not None

# ---- project copy (verbatim from Brenden's notes) --------------------------

EXCERPTS = {
    "abandoned-america": [
        "Abandoned America documents what's left after the people have gone — "
        "farmhouses, water towers, and small-town landmarks weathering and falling in "
        "on themselves across the high plains of Texas, Oklahoma, and Kansas, and the "
        "forested hills of the Ozarks in Arkansas and Missouri. These were homes. These "
        "were the places everyone in town used to pass through. The project sits with one "
        "unanswerable question: how does a place get like this — and what does it mean "
        "that the people who left assumed, wrongly, it would stay the same without them.",
    ],
    "portraits": [
        "Each session is a collaboration with a specific person, named and dated, rather "
        "than a moment caught in passing.",
    ],
    "wanderings": [],
    "bible-belt": [
        "The Bible Belt gets its name for a reason — a church on nearly every corner, in a "
        "region where the culture built around them is visibly aging out. This project sits "
        "in the gap between traditionalism and modernism: the way a generation raised inside "
        "a specific era of Southern Baptist or Catholic practice finds comfort and identity "
        "in these buildings, and the way a Millennial or Gen Z viewer, raised in the same "
        "towns, often doesn't.",
        "That gap shows up in strange, specific ways. Small prairie towns with more than "
        "forty churches and barely twenty people aren't, as you'd assume, evidence of a "
        "community united by shared faith — they're the opposite. Even within the same race, "
        "ethnicity, and religious background, people have splintered into smaller factions, "
        "unable to agree closely enough on theology to worship under one roof.",
        "Bible Belt holds that tension without resolving it — sincere belief alongside the "
        "decline of the institutions that housed it, and the uncomfortable overlap between "
        "religion, politics, and money that runs through both. Religion makes some people "
        "feel comforted, some at peace, and others completely alienated from the idea of "
        "faith itself. Everyone brings their own interpretation, and the work is meant to "
        "let the viewer arrive at their own read on both the signs and the religion behind "
        "them. This is an ongoing project, built in part through interviews with pastors, "
        "church members, and non-religious individuals to understand their perspective "
        "firsthand.",
    ],
}

IN_PASSING_EXCERPT = [
    "In passing collects short, atmospheric videos and each clip is observed, not staged: "
    "a few seconds of someone else's ordinary life, held long enough to feel like it "
    "belonged to you too.",
]

EPHEMERA_HEADLINE = (
    "Signage, artifacts, and printed matter collected alongside the main body of work — "
    "the smaller, stranger evidence of how faith shows up in daily life here."
)

# ---- helpers ----------------------------------------------------------------

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".JPG", ".JPEG", ".PNG"}


def natural_key(path: Path):
    """Sort 'Untitled 2' before 'Untitled 10'."""
    return [int(t) if t.isdigit() else t.lower() for t in re.split(r"(\d+)", path.name)]


def source_images(folder: str) -> list[Path]:
    d = SRC / folder
    files = [
        p for p in d.iterdir() if p.suffix in IMAGE_EXTS and not p.name.startswith(".")
    ]
    return sorted(files, key=natural_key)


def dedup(paths: list[Path]) -> list[Path]:
    """Drop byte-identical duplicates (e.g. trailing-space filename twins), keep order."""
    seen: set[int] = set()
    out: list[Path] = []
    for p in paths:
        h = hash(p.read_bytes())
        if h in seen:
            print(f"    · skip duplicate: {p.name}")
            continue
        seen.add(h)
        out.append(p)
    return out


def dims(path: Path) -> tuple[int, int]:
    out = subprocess.run(
        ["sips", "-g", "pixelWidth", "-g", "pixelHeight", str(path)],
        capture_output=True,
        text=True,
    ).stdout
    w = int(re.search(r"pixelWidth: (\d+)", out).group(1))
    h = int(re.search(r"pixelHeight: (\d+)", out).group(1))
    return w, h


def shape_of(w: int, h: int) -> str:
    if w >= h * 1.15:
        return "wide"
    if h >= w * 1.15:
        return "tall"
    return ""


def resize_jpeg(src: Path, dst: Path, max_dim: int, quality: int) -> None:
    dst.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            "sips",
            "-s",
            "format",
            "jpeg",
            "-s",
            "formatOptions",
            str(quality),
            "-Z",
            str(max_dim),
            str(src),
            "--out",
            str(dst),
        ],
        check=True,
        capture_output=True,
    )


def process_image(src: Path, slug: str, i: int) -> dict:
    """Export full + thumb (skipping already-built files) and return media facts."""
    full = MEDIA / slug / f"{i:02d}.jpg"
    thumb = MEDIA / slug / "t" / f"{i:02d}.jpg"
    if not full.exists():
        resize_jpeg(src, full, MAX_DIM, JPEG_Q)
    if not thumb.exists():
        resize_jpeg(src, thumb, THUMB_DIM, THUMB_Q)
    w, h = dims(full)
    return {
        "image_url": f"media/{slug}/{i:02d}.jpg",
        "thumb_url": f"media/{slug}/t/{i:02d}.jpg",
        "w": w,
        "h": h,
        "shape": shape_of(w, h),
    }


def clean_title(name: str) -> str:
    """Filename -> display title. '_' stands in for an apostrophe/quote in the drop."""
    t = Path(name).stem.strip()
    t = re.sub(r"_([^_]+)_", r"‘\1’", t)  # _Alice_ -> ‘Alice’
    t = t.rstrip("_")  # 'Used and Abused_' -> 'Used and Abused'
    t = t.replace("_", "’")  # Don_t -> Don’t
    return re.sub(r"\s+", " ", t).strip()


def untitled(n: int) -> str:
    return f"Untitled {n:02d}"


# ---- per-series builders ----------------------------------------------------


def build_untitled(slug: str, folder: str) -> list[dict]:
    """Sequential 'Untitled 0X' captions in natural filename order."""
    print(f"[{slug}] {folder}")
    imgs = dedup(source_images(folder))
    plates = []
    for i, src in enumerate(imgs, start=1):
        plates.append(
            {"title": untitled(i), "session": None, **process_image(src, slug, i)}
        )
        print(f"    {i:02d}/{len(imgs)}  {src.name}")
    return plates


def build_titled(slug: str, folder: str) -> list[dict]:
    """Caption = cleaned filename (Wanderings)."""
    print(f"[{slug}] {folder}")
    imgs = dedup(source_images(folder))
    plates = []
    for i, src in enumerate(imgs, start=1):
        plates.append(
            {
                "title": clean_title(src.name),
                "session": None,
                **process_image(src, slug, i),
            }
        )
        print(f"    {i:02d}/{len(imgs)}  {src.name} -> {plates[-1]['title']}")
    return plates


MONTHS = {
    "january": 1,
    "february": 2,
    "march": 3,
    "april": 4,
    "may": 5,
    "june": 6,
    "july": 7,
    "august": 8,
    "september": 9,
    "october": 10,
    "november": 11,
    "december": 12,
}


def session_of(path: Path) -> str:
    """Derive 'Name - Month' session key from a portrait filename."""
    stem = path.stem
    stem = re.sub(r"\s*\(\d+\)\s*$", "", stem)  # drop trailing '(2)'
    stem = re.sub(r"\s+", " ", stem).strip()
    if " - " not in stem:  # loose 'Brookie*' edits -> Brooke's shoot
        return "Brooke N. - March"
    return stem


def build_portraits(slug: str, folder: str) -> list[dict]:
    """Group by session; each plate carries its session header, sessions ordered by month."""
    print(f"[{slug}] {folder}")
    imgs = dedup(source_images(folder))

    groups: dict[str, list[Path]] = {}
    for p in imgs:
        groups.setdefault(session_of(p), []).append(p)

    def month_rank(key: str) -> int:
        m = re.search(r"-\s*([A-Za-z]+)", key)
        return MONTHS.get(m.group(1).lower(), 99) if m else 99

    ordered = sorted(groups, key=lambda k: (month_rank(k), k.lower()))

    plates: list[dict] = []
    i = 0
    for key in ordered:
        header = key.replace(" - ", " — ")
        for src in groups[key]:
            i += 1
            plates.append(
                {"title": header, "session": header, **process_image(src, slug, i)}
            )
        print(f"    {header}: {len(groups[key])} photo(s)")
    return plates


def build_carousel(folder: str) -> list[dict]:
    print(f"[carousel] {folder}")
    imgs = dedup(source_images(folder))
    slides = []
    for i, src in enumerate(imgs, start=1):
        info = process_image(src, "carousel", i)
        slides.append({"url": info["image_url"], "w": info["w"], "h": info["h"]})
        print(f"    {i:02d}/{len(imgs)}  {src.name}")
    return slides


def video_dims(path: Path) -> tuple[int, int]:
    out = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-select_streams",
            "v:0",
            "-show_entries",
            "stream=width,height",
            "-of",
            "csv=p=0",
            str(path),
        ],
        capture_output=True,
        text=True,
    ).stdout.strip()
    w, h = out.split(",")[:2]
    return int(w), int(h)


def build_videos(folder: str) -> list[dict]:
    print(f"[in-passing] {folder}")
    if not HAS_FFMPEG:
        print(
            "    !! ffmpeg not found — skipping video transcode (re-run when installed)"
        )
        return []
    d = SRC / folder
    vids = sorted(
        (p for p in d.iterdir() if p.suffix.lower() == ".mov"), key=natural_key
    )
    clips = []
    # Cap the LONG edge at VIDEO_MAX regardless of orientation (vertical phone
    # clips would otherwise keep their full height).
    scale = (
        f"scale={VIDEO_MAX}:{VIDEO_MAX}:force_original_aspect_ratio=decrease:"
        "force_divisible_by=2"
    )
    (MEDIA / "in-passing").mkdir(parents=True, exist_ok=True)
    for i, src in enumerate(vids, start=1):
        mp4 = MEDIA / "in-passing" / f"{i:02d}.mp4"
        poster = MEDIA / "in-passing" / f"{i:02d}.jpg"
        if not mp4.exists():
            subprocess.run(
                [
                    "ffmpeg",
                    "-y",
                    "-i",
                    str(src),
                    "-vf",
                    scale,
                    "-c:v",
                    "libx264",
                    "-pix_fmt",
                    "yuv420p",
                    "-crf",
                    "24",
                    "-preset",
                    "medium",
                    "-c:a",
                    "aac",
                    "-b:a",
                    "128k",
                    "-movflags",
                    "+faststart",
                    str(mp4),
                ],
                check=True,
                capture_output=True,
            )
        if not poster.exists():
            subprocess.run(
                [
                    "ffmpeg",
                    "-y",
                    "-i",
                    str(src),
                    "-vframes",
                    "1",
                    "-vf",
                    scale,
                    str(poster),
                ],
                check=True,
                capture_output=True,
            )
        w, h = video_dims(mp4)
        clips.append(
            {
                "title": clean_title(src.name),
                "src": f"media/in-passing/{i:02d}.mp4",
                "poster": f"media/in-passing/{i:02d}.jpg",
                "w": w,
                "h": h,
            }
        )
        print(f"    {i:02d}/{len(vids)}  {src.name} -> {clips[-1]['title']} ({w}x{h})")
    return clips


# ---- assemble ---------------------------------------------------------------


def main() -> None:
    MEDIA.mkdir(parents=True, exist_ok=True)

    series = [
        {
            "slug": "bible-belt",
            "numeral": "I",
            "title": "Bible Belt",
            "kind": "nocturne",
            "layout": "scroll",
            "excerpt": EXCERPTS["bible-belt"],
            "plates": build_untitled("bible-belt", "Bible Belt Photo"),
        },
        {
            "slug": "abandoned-america",
            "numeral": "II",
            "title": "Abandoned America",
            "kind": "votive",
            "layout": "scroll",
            "excerpt": EXCERPTS["abandoned-america"],
            "plates": build_untitled("abandoned-america", "Abandoned America"),
        },
        {
            "slug": "portraits",
            "numeral": "III",
            "title": "Portraits",
            "kind": "still",
            "layout": "sessions",
            "excerpt": EXCERPTS["portraits"],
            "plates": build_portraits("portraits", "Portraits"),
        },
        {
            "slug": "wanderings",
            "numeral": "IV",
            "title": "Wanderings",
            "kind": "mixed",
            "layout": "grid",
            "excerpt": EXCERPTS["wanderings"],
            "plates": build_titled("wanderings", "Wanderings"),
        },
    ]

    gallery = {
        "series": series,
        "carousel": build_carousel("main coursel "),
        "inPassing": {"excerpt": IN_PASSING_EXCERPT, "clips": build_videos("Vids")},
        "ephemera": {"headline": EPHEMERA_HEADLINE, "plates": []},
    }

    payload = json.dumps(gallery, ensure_ascii=False, indent=2)
    DATA_FILE.write_text(
        "/* Generated by scripts/build_gallery.py — do not edit by hand. */\n"
        f"window.GALLERY = {payload};\n",
        encoding="utf-8",
    )

    counts = " · ".join(f"{s['slug']}:{len(s['plates'])}" for s in series)
    print("\n✓ wrote", DATA_FILE.relative_to(ROOT))
    print(
        f"  {counts} · carousel:{len(gallery['carousel'])} "
        f"· videos:{len(gallery['inPassing']['clips'])}"
    )


if __name__ == "__main__":
    main()
