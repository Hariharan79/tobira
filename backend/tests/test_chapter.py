"""
Wave 0 test scaffold — chapter endpoint and manifest behaviors.

All tests are marked xfail (strict=False) until Plan 03 adds:
  - POST /api/chapter  (ChapterUploadResponse: {comic_uuid, page_count})
  - GET  /api/chapter/{uuid}/status (PageStatus per page + page-1-ready gate)
  - uploads/<uuid>/manifest.json (Comic schema / ChapterManifest)

Tests encode the binding contracts from 05-VALIDATION.md §Per-Task Verification
Map and 05-RESEARCH.md §Pattern 1 so that Plan 03 has real, collectible pytest
tests to drive to GREEN.

Behaviors covered:
  - POST /api/chapter returns comic_uuid and page_count (T-05-08)
  - manifest.json Comic schema written and round-trips (05-03-T1)
  - GET /api/chapter/{uuid}/status reports per-page progress + page-1-ready gate (T-05-09)
"""
import io
import json

import pytest


# ---------------------------------------------------------------------------
# Task-level fixtures: the `client` and CBZ fixtures come from conftest.py
# ---------------------------------------------------------------------------


@pytest.mark.xfail(reason="Plan 03 implements POST /api/chapter", strict=False)
def test_post_chapter_returns_comic_uuid_and_page_count(client, sample_cbz):
    """POST /api/chapter with a CBZ file must return HTTP 200 with JSON body
    containing exactly: {comic_uuid: str, page_count: int}.

    page_count must equal the number of image pages in the CBZ (3 in the
    sample_cbz fixture: page1.jpg, page2.jpg, page10.jpg).
    """
    response = client.post(
        "/api/chapter",
        files={"file": ("sample.cbz", io.BytesIO(sample_cbz), "application/zip")},
    )
    assert response.status_code == 200, (
        f"Expected 200, got {response.status_code}: {response.text}"
    )
    data = response.json()
    assert "comic_uuid" in data, f"Response missing 'comic_uuid': {data}"
    assert "page_count" in data, f"Response missing 'page_count': {data}"
    assert isinstance(data["comic_uuid"], str) and len(data["comic_uuid"]) > 0
    assert data["page_count"] == 3, (
        f"sample_cbz has 3 pages (page1/page2/page10), got page_count={data['page_count']}"
    )


@pytest.mark.xfail(reason="Plan 03 implements manifest.json write", strict=False)
def test_manifest_json_comic_schema_written_and_readable(client, sample_cbz):
    """After POST /api/chapter, the server must write a manifest.json under
    uploads/<comic_uuid>/manifest.json that matches the ChapterManifest schema.

    The manifest must be valid JSON with at least: {pages: [...], page_count: int}.
    Each page entry must have a 'filename' (or 'url') key and a 'panels' list
    (which may be empty/null before detection completes).
    """
    response = client.post(
        "/api/chapter",
        files={"file": ("sample.cbz", io.BytesIO(sample_cbz), "application/zip")},
    )
    assert response.status_code == 200
    data = response.json()
    comic_uuid = data["comic_uuid"]

    # The manifest endpoint is served at GET /api/chapter/{uuid}/manifest
    # (or read from the UPLOAD_DIR — both acceptable, test the HTTP surface).
    manifest_response = client.get(f"/api/chapter/{comic_uuid}/manifest")
    assert manifest_response.status_code == 200, (
        f"Expected manifest at /api/chapter/{comic_uuid}/manifest, "
        f"got {manifest_response.status_code}"
    )
    manifest = manifest_response.json()

    # Schema assertions — binding ChapterManifest contract
    assert "pages" in manifest, f"Manifest missing 'pages': {manifest}"
    assert isinstance(manifest["pages"], list)
    assert len(manifest["pages"]) == data["page_count"]
    for page_entry in manifest["pages"]:
        assert "panels" in page_entry, (
            f"Each page entry must have a 'panels' key: {page_entry}"
        )


@pytest.mark.xfail(reason="Plan 03 implements GET /api/chapter/{uuid}/status", strict=False)
def test_status_reports_per_page_progress_and_page1_gate(client, sample_cbz):
    """GET /api/chapter/{uuid}/status must return per-page PageStatus objects and
    expose a page-1-ready gate so the frontend can unlock 'START READING'.

    Expected response shape:
      {
        pages: [{page: int, status: "queued"|"detecting"|"done"|"error", panels: ...}],
        page1_ready: bool
      }
    """
    # Upload the chapter first
    upload_resp = client.post(
        "/api/chapter",
        files={"file": ("sample.cbz", io.BytesIO(sample_cbz), "application/zip")},
    )
    assert upload_resp.status_code == 200
    data = upload_resp.json()
    comic_uuid = data["comic_uuid"]

    # Poll status immediately after upload (pages should be queued or detecting)
    status_resp = client.get(f"/api/chapter/{comic_uuid}/status")
    assert status_resp.status_code == 200, (
        f"Expected 200 from status endpoint, got {status_resp.status_code}"
    )
    status_data = status_resp.json()

    assert "pages" in status_data, f"Status missing 'pages': {status_data}"
    assert "page1_ready" in status_data, f"Status missing 'page1_ready': {status_data}"

    pages = status_data["pages"]
    assert len(pages) == data["page_count"], (
        f"Expected {data['page_count']} page statuses, got {len(pages)}"
    )

    valid_statuses = {"queued", "detecting", "done", "error"}
    for page_status in pages:
        assert "page" in page_status, f"PageStatus missing 'page': {page_status}"
        assert "status" in page_status, f"PageStatus missing 'status': {page_status}"
        assert page_status["status"] in valid_statuses, (
            f"Invalid status value '{page_status['status']}'; must be one of {valid_statuses}"
        )

    # page1_ready is a bool gate — may be False immediately after upload if
    # detection hasn't completed, but the key must always be present.
    assert isinstance(status_data["page1_ready"], bool)


def test_chapter_exists_probe_is_always_200(client):
    """The /exists probe must NEVER 404 — Safari/WebKit logs any 404 to the
    browser console (D-15). Unknown comic_uuid → 200 {"exists": false}."""
    response = client.get("/api/chapter/nonexistent-uuid/exists")
    assert response.status_code == 200
    assert response.json() == {"exists": False}
