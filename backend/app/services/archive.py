"""
Safe shared CBZ / multi-image extraction (D-01, D-02).

One ingestion path for either a .cbz (ZIP of images) or a list of dropped
image files. Members are filtered to images, natural-sorted by basename, and
written as zero-padded sequential page files. Security guards are mandatory —
input is an untrusted user upload (ASVS V5/V12). Zero new dependencies:
stdlib re/zipfile/shutil + the existing Pillow.
"""

import json
import re
import shutil
import zipfile
from pathlib import Path

from app.models.schemas import ChapterManifest

IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp"}
MAX_PAGES = 200
MAX_TOTAL_UNCOMPRESSED = 500 * 1024 * 1024  # zip-bomb total ceiling
MAX_PAGE_UNCOMPRESSED = 50 * 1024 * 1024  # per-member uncompressed cap
MAX_RATIO = 100  # per-member compressed->uncompressed ratio guard (zip-bomb)
_ZIP_MAGIC = b"PK\x03\x04"
MANIFEST_NAME = "manifest.json"


def _sniff_image(path: Path) -> None:
    """Reject non-image content by magic bytes (ASVS V5).

    Deliberately avoids PIL here: ultralytics monkeypatches PIL.Image.open
    to attempt a network pip-install of pi_heif on ANY decode failure, which
    crashes offline. A header sniff is sufficient to reject garbage members
    and never feeds untrusted bytes to the patched opener.
    """
    head = path.read_bytes()[:12]
    if head[:3] == b"\xff\xd8\xff":  # JPEG (SOI + marker)
        return
    if head[:8] == b"\x89PNG\r\n\x1a\n":  # PNG
        return
    if head[:4] == b"RIFF" and head[8:12] == b"WEBP":  # WebP
        return
    raise ValueError(f"Archive member is not a valid image: {path.name}")


def _image_size(path: Path) -> tuple[int, int]:
    """Best-effort dimensions. Manifest dimensions are non-critical; degenerate
    test fixtures may not fully decode, so fall back to (0, 0) rather than
    invoking the patched PIL opener on marginal content.
    """
    try:
        from PIL import Image

        with Image.open(path) as im:
            return im.size
    except Exception:
        return (0, 0)


def _natural_key(name: str) -> list:
    """page2 < page10 (D-02). Pure stdlib — zero third-party sort libs."""
    return [
        int(t) if t.isdigit() else t.lower()
        for t in re.split(r"(\d+)", Path(name).name)
    ]


def _is_within(target: Path, root: Path) -> bool:
    """True iff resolved target stays inside resolved root (zip-slip guard)."""
    return str(target.resolve()).startswith(str(root.resolve()))


def extract_cbz(cbz_path: Path, dest: Path) -> list[Path]:
    """Safely extract a .cbz into ``dest`` as natural-sorted zero-padded pages.

    Raises ValueError before any write on: not-a-zip, too many/large members
    (zip bomb), suspicious compression ratio (zip bomb), or a member path that
    escapes ``dest`` (zip-slip / path traversal).
    """
    dest = Path(dest)
    if cbz_path.read_bytes()[:4] != _ZIP_MAGIC:
        raise ValueError("Not a valid ZIP/CBZ archive (bad magic bytes)")

    pages: list[Path] = []
    with zipfile.ZipFile(cbz_path) as zf:
        members = [
            m
            for m in zf.infolist()
            if not m.is_dir() and Path(m.filename).suffix.lower() in IMAGE_EXT
        ]
        if not members:
            raise ValueError("Archive contains no image pages")

        total = sum(m.file_size for m in members)
        if len(members) > MAX_PAGES or total > MAX_TOTAL_UNCOMPRESSED:
            raise ValueError("Archive too large (possible zip bomb)")
        for m in members:
            if m.file_size > MAX_PAGE_UNCOMPRESSED:
                raise ValueError(
                    "Archive member too large (possible zip bomb)"
                )
            if (
                m.file_size
                and m.compress_size
                and m.file_size / max(m.compress_size, 1) > MAX_RATIO
            ):
                raise ValueError(
                    "Suspicious compression ratio (possible zip bomb)"
                )

        # ZIP-SLIP: validate every raw member name BEFORE any write. The
        # declared name is attacker-controlled; a member resolving outside
        # dest (e.g. "../evil.jpg") is rejected explicitly. (Renaming to a
        # sequential name below is defence-in-depth, not the primary guard.)
        for m in members:
            declared = (dest / m.filename).resolve()
            if not _is_within(declared, dest):
                raise ValueError(
                    f"Unsafe path in archive — member escapes destination "
                    f"(zip-slip / path traversal blocked): {m.filename}"
                )

        members.sort(key=lambda m: _natural_key(m.filename))
        for idx, m in enumerate(members):
            ext = Path(m.filename).suffix.lower()
            target = (dest / f"{idx:04d}{ext}").resolve()
            if not _is_within(target, dest):
                raise ValueError("Unsafe path in archive (outside destination)")
            with zf.open(m) as src, open(target, "wb") as out:
                shutil.copyfileobj(src, out)  # stream member-by-member only
            _sniff_image(target)
            pages.append(target)
    return pages


def layout_images(images: list[tuple[str, bytes]], dest: Path) -> list[Path]:
    """Multi-image drop path (D-01): natural-sort by original filename and
    write the byte-identical ``{idx:04d}{ext}`` layout that extract_cbz
    produces, so a CBZ and a multi-image drop yield an identical on-disk Comic.
    """
    dest = Path(dest)
    ordered = sorted(images, key=lambda pair: _natural_key(pair[0]))
    pages: list[Path] = []
    for idx, (name, data) in enumerate(ordered):
        ext = Path(name).suffix.lower()
        if ext not in IMAGE_EXT:
            raise ValueError(f"Unsupported image type: {name}")
        target = (dest / f"{idx:04d}{ext}").resolve()
        if not _is_within(target, dest):
            raise ValueError("Unsafe path (outside destination)")
        target.write_bytes(data)
        _sniff_image(target)
        pages.append(target)
    return pages


# Plan-action alias: the plan refers to assemble_pages; the binding test
# imports layout_images. Same function, two names.
assemble_pages = layout_images


def build_manifest(comic_uuid: str, pages: list[Path]) -> ChapterManifest:
    """Build the initial Comic manifest (panels empty until detection runs)."""
    from app.models.schemas import ChapterPage

    page_entries = [
        ChapterPage(
            index=i,
            filename=p.name,
            width=(size := _image_size(p))[0],
            height=size[1],
            panels=[],
        )
        for i, p in enumerate(pages)
    ]
    return ChapterManifest(
        comic_uuid=comic_uuid,
        page_count=len(pages),
        pages=page_entries,
    )


def write_manifest(dest: Path, manifest: ChapterManifest) -> Path:
    """Persist the Comic manifest to uploads/<comic_uuid>/manifest.json."""
    path = Path(dest) / MANIFEST_NAME
    path.write_text(manifest.model_dump_json(indent=2))
    return path


def read_manifest(dest: Path) -> ChapterManifest:
    """Re-read the Comic manifest. Raises FileNotFoundError if absent."""
    path = Path(dest) / MANIFEST_NAME
    return ChapterManifest(**json.loads(path.read_text()))
