"""
Chapter route: the multi-page (CBZ / folder) pipeline.

SEPARATE code path from the single-image flow (D-03) — upload.py / detect.py
are NOT touched. Eager page-0-first background detection with an SSE progress
stream and a polling fallback (RESEARCH Pattern 1, Pitfall 5). detect_panels()
is reused unchanged, offloaded per page via asyncio.to_thread (Open Q2).
"""

import asyncio
import json
import shutil
import uuid as uuid_lib
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, File, HTTPException, UploadFile
from fastapi.responses import FileResponse, StreamingResponse

from app.models.schemas import ChapterManifest, ChapterUploadResponse, PageStatus
from app.routes import upload as upload_module
from app.services.archive import (
    build_manifest,
    extract_cbz,
    layout_images,
    read_manifest,
    write_manifest,
)
from app.services.chapter_status import ChapterStatus
from app.services.detection import detect_panels

router = APIRouter()

_CBZ_SUFFIXES = {".cbz", ".zip"}


def _comic_dir(comic_uuid: str) -> Path:
    # Dynamic access so the conftest UPLOAD_DIR override is honored.
    return upload_module.UPLOAD_DIR / comic_uuid


def _require_comic(comic_uuid: str) -> Path:
    path = _comic_dir(comic_uuid)
    if not path.exists():
        # Detail string only — no stack/info leak (Pitfall 3, T-05-08).
        raise HTTPException(status_code=404, detail="Chapter not found")
    return path


async def _detect_all(comic_uuid: str, comic_dir: str, page_paths: list[str]) -> None:
    """Background: detect page 0 FIRST so the reader can open ASAP (D-07).

    Each detect_panels() call is offloaded to a thread so the SSE generator
    stays responsive (RESEARCH Open Q2). Per-page failures are isolated.
    """
    dest = Path(comic_dir)
    for i, p in enumerate(page_paths):
        ChapterStatus.set(comic_uuid, i, "detecting")
        ChapterStatus.wake(comic_uuid)
        try:
            result = await asyncio.to_thread(detect_panels, Path(p))
            manifest = read_manifest(dest)
            if i < len(manifest.pages):
                manifest.pages[i].panels = result.panels
                write_manifest(dest, manifest)
            ChapterStatus.set(comic_uuid, i, "done")
        except Exception:
            ChapterStatus.set(comic_uuid, i, "error")
        ChapterStatus.wake(comic_uuid)


@router.post("/api/chapter", response_model=ChapterUploadResponse)
async def create_chapter(
    background: BackgroundTasks,
    file: UploadFile | None = File(default=None),
    files: list[UploadFile] | None = File(default=None),
) -> ChapterUploadResponse:
    """Upload a .cbz OR a list of image files (D-01 shared path)."""
    comic_uuid = str(uuid_lib.uuid4())
    dest = _comic_dir(comic_uuid)
    dest.mkdir(parents=True, exist_ok=True)

    if file is not None and Path(file.filename or "").suffix.lower() in _CBZ_SUFFIXES:
        archive_path = dest / "_archive.cbz"
        with open(archive_path, "wb") as out:
            shutil.copyfileobj(file.file, out)
        try:
            pages = extract_cbz(archive_path, dest)
        except ValueError as exc:
            shutil.rmtree(dest, ignore_errors=True)
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        finally:
            archive_path.unlink(missing_ok=True)
    elif files:
        payload = [(f.filename or f"{i}", f.file.read()) for i, f in enumerate(files)]
        try:
            pages = layout_images(payload, dest)
        except ValueError as exc:
            shutil.rmtree(dest, ignore_errors=True)
            raise HTTPException(status_code=400, detail=str(exc)) from exc
    else:
        shutil.rmtree(dest, ignore_errors=True)
        raise HTTPException(
            status_code=400,
            detail="Provide a .cbz 'file' or one or more image 'files'",
        )

    manifest = build_manifest(comic_uuid, pages)
    write_manifest(dest, manifest)
    ChapterStatus.init(comic_uuid, len(pages))
    background.add_task(_detect_all, comic_uuid, str(dest), [str(p) for p in pages])

    return ChapterUploadResponse(comic_uuid=comic_uuid, page_count=len(pages))


