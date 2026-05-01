# Tobira: Project Specification

A panel-aware comic reader with a similarity-based recommendation engine. Built in two major versions across roughly seven phases.

## Stack Decisions (Locked Before Phase 1)

These choices apply across all phases. Don't revisit them unless something forces it.

**Frontend**: Next.js (App Router) with TypeScript and Tailwind. React for component logic. Reasoning: deployable to Vercel in one click, good for portfolio polish, file uploads and image rendering are well-supported.

**Backend**: FastAPI (Python). Reasoning: panel detection and embeddings are Python-native, and FastAPI is the cleanest way to expose them. Run as a separate service from the frontend.

**Image processing**: OpenCV and PIL for classical operations. PyTorch or ONNX Runtime for any model inference.

**Panel detection model**: Start with a pretrained model. Search Hugging Face and GitHub for "manga panel detection" and "comic panel segmentation." Likely candidates are YOLO-based detectors trained on Manga109 or similar datasets. Do not train your own model in v1.

**Database (v2 only)**: Postgres with pgvector extension. Reasoning: keeps structured data (comic metadata, user reading history) and vector embeddings in one place. Run locally via Docker for development.

**Embedding model (v2 only)**: OpenAI text-embedding-3-small for the corpus. Cheap, good enough, one-time cost.

**Deployment**: Frontend on Vercel. Backend on Railway, Fly.io, or Render. Database on Railway or Supabase (both support pgvector).

---

# Phase 1: Project Scaffolding and Image Upload

Goal: a working dev environment where a user can upload an image and see it displayed back. No detection yet. This phase is about getting the boring infrastructure right so later phases don't fight it.

## Tasks

1. Initialize a monorepo with two folders: `frontend/` (Next.js + TypeScript + Tailwind) and `backend/` (FastAPI + Python). Use a top-level README explaining how to run each.

2. Set up the FastAPI backend with a single endpoint `POST /api/upload` that accepts a multipart image file, saves it to a local `uploads/` directory with a UUID filename, and returns the UUID and image dimensions. Add CORS middleware allowing the frontend's localhost origin.

3. Set up the Next.js frontend with a single page containing a drag-and-drop upload zone (use `react-dropzone` or build it). On drop, POST the file to the backend, then display the uploaded image at full size below the upload zone.

4. Add a `.gitignore` covering `node_modules/`, `__pycache__/`, `uploads/`, `.env`, `.next/`, and Python venv directories.

5. Add a `docker-compose.yml` at the root that runs both services. Frontend on port 3000, backend on port 8000.

6. Add basic error handling: backend returns 400 for non-image files, frontend shows an error toast on upload failure.

## Acceptance Criteria

- `docker-compose up` starts both services successfully.
- A user can drag a JPG or PNG into the browser and see it rendered.
- The image persists on disk in `backend/uploads/`.
- The browser console shows no errors.

## Out of Scope

- Authentication, user accounts, sessions.
- Multi-image upload (one at a time for now).
- Cloud storage (local disk is fine).
- PDF or CBZ support.

---

# Phase 2: Panel Detection

Goal: when a user uploads a comic page, the backend returns bounding boxes for each detected panel, and the frontend overlays them on the image.

## Tasks

1. Research and select a pretrained panel detection model. Document the choice in `backend/MODEL.md` with: source, license, expected input format, expected output format, and known limitations. Acceptable approaches: a YOLO model fine-tuned on Manga109, a published comic panel detector on Hugging Face, or a hybrid (classical CV fallback for clearly-rectangular layouts, model for complex pages).

2. Add a `backend/detection.py` module with a single function `detect_panels(image_path: str) -> List[Panel]` where `Panel` is a Pydantic model containing `id` (int), `bbox` (x, y, width, height in pixels), and `confidence` (float).

3. Add a new endpoint `POST /api/detect` that accepts the UUID of an already-uploaded image, runs detection, and returns the list of panels along with the original image dimensions.

4. On the frontend, after upload, call `/api/detect` and overlay semi-transparent colored rectangles on the image for each detected panel. Number each panel in its top-left corner.

5. Add a "redetect" button that re-runs detection (useful while iterating on the model).

6. Handle the failure case: if no panels are detected, show a clear message. If detection takes >10 seconds, show a loading state.

