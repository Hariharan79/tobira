"""
Detection route: POST /api/detect/{uuid}

Detects panels in an uploaded image and returns bounding boxes.
"""

from pathlib import Path

from fastapi import APIRouter, HTTPException, Query

from app.models.schemas import DetectionResponse
from app.routes import upload as upload_module
from app.services.detection import detect_panels

router = APIRouter()


@router.post("/api/detect/{uuid}", response_model=DetectionResponse)
async def detect(
    uuid: str,
    model_hint: str | None = Query(
        default=None,
        description="Optional model hint: 'manga' or 'western' to override auto-detection",
    ),
) -> DetectionResponse:
    """
    Detect panels in an uploaded image.

    Args:
        uuid: Upload UUID from /api/upload
        model_hint: Optional "manga" or "western" to override auto-detection (per D-02)

    Returns:
        DetectionResponse with panels array and content_type
    """
    # Access UPLOAD_DIR dynamically from upload module for test compatibility
    upload_path = upload_module.UPLOAD_DIR / uuid

    if not upload_path.exists():
        raise HTTPException(status_code=404, detail="Upload not found")

    # Find the original image (same pattern as upload.py)
    image_path: Path | None = None
    for ext in [".jpg", ".png", ".webp"]:
        candidate = upload_path / f"original{ext}"
        if candidate.exists():
            image_path = candidate
            break

    if not image_path:
        raise HTTPException(status_code=404, detail="Image file not found")

    # Run detection
    result = detect_panels(image_path, model_hint=model_hint)

    return DetectionResponse(
        panels=result.panels,
        content_type=result.content_type,
    )