@router.get("/api/chapter/{comic_uuid}/manifest", response_model=ChapterManifest)
async def get_manifest(comic_uuid: str) -> ChapterManifest:
    _require_comic(comic_uuid)
    try:
        return read_manifest(_comic_dir(comic_uuid))
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Chapter not found") from exc


@router.get("/api/chapter/{comic_uuid}/exists")
async def chapter_exists(comic_uuid: str) -> dict:
    """
    Console-quiet existence probe — ALWAYS returns 200 {"exists": bool}.

    A 404 (even via fetch/EventSource) is logged to the browser console by
    Safari/WebKit. The client validates a restored localStorage chapter ref
    against this before opening the EventSource / status poll, so a wiped
    backend (ephemeral FS, D-10) degrades with ZERO console errors (D-15).
    """
    return {"exists": _comic_dir(comic_uuid).exists()}


@router.get("/api/chapter/{comic_uuid}/status")
async def get_status(comic_uuid: str) -> dict:
    """Polling fallback (Pitfall 5): per-page status + the page-1-ready gate."""
    _require_comic(comic_uuid)
    snap = ChapterStatus.snapshot(comic_uuid)
    try:
        manifest = read_manifest(_comic_dir(comic_uuid))
        panels_by_page = {p.index: p.panels for p in manifest.pages}
    except FileNotFoundError:
        panels_by_page = {}
    pages = [
        PageStatus(
            page=i,
            status=snap.get(i, "queued"),
            panels=panels_by_page.get(i) or None,
        )
        for i in sorted(snap)
    ]
    return {
        "pages": [p.model_dump() for p in pages],
        "page1_ready": ChapterStatus.page_1_ready(comic_uuid),
    }


@router.get("/api/chapter/{comic_uuid}/events")
async def chapter_events(comic_uuid: str) -> StreamingResponse:
    _require_comic(comic_uuid)

    async def gen():
        last: dict[int, str] = {}
        while True:
            cur = ChapterStatus.snapshot(comic_uuid)
            for page, st in cur.items():
                if last.get(page) != st:
                    last[page] = st
                    yield f"data: {json.dumps({'page': page, 'status': st})}\n\n"
            if cur and all(v in ("done", "error") for v in cur.values()):
                yield f"data: {json.dumps({'done': True})}\n\n"
                return
            ev = ChapterStatus.EVENTS.get(comic_uuid)
            if ev is None:
                yield f"data: {json.dumps({'done': True})}\n\n"
                return
            ev.clear()
            try:
                await asyncio.wait_for(ev.wait(), timeout=15)
            except TimeoutError:
                yield ": keep-alive\n\n"  # comment frame keeps proxies open

    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/api/chapter/{comic_uuid}/page/{n}")
async def get_page(comic_uuid: str, n: int) -> dict:
    """Catch-up fetch for a single page's panels (D-09)."""
    _require_comic(comic_uuid)
    try:
        manifest = read_manifest(_comic_dir(comic_uuid))
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Chapter not found") from exc
    if n < 0 or n >= len(manifest.pages):
        raise HTTPException(status_code=404, detail="Page not found")
    page = manifest.pages[n]
    return {
        "page": n,
        "status": ChapterStatus.snapshot(comic_uuid).get(n, "queued"),
        "panels": [p.model_dump() for p in page.panels],
    }


@router.get("/api/chapter/{comic_uuid}/page/{n}/image")
async def get_page_image(comic_uuid: str, n: int) -> FileResponse:
    comic_dir = _require_comic(comic_uuid)
    try:
        manifest = read_manifest(comic_dir)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Chapter not found") from exc
    if n < 0 or n >= len(manifest.pages):
        raise HTTPException(status_code=404, detail="Page not found")
    image_path = comic_dir / manifest.pages[n].filename
    if not image_path.exists():
        raise HTTPException(status_code=404, detail="Page image not found")
    return FileResponse(image_path, content_disposition_type="inline")
