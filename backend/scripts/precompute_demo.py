"""Precompute the static demo chapter shipped with the public site.

Runs the production detection pipeline (detect_panels: imgsz=1024,
conf=0.25, duplicate-merge, reading-order) over the Pepper&Carrot
Episode 2 pages and emits:

  frontend/public/demo/pepper-carrot-ep02/p001.jpg .. p006.jpg
  frontend/lib/demo/pepper-carrot-ep02.json   (ChapterManifest-shaped)

Source pages: Pepper&Carrot by David Revoy, CC-BY 4.0
(https://www.peppercarrot.com — episode 2, English CBZ, extracted to a
local directory passed as argv[1]).

Usage:  cd backend && PYTHONPATH=. uv run python scripts/precompute_demo.py <src_dir>

Curation notes (the public demo is a curated experience):
- Page 3's two small top panels are below the detector's recall at every
  confidence threshold (known limitation, MODEL.md). Their boxes are
  hand-measured from the page's white gutters and prepended in reading
  order. confidence=1.0 marks "hand-measured", not a model score.
- Page 6 is the CC-BY credits strip; the model boxes only the CC badge,
  so it is replaced with a single full-page panel (which also keeps the
  attribution visible in the reading flow).
"""

import json
import shutil
import sys
from pathlib import Path

from PIL import Image

from app.services.detection import detect_panels

REPO_ROOT = Path(__file__).resolve().parents[2]
OUT_IMG = REPO_ROOT / "frontend" / "public" / "demo" / "pepper-carrot-ep02"
OUT_JSON = REPO_ROOT / "frontend" / "lib" / "demo" / "pepper-carrot-ep02.json"

CURATED_PREPEND: dict[int, list[dict]] = {
    2: [
        {"bbox": [41 / 992, 13 / 1373, 448 / 992, 462 / 1373], "confidence": 1.0},
        {"bbox": [503 / 992, 13 / 1373, 448 / 992, 462 / 1373], "confidence": 1.0},
    ]
}

CURATED_REPLACE: dict[int, list[dict]] = {
    5: [{"bbox": [0.0, 0.0, 1.0, 1.0], "confidence": 1.0}]
}


def build_page(index: int, src: Path) -> dict:
    filename = f"p{index + 1:03d}.jpg"
    with Image.open(src) as im:
        width, height = im.size

    if index in CURATED_REPLACE:
        merged = CURATED_REPLACE[index]
    else:
        # Pepper&Carrot is western/LTR — pin the hint so the color-page
        # heuristic cannot flip reading direction per page.
        result = detect_panels(src, model_hint="western")
        raw = [
            {"bbox": [round(v, 5) for v in p.bbox], "confidence": round(p.confidence, 4)}
            for p in result.panels
        ]
        merged = [
            {"bbox": [round(v, 5) for v in c["bbox"]], "confidence": c["confidence"]}
            for c in CURATED_PREPEND.get(index, [])
        ] + raw

    panels = [{"id": j + 1, **p} for j, p in enumerate(merged)]
    print(f"{src.name} -> {filename}: {len(panels)} panels ({width}x{height})")
    shutil.copyfile(src, OUT_IMG / filename)
    return {
        "index": index,
        "filename": filename,
        "width": width,
        "height": height,
        "panels": panels,
    }


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit("usage: precompute_demo.py <dir with extracted P&C ep02 pages>")
    src_dir = Path(sys.argv[1])
    if not src_dir.is_dir():
        sys.exit(f"not a directory: {src_dir}")

    OUT_IMG.mkdir(parents=True, exist_ok=True)
    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)

    pages = [build_page(i, src) for i, src in enumerate(sorted(src_dir.glob("*.jpg")))]
    manifest = {
        "comic_uuid": "demo-pepper-carrot-ep02",
        "page_count": len(pages),
        "pages": pages,
    }
    OUT_JSON.write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"\nwrote {OUT_JSON}")


if __name__ == "__main__":
    main()
