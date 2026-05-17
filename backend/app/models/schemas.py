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
    direction: Literal["ltr", "rtl"]  # Reading direction applied per ORD-01
    ambiguous: bool = False  # True if layout is ambiguous per D-12


# --- Chapter (multi-page) schemas — CHP-01, Plan 05-03 (D-03 separate path) ---


class ChapterUploadResponse(BaseModel):
    """Response from POST /api/chapter."""

    comic_uuid: str
    page_count: int


class PageStatus(BaseModel):
    """Per-page detection status (in-process, ephemeral — D-10)."""

    page: int
    status: Literal["queued", "detecting", "done", "error"]
    panels: list[Panel] | None = None


class ChapterPage(BaseModel):
    """One page entry in the Comic manifest (natural-sort ordered)."""

    index: int
    filename: str
    width: int
    height: int
    panels: list[Panel] = []


class ChapterManifest(BaseModel):
    """Comic schema persisted at uploads/<comic_uuid>/manifest.json (CHP-01)."""

    comic_uuid: str
    page_count: int
    pages: list[ChapterPage]
