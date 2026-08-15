# Asset & Data Sources

Provenance for everything bundled in, or referenced by, this repository.

## Bundled demo chapter

`frontend/public/demo/pepper-carrot-ep02/` and
`frontend/lib/demo/pepper-carrot-ep02.json`

- **Work**: _Pepper&Carrot_, Episode 2: "Rainbow Potions"
- **Author**: [David Revoy](https://www.davidrevoy.com)
- **License**: [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- **Source**: official English CBZ release of
  [peppercarrot.com](https://www.peppercarrot.com)
- **Modifications**: pages renamed `p001.jpg`–`p006.jpg`; a panel-geometry
  manifest was generated with `backend/scripts/precompute_demo.py` (the
  production detection pipeline). Two small panels on page 3 are
  hand-measured (below current model recall — see `backend/MODEL.md`
  known limitations), and the episode's credits strip is kept intact as
  the final page so attribution appears in the reading flow.

## Panel detection model

- **Model**: [leoxs22/manga-panel-detector-yolo26n](https://huggingface.co/leoxs22/manga-panel-detector-yolo26n)
  (YOLO26n, Apache 2.0). Downloaded at first run into `backend/models/`
  (gitignored) — model weights are not committed to this repository.
- **Training data**: the [Manga109-s dataset](http://www.manga109.org).
  Use of machine-learning results trained on Manga109-s is indicated here
  in accordance with the dataset's license conditions. The dataset itself
  — and its images — are **not** included in, or redistributed by, this
  repository.

## Test fixtures

Backend and frontend test suites use **synthetic images only** (1×1 or
solid-color images generated with PIL at test time — see
`backend/tests/conftest.py`). No third-party comic pages are used as test
fixtures.

## Development benchmark pages (not in this repository)

Detection quality was benchmarked on openly-licensed and public-domain
pages (Pepper&Carrot episodes, CC-BY 4.0; golden-age _Planet Comics_
issues in the US public domain, via archive.org). These pages live outside
the repository and are not distributed with it.