## Acceptance Criteria

- Upload a Western comic page: panels are detected with reasonable accuracy (most panels found, few false positives).
- Upload a manga page: same.
- Upload a non-comic image (a photo): either no panels detected with a clear message, or low-confidence detections that could be filtered.
- Bounding boxes scale correctly when the browser is resized.

## Notes for Implementation

- Test with at least 20 real comic pages from different sources (Western superhero, manga, indie webcomic, newspaper strip) before considering this phase done. The model that works on Manga109 may fail on Calvin and Hobbes.
- If the chosen model is bad, document why in `MODEL.md` and try another. Don't accept "good enough on the easy cases" if it fails on common pages.
- Save model files outside the repo. Use a `models/` directory in `.gitignore` and document download instructions.

## Out of Scope

- Reading order (Phase 3).
- Manual panel correction (Phase 4).
- OCR or speech bubble detection (later, possibly v1.5).

---

# Phase 3: Reading Order Inference

Goal: panels are returned in the order a human would read them, not in arbitrary detection order.

## Tasks

1. Add a reading-order module `backend/reading_order.py` with a function `infer_order(panels: List[Panel], direction: Literal["ltr", "rtl"]) -> List[Panel]`. The function should return the panels sorted in reading order, with the `id` field updated to reflect the new sequence.

2. Implement the algorithm: cluster panels into rows by y-coordinate overlap (two panels are in the same row if their vertical extents overlap by more than 50%). Sort rows top-to-bottom by the average y of panels in each row. Within each row, sort panels left-to-right (or right-to-left if `direction == "rtl"`).

3. Handle edge cases: panels that span multiple rows (a tall panel next to a column of short panels), panels that overlap each other, and panels that are nearly the same y but slightly offset.

4. Expose the direction as a parameter on `/api/detect` (default `ltr`). The frontend should default to LTR but show a toggle for RTL (manga mode).

5. On the frontend, update the panel numbering to reflect the inferred order. The numbers in the top-left of each panel should now match reading sequence.

## Acceptance Criteria

- A standard 6-panel grid (2 columns x 3 rows) is numbered 1-6 left-to-right, top-to-bottom.
- The same grid in RTL mode is numbered 1-6 right-to-left.
- A page with a wide top panel and a row of three smaller panels below numbers them correctly (1 wide panel, then 2-3-4 in the bottom row).
- A page with a tall panel on the right next to two stacked panels on the left numbers the stacked panels first (1, 2) then the tall one (3), or vice versa depending on layout convention. Document the convention you chose.

## Notes

- This is the part where you should look at real failure cases. Pick 10 pages with non-trivial layouts and verify the order is correct on each. If the algorithm fails, prefer fixing the heuristic over hand-coding cases.
- Don't over-engineer. A 90% solution with a manual override (Phase 4) beats a 99% solution that took three weeks.

## Out of Scope

- Machine-learned reading order (the heuristic is enough).
- Pages with non-standard reading patterns (Z-order webcomics, etc.) beyond what falls out naturally.

---

# Phase 4: Panel-by-Panel Reader UX

Goal: a user can read a comic panel-by-panel, with each panel displayed at a comfortable size, advancing with click or arrow keys.

## Tasks

1. Add a "Read" button on the upload/detection view that switches to reader mode.

2. In reader mode, display one panel at a time, cropped from the original image and scaled to fit the viewport with appropriate padding. Show a small thumbnail of the full page in a corner, with the current panel highlighted.

3. Keyboard navigation: left/right arrow keys (or A/D) advance and go back. Spacebar advances. Escape returns to the overview.

4. Click navigation: clicking the right half of the panel advances, left half goes back. Mobile-friendly tap targets.

5. Manual order correction: in overview mode, allow the user to click panels in the correct order to override the inferred sequence. Provide a "reset to inferred" button.

6. Smooth transitions between panels (CSS transition on the cropped image, ~200ms).

7. URL state: the current panel index should be in the URL hash (`#panel=3`) so a user can share a link to a specific panel.

## Acceptance Criteria

- A user can read through a 12-panel page in reader mode without confusion.
- The current panel is always clearly visible and centered.
- Keyboard, click, and tap all work.
- Manual reordering persists for the current session (no need to save to disk yet).
- The reader works on mobile (viewport sizing is correct, taps work).

