# Panel Detection Model

This document describes the pretrained model used for comic panel detection.

## Model Selection

Tobira uses a **single universal panel detector** for all comic styles.

**Repository:** [leoxs22/manga-panel-detector-yolo26n](https://huggingface.co/leoxs22/manga-panel-detector-yolo26n)

| Property     | Value                        |
| ------------ | ---------------------------- |
| Architecture | YOLO26n                      |
| Parameters   | 2.57M                        |
| mAP50        | 0.956 (Manga109-s val)       |
| File         | manga_panel_detector_fp32.pt |
| Size         | ~15MB                        |
| License      | Apache 2.0                   |

**Classes:**

- 0: panel
- 1: text (filtered in detection)

### Training-data attribution

The model was trained on the **Manga109-s dataset** and is used here under
its license conditions, which permit commercial use of machine-learning
results (including pre-trained models) provided the use of the dataset is
clearly indicated. Manga109-s images are **not** included in, or
redistributed by, this repository.

### Why one model? (2026-07 benchmark)

Earlier versions routed grayscale/tall pages to this model and color pages
to a Western-specific YOLOv12x (`mosesb/best-comic-panel-detection`).
Benchmarking on real out-of-distribution pages (Pepper&Carrot color/euro
pages, 1953 golden-age Planet Comics grids) showed:

- The Western model (trained on 86 images) missed obvious panels at
  imgsz 640, collapsed to zero detections at imgsz >= 1024, and produced
  misaligned boxes on dense grids — its 0.991 mAP50 reflected its own
  86-image validation split, not real-world pages.
- The manga-trained model (trained on ~18k pages) found correct panel
  geometry across **all** tested styles, including color and Western
  layouts.

The Western model was removed. Content-type auto-detection now only picks
the default reading direction (manga → RTL, western → LTR).

## Inference Configuration

| Parameter | Value | Rationale                                                     |
| --------- | ----- | ------------------------------------------------------------- |
| conf      | 0.25  | Balanced threshold for recall vs precision                    |
| imgsz     | 1024  | Benchmark sweet spot: 640 misses small panels, 1280 regresses |
| verbose   | False | Suppress inference logs                                       |

Post-processing: near-duplicate boxes (IoU >= 0.55) are merged, keeping the
highest-confidence box — the model occasionally emits doubled boxes on
color art, which is out-of-distribution for its training data.

## Testing Requirements

Per DET-01 constraint: Test on >= 20 real pages from different sources before phase complete.

Test categories:

- Western superhero comics (3-5 pages)
- Manga (3-5 pages)
- Independent/webcomics (3-5 pages)
- Newspaper comics (2-3 pages)
- Non-comic images (2-3 photos)

## Known Limitations

1. **Cold start latency**: First detection takes 1-2s due to model loading
2. **Caption strips**: Narrow caption/text bars on Western pages are
   occasionally detected as panels
3. **Dense golden-age layouts**: Very dense grids may drop an occasional
   panel
4. **Non-standard layouts**: Experimental layouts may have lower accuracy
