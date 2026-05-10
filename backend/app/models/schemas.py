from typing import Literal

from pydantic import BaseModel


class Dimensions(BaseModel):
    width: int
    height: int


class UploadResponse(BaseModel):
    uuid: str
    dimensions: Dimensions
    url: str


class Panel(BaseModel):
    """Panel detection result per DET-01 schema."""

    id: int
    bbox: tuple[float, float, float, float]  # (x, y, w, h) normalized 0-1
    confidence: float


class DetectionResponse(BaseModel):
    """Response from POST /api/detect/{uuid}."""

    panels: list[Panel]
    content_type: Literal["manga", "western", "unknown"]
