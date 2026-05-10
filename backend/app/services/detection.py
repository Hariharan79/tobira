"""
Detection service: Panel detection using YOLO models.

Implements auto-detection heuristic for manga vs Western comics
and provides normalized bounding box coordinates.
Integrates reading order inference per ORD-01.
"""

from pathlib import Path
from typing import Literal

from PIL import Image, ImageStat

from app.models.schemas import DetectionResponse, Panel
from app.services.model_manager import ModelManager
from app.services.reading_order import detect_ambiguity, infer_order


def detect_content_type(image_path: Path) -> str:
    """
    Heuristic to detect manga vs Western comic (per D-02).

    Strategy:
    1. Check if image is grayscale (high indicator for manga)
    2. Check aspect ratio (manga pages often taller)
    3. Default to Western if unclear

    Returns: "manga" or "western"
    """
    with Image.open(image_path) as img:
        # Convert to RGB if needed for consistent analysis
        if img.mode != "RGB":
            img = img.convert("RGB")

        # Check grayscale by comparing color channel variance
        stat = ImageStat.Stat(img)
        r_mean, g_mean, b_mean = stat.mean[:3]

        # If all channels have similar means, likely grayscale
        channel_variance = max(r_mean, g_mean, b_mean) - min(r_mean, g_mean, b_mean)

        # Grayscale threshold: channels within 10 of each other
        is_grayscale = channel_variance < 10

        # Check aspect ratio
        aspect_ratio = img.height / img.width
        is_tall = aspect_ratio > 1.3  # Manga pages often 4:3 or taller

        # Decision logic (per Claude's discretion in D-02)
        if is_grayscale:
            return "manga"  # Strong indicator
        elif is_tall and channel_variance < 30:
            return "manga"  # Tall + low saturation suggests manga
        else:
            return "western"


def detect_panels(
    image_path: Path,
    model_hint: str | None = None,
    direction: Literal["ltr", "rtl"] | None = None,
) -> DetectionResponse:
    """
    Detect panels in a comic page with reading order inference.

    Args:
        image_path: Path to the image file
        model_hint: Optional hint ("manga" or "western") to override auto-detection
        direction: Reading direction ("ltr" or "rtl"). Auto-detected from content_type if None.

    Returns:
        DetectionResponse with panels in reading order, content type, direction, and ambiguity flag
    """
    # Auto-detect content type if no hint provided (per D-02)
    content_type = model_hint if model_hint in ("manga", "western") else detect_content_type(image_path)

    # Select model based on content type (per D-01)
    if content_type == "manga":
        model = ModelManager.get_manga_model()
    else:
        model = ModelManager.get_western_model()

    # Run inference with confidence threshold 0.25 (Claude's discretion)
    results = model.predict(
        source=str(image_path),
        conf=0.25,
        imgsz=640,
        verbose=False,
    )

    # Extract panels from results
    panels: list[Panel] = []
    if results and len(results) > 0:
        result = results[0]
        img_h, img_w = result.orig_shape

        for box in result.boxes:
            # Get class - filter to panel class only (class 0)
            cls = int(box.cls)
            # Note: manga model has class 0=panel, class 1=text
            # Western model may have different classes - accept class 0
            if cls != 0:
                continue

            # Convert xyxy to normalized xywh
            x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
            x = float(x1 / img_w)
            y = float(y1 / img_h)
            w = float((x2 - x1) / img_w)
            h = float((y2 - y1) / img_h)

            panels.append(
                Panel(
                    id=len(panels) + 1,
                    bbox=(x, y, w, h),
                    confidence=float(box.conf),
                )
            )

    # Determine effective direction: use provided or auto-detect from content_type per D-01
    effective_direction: Literal["ltr", "rtl"] = direction if direction else (
        "rtl" if content_type == "manga" else "ltr"
    )

    # Apply reading order per ORD-01 (replaces confidence-based sorting)
    ordered_panels = infer_order(panels, effective_direction)

    # Detect ambiguous layouts per D-12
    is_ambiguous = detect_ambiguity(panels)

    return DetectionResponse(
        panels=ordered_panels,
        content_type=content_type,
        direction=effective_direction,
        ambiguous=is_ambiguous,
    )
