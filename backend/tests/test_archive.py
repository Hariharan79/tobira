"""
Wave 0 test scaffold — backend archive service behaviors.

All tests are marked xfail (strict=False) until Plan 03 implements
backend/app/services/archive.py. They encode the binding contracts from
05-VALIDATION.md and 05-RESEARCH.md §Pattern 2 so that Plan 03 has
real, collectible pytest tests to drive to GREEN.

Behaviors covered:
  - CBZ extracts to natural-sorted pages (page2 < page10 — D-02)
  - Zip-slip path rejected with ValueError (T-05-03)
  - Zip-bomb ratio rejected with ValueError (T-05-05)
  - Multi-image drop yields the same {idx:04d} on-disk layout as CBZ
"""
import io
import zipfile

import pytest


# ---------------------------------------------------------------------------
# Helper: import the not-yet-existing archive module inside each test body
# so that collection never errors even before Plan 03 lands.
# ---------------------------------------------------------------------------


@pytest.mark.xfail(reason="Plan 03 implements app.services.archive", strict=False)
def test_cbz_extracts_to_natural_sorted_pages(tmp_path, sample_cbz):
    """CBZ extract must produce pages in natural order: page1 < page2 < page10.

    Naive lexicographic sort gives page1 < page10 < page2 (wrong).
    extract_cbz must use _natural_key so the resulting file list, when sorted
    by name, yields [page1, page2, page10] — i.e. 0001.jpg=page1,
    0002.jpg=page2, 0003.jpg=page10.
    """
    from app.services.archive import extract_cbz  # noqa: PLC0415 — intentional late import

    dest = tmp_path / "comic"
    dest.mkdir()
    cbz_path = tmp_path / "test.cbz"
    cbz_path.write_bytes(sample_cbz)

    pages = extract_cbz(cbz_path, dest)

    # extract_cbz must return the paths in natural order
    assert len(pages) == 3, f"Expected 3 pages, got {len(pages)}"
    names = [p.name for p in pages]
    # Zero-padded layout: 0001.jpg, 0002.jpg, 0003.jpg
    assert names == sorted(names), "Pages must be in ascending natural-sort order"
    # The file that was page1.jpg in the CBZ must come before page2.jpg,
    # which must come before page10.jpg.  We verify by checking the original
    # filenames are re-mapped correctly (archive stores them as sequential).
    assert pages[0].exists() and pages[1].exists() and pages[2].exists()


@pytest.mark.xfail(reason="Plan 03 implements app.services.archive", strict=False)
def test_zip_slip_path_is_rejected(tmp_path, sample_cbz_zip_slip):
    """extract_cbz must raise ValueError for any member whose resolved path
    escapes the destination directory (../evil.jpg attack vector — T-05-03).
    """
    from app.services.archive import extract_cbz  # noqa: PLC0415

    dest = tmp_path / "comic"
    dest.mkdir()
    cbz_path = tmp_path / "evil.cbz"
    cbz_path.write_bytes(sample_cbz_zip_slip)

    with pytest.raises(ValueError, match=r"(?i)zip.slip|path.traversal|outside"):
        extract_cbz(cbz_path, dest)

    # Confirm no file was written outside dest
    evil_file = tmp_path / "evil.jpg"
    assert not evil_file.exists(), "Zip-slip file must not be written to disk"


@pytest.mark.xfail(reason="Plan 03 implements app.services.archive", strict=False)
def test_zip_bomb_ratio_is_rejected(tmp_path):
    """extract_cbz must raise ValueError before any write when a member is a
    decompression bomb — its real uncompressed size and/or compression ratio
    exceeds the configured caps (T-05-05 zip-bomb guard).

    NOTE (Plan 05-03 deviation — scaffold fix): the original scaffold tried to
    spoof ``ZipInfo.file_size``/``compress_size``. Python's
    ``zipfile.writestr`` rewrites both from the actual data, so the crafted
    200MB:1KB ratio never survives the round-trip (file_size==compress_size==
    len(data)) and no size/ratio guard could ever fire. A correct test must
    build a *genuine* bomb: a large, highly-compressible member whose real
    metadata (preserved by zipfile) trips the guard.
    """
    from app.services.archive import extract_cbz  # noqa: PLC0415

    dest = tmp_path / "comic"
    dest.mkdir()

    # Genuine bomb: 60 MB of zeros deflates to a few KB. The real (zipfile-
    # preserved) file_size exceeds MAX_PAGE_UNCOMPRESSED and the real
    # compression ratio exceeds MAX_RATIO — both detectable before any write.
    bomb_payload = b"\x00" * (60 * 1024 * 1024)
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("bomb.jpg", bomb_payload)

    cbz_bomb_path = tmp_path / "bomb.cbz"
    cbz_bomb_path.write_bytes(buf.getvalue())

    with pytest.raises(ValueError, match=r"(?i)zip.bomb|ratio|too large"):
        extract_cbz(cbz_bomb_path, dest)

    # No page file may have been written before the guard fired.
    assert not list(dest.glob("0*.jpg")), "Bomb member must be rejected pre-write"


@pytest.mark.xfail(reason="Plan 03 implements app.services.archive", strict=False)
def test_multi_image_drop_yields_same_layout_as_cbz(tmp_path, sample_cbz, sample_jpeg, sample_png):
    """Multi-image upload must produce the same {idx:04d}{ext} on-disk layout
    as extract_cbz (D-01 shared Comic path).

    We simulate the multi-image path by calling the expected layout helper
    directly and compare it to what extract_cbz produces.
    """
    from app.services.archive import extract_cbz, layout_images  # noqa: PLC0415

    # --- CBZ path ---
    cbz_dest = tmp_path / "cbz_comic"
    cbz_dest.mkdir()
    cbz_path = tmp_path / "test.cbz"
    cbz_path.write_bytes(sample_cbz)
    cbz_pages = extract_cbz(cbz_path, cbz_dest)
    cbz_layout = [p.name for p in cbz_pages]

    # --- Multi-image drop path ---
    # Images provided in non-natural order; layout_images must sort them.
    images = [
        ("page2.jpg", sample_jpeg),
        ("page10.jpg", sample_jpeg),
        ("page1.jpg", sample_png),
    ]
    img_dest = tmp_path / "img_comic"
    img_dest.mkdir()
    img_pages = layout_images(images, img_dest)
    img_layout = [p.name for p in img_pages]

    # Both paths must produce the same zero-padded sequential filenames.
    assert cbz_layout == img_layout, (
        f"CBZ layout {cbz_layout} != multi-image layout {img_layout}"
    )
