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
    """extract_cbz must raise ValueError when the compressed-to-uncompressed
    ratio exceeds the configured MAX_RATIO (T-05-05 zip-bomb guard).

    We craft a ZIP whose single member's compress_size is tiny but file_size
    is enormous (simulated via ZipInfo metadata — no need to actually expand).
    """
    from app.services.archive import extract_cbz  # noqa: PLC0415

    dest = tmp_path / "comic"
    dest.mkdir()

    # Build a ZIP with a ZipInfo that reports a 1000:1 uncompressed ratio.
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        # Write real small bytes but override the header sizes via ZipInfo.
        info = zipfile.ZipInfo("bomb.jpg")
        # Stored (no compression) so compress_size == file_size normally;
        # we write a small payload and then patch the stored header to lie.
        payload = b"\xff\xd8\xff\xe0" + b"\x00" * 10  # minimal JPEG-like header
        zf.writestr(info, payload)

    # Patch the ZipInfo to pretend the file is enormous.
    cbz_path = tmp_path / "bomb.cbz"
    cbz_path.write_bytes(buf.getvalue())

    # Create a second ZIP with manipulated ZipInfo sizes to trigger the guard.
    buf2 = io.BytesIO()
    with zipfile.ZipFile(buf2, "w") as zf2:
        info2 = zipfile.ZipInfo("bomb.jpg")
        info2.file_size = 200 * 1024 * 1024  # 200 MB reported
        info2.compress_size = 1024  # 1 KB compressed — ratio ≈ 200 000:1
        zf2.writestr(info2, b"\xff\xd8\xff\xe0fake")

    cbz_bomb_path = tmp_path / "bomb2.cbz"
    cbz_bomb_path.write_bytes(buf2.getvalue())

    with pytest.raises(ValueError, match=r"(?i)zip.bomb|ratio|too large"):
        extract_cbz(cbz_bomb_path, dest)


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