## Out of Scope

- Multi-page reading (Phase 5).
- Saving reading progress across sessions (would need accounts).
- Annotations, bookmarks.

---

# Phase 5: Multi-Page Support and Polish

Goal: a user can upload a folder of pages or a CBZ archive and read through an entire chapter.

## Tasks

1. Extend the upload endpoint to accept a ZIP file or multiple images in one request. Detect CBZ by extension and unzip server-side.

2. Add a `Comic` concept in the backend: a collection of pages, each with its own panels. Store as a JSON file alongside the images for now (`uploads/<comic_uuid>/manifest.json`).

3. Frontend: after uploading multiple pages, show a chapter view (a vertical list of page thumbnails), then enter reader mode that flows panels across pages seamlessly.

4. Handle the page boundary in reading order: the last panel of page N is followed by the first panel of page N+1.

5. Sort uploaded pages by filename (natural sort, so `page2.jpg` comes before `page10.jpg`).

6. Polish pass: loading states everywhere, empty states with helpful messages, error toasts that say what went wrong, mobile responsiveness audit, dark mode (optional but easy with Tailwind), favicon, meta tags for sharing, a landing page that explains what the tool does with a demo GIF.

7. Deploy: frontend to Vercel, backend to Railway or Fly. Wire up environment variables for API URLs. Test the full flow on production.

## Acceptance Criteria

- Upload a 20-page CBZ: all pages process, reader flows through all panels in order.
- Production deployment is live and a recruiter could use it without instructions.
- Lighthouse score on the landing page is reasonable (>80 on all metrics).
- No console errors in production.

## Out of Scope

- v2 features (recommendation engine).
- User accounts.
- A comic library (uploaded comics persist only for the session).

---

# v1 Ships Here

At this point, v1 is a real product. Make a Loom or QuickTime demo video (60-90 seconds), write a project README that's actually good (problem, approach, demo GIF, tech stack, link to live deployment), and put it on your portfolio. Don't start v2 until v1 has been live for at least two weeks and you've shown it to at least five people. Use that time to fix the bugs they find, which there will be.

---

# Phase 6: Recommendation Engine Foundation (v2)

Goal: a corpus of comics with rich descriptions, embedded into a vector DB, queryable for nearest neighbors.

## Tasks

1. Set up Postgres with pgvector locally (Docker) and in production (Supabase or Railway). Create a schema:

   ```sql
   CREATE TABLE comics (
     id UUID PRIMARY KEY,
     external_id TEXT,                -- MAL/AniList ID
     title TEXT NOT NULL,
     synopsis TEXT,
     enriched_description TEXT,       -- LLM-generated structured description
     tags TEXT[],
     year INTEGER,
     status TEXT,                     -- ongoing, completed, etc.
     average_rating FLOAT,
     embedding_plot vector(1536),
     embedding_tone vector(1536),
     embedding_themes vector(1536),
     embedding_combined vector(1536)
   );
   CREATE INDEX ON comics USING ivfflat (embedding_combined vector_cosine_ops);
   ```

2. Build a corpus pipeline `backend/corpus/`:
   - `scrape.py`: pull comic metadata from a public source. AniList's GraphQL API is the cleanest starting point (free, no auth required for read access). Pull the top 1000-2000 manga/comics by popularity to start.
   - `enrich.py`: for each comic, generate a structured description using an LLM. The prompt should produce four sections: PLOT (premise and main conflict), TONE (mood, pacing, emotional register), THEMES (what the work is about thematically), and STYLE (art style, narrative style). Save the structured description as JSON.
   - `embed.py`: generate four embeddings per comic (plot, tone, themes, and a combined one made from the full enriched description). Store all four in Postgres.
   - `load.py`: orchestrate the above and load into the DB.

3. Add a CLI command (`python -m backend.corpus.build`) that runs the full pipeline and reports progress. Make it idempotent (skip comics already in the DB unless forced).

