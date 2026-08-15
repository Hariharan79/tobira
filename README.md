# Tobira

A panel-aware comic reader. Tobira detects the panels on a comic page with a
small ML model and plays them back as a vertical, panel-by-panel feed — so each
beat lands the way it was drawn.

- **Single page**: drop one image, get an ordered panel walkthrough.
- **Chapter**: drop a `.cbz` archive (or many images); pages are detected
  eagerly and stream in as they finish, with a continuous cross-page reader.
- **Reading order**: inferred left-to-right or right-to-left (manga mode),
  with a manual reorder fallback.

## Public demo vs. running locally

The public site is a **curated demo**: it ships one openly-licensed chapter
([Pepper&Carrot, Episode 2](https://www.peppercarrot.com) by David Revoy,
CC-BY 4.0) with precomputed panel data, and makes **zero backend calls** —
there is no upload feature on the public deployment.

To read your own files, run Tobira locally. Uploaded pages are processed by
your own local backend, held transiently for the reading session, and are
never stored permanently or shared with anyone.

## Quick start (local)

Backend (FastAPI, Python 3.12+, [uv](https://docs.astral.sh/uv/)):

```bash
cd backend && uv sync && uv run uvicorn app.main:app --reload --port 8000
```

Frontend (Next.js):

```bash
cd frontend && npm install && npm run dev
```

Open http://localhost:3000. Or run both with `docker-compose up`.

To build the demo-mode variant (what the public site runs), set
`NEXT_PUBLIC_DEMO_MODE=1` (see `npm run dev:demo`).

## Panel detection

Detection uses a single universal detector —
[leoxs22/manga-panel-detector-yolo26n](https://huggingface.co/leoxs22/manga-panel-detector-yolo26n)
(YOLO26n, Apache 2.0) — downloaded at first run and cached locally. The
model was trained on the **Manga109-s dataset**, and this use is indicated
here in accordance with that dataset's license terms; the dataset itself is
not included in or redistributed by this repository. Model choice, inference
configuration, and known limitations are documented in
[backend/MODEL.md](backend/MODEL.md).

## Tests

```bash
cd backend && uv run pytest tests/
cd frontend && npm run test:run
```

Test fixtures are synthetic (generated at test time); provenance for all
bundled and referenced assets is in [SOURCES.md](SOURCES.md).

## Content policy

Tobira is a reader for comics you have the right to read — your own scans,
purchases, or openly-licensed works. It does not host, index, or link to
comic content, and the local tool keeps nothing permanently. Please don't
use it to redistribute copyrighted material.

## License

[MIT](LICENSE) © 2026 Hariharan Natarajan. Bundled demo content is
CC-BY 4.0 by its original author (see [SOURCES.md](SOURCES.md)).
