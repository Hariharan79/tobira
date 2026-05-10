# Panel Detection Models

This document describes the pretrained models used for comic panel detection.

## Model Selection Strategy

Tobira uses a dual-model approach (per D-01) to handle both manga and Western comic styles:

1. **Manga content**: manga-panel-detector-yolo26n
2. **Western comics**: best-comic-panel-detection (YOLOv12x)

Content type is auto-detected based on image characteristics (per D-02):

- Grayscale images are classified as manga
- Tall aspect ratio (>1.3) with low color saturation suggests manga
- Otherwise, classified as Western

Users can override auto-detection via the `model_hint` parameter.

## Manga Model

**Repository:** [leoxs22/manga-panel-detector-yolo26n](https://huggingface.co/leoxs22/manga-panel-detector-yolo26n)

| Property     | Value                        |
| ------------ | ---------------------------- |
| Architecture | YOLO26n                      |
| Parameters   | 2.57M                        |
| mAP50        | 0.956                        |
| File         | manga_panel_detector_fp32.pt |
| Size         | ~15MB                        |
| License      | Apache 2.0                   |

**Classes:**

- 0: panel
- 1: text (filtered in detection)

## Western Comic Model

**Repository:** [mosesb/best-comic-panel-detection](https://huggingface.co/mosesb/best-comic-panel-detection)

| Property     | Value      |
| ------------ | ---------- |
| Architecture | YOLOv12x   |
| mAP50        | 0.991      |
| File         | best.pt    |
| Size         | ~100MB     |
| License      | Apache 2.0 |

**Classes:**

- 0: panel

## Inference Configuration

| Parameter | Value | Rationale                                  |
| --------- | ----- | ------------------------------------------ |
| conf      | 0.25  | Balanced threshold for recall vs precision |
| imgsz     | 640   | Standard YOLO input size                   |
| verbose   | False | Suppress inference logs                    |

## Testing Requirements

Per DET-01 constraint: Test on >= 20 real pages from different sources before phase complete.

Test categories:

- Western superhero comics (3-5 pages)
- Manga (3-5 pages)
- Independent/webcomics (3-5 pages)
- Newspaper comics (2-3 pages)
- Non-comic images (2-3 photos)

## Known Limitations

1. **Cold start latency**: First detection takes 3-5s due to model loading
2. **Memory usage**: ~1-2GB RAM with both models loaded
3. **Edge cases**: Grayscale Western comics (e.g., Sin City) may be misclassified as manga
4. **Non-standard layouts**: Experimental layouts may have lower accuracy