4. Add an API endpoint `POST /api/recommend` that accepts a list of `{external_id, rating}` pairs and returns nearest neighbors. The recommendation logic:
   - For each input comic, fetch its `embedding_combined`.
   - Compute a weighted centroid (weight by rating, e.g. rating 5 = weight 1.0, rating 1 = weight -1.0).
   - Query for the 50 nearest neighbors to the centroid.
   - Filter out: comics in the input list, comics with average_rating < 3.0.
   - Apply a diversity rerank: greedy selection, where each new pick must have cosine similarity below a threshold to all already-picked items.
   - Return the top 10.

## Acceptance Criteria

- Corpus has at least 1000 comics with enriched descriptions and four embeddings each.
- Recommendation endpoint returns sensible results for a test input (give it three popular shonen titles, get back other shonen-adjacent recommendations, not random comedies).
- Diversity rerank produces visibly different results than raw nearest-neighbor (no three near-clones in the top 10).

## Out of Scope

- User-facing UI for recommendations (Phase 7).
- Multi-vector queries (Phase 7).
- Natural-language queries (Phase 7).
- Collaborative filtering (won't have users).

## Notes

- The LLM enrichment is the most important step. Test with 10 comics first, read the outputs, iterate on the prompt until the descriptions are genuinely useful and discriminating. Generic outputs ("this is a manga about a hero on a journey") will produce generic recommendations.
- Cost estimate: 1500 comics x ~500 tokens of enrichment input x ~800 tokens output, plus embeddings. Should be under $20 with text-embedding-3-small and a cheap chat model.

---

# Phase 7: Recommendation UX and Advanced Queries

Goal: a polished UX where users can input what they've read, get recommendations, and refine with natural-language queries.

## Tasks

1. Frontend: a "Recommendations" page with three sections.
   - **My Library**: a search-and-add interface where users type a comic title, autocomplete from the corpus, and add it with a star rating (1-5). Stored in localStorage.
   - **Get Recommendations**: a button that sends the library to the API and displays recommended comics as cards (cover image if available, title, year, synopsis, "why this was recommended" explanation).
   - **Refine with Words**: a text input where users can describe what they want ("something like Berserk but less bleak"). The query is embedded, blended with the library centroid (50/50 by default, with a slider), and used for recommendations.

2. Backend: extend `/api/recommend` to accept an optional `text_query` parameter. If present, embed it and blend with the library centroid before nearest-neighbor search.

3. Multi-vector queries: add a "match by" toggle on the frontend (Plot / Tone / Themes / Overall), which switches which embedding column is queried. This produces different recommendations from the same library, which is the killer feature.

4. "Why this?" explanations: for each recommendation, generate a short LLM-written explanation of why it matches the user's library (input: the user's top-rated comics, the recommended comic, the chosen match-by axis; output: 1-2 sentences). Cache these.

5. Polish: loading skeletons for recommendations, empty states, error handling, share link for a library ("here's my list, get your own recommendations from it"), a "surprise me" button that randomizes the diversity threshold for more adventurous picks.

6. Deploy: ensure pgvector is set up in production. Update the live demo to include the recommendation flow.

## Acceptance Criteria

- A user can build a library of 5-10 comics, get recommendations, and read explanations of why each was picked.
- Switching the match-by axis produces visibly different recommendations.
- A natural-language refinement noticeably changes the output.
- The whole flow works on mobile.

## Out of Scope

- User accounts and persistent libraries (libraries live in localStorage; this is fine for v2).
- Social features.
- Automatic library import from MyAnimeList/AniList accounts (v3 territory).

---

# v2 Ships Here

Same as v1 ship: demo video, updated README, portfolio entry. The recommendation engine is genuinely impressive if the corpus is good and the explanations land, and it's the kind of thing that gets shared in niche subreddits or Discords. Ship it, then post it somewhere a comic-reading audience will see.

---

# What This Spec Doesn't Cover

These are real questions you'll hit, but they're decisions to make in context, not upfront:

- Specific copy and microcopy. Write it as you build, polish at the end of each phase.
- Exact UI styling. Tailwind plus a clean Inter or sans-serif font is fine; don't bikeshed.
- Testing strategy. Add tests for the algorithmic core (panel detection wrapper, reading order, recommendation logic) but don't try for full coverage.
- Analytics, telemetry, error reporting. Skip in v1, add Plausible or PostHog in v2 if you want usage data.
