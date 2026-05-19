import shutil
import uuid
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse

from app.models.schemas import Dimensions, UploadResponse
from app.services.image import extract_dimensions

router = APIRouter()

UPLOAD_DIR = Path("uploads")
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}
EXTENSION_MAP = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


@router.post("/api/upload", response_model=UploadResponse)
async def upload_file(file: UploadFile = File(...)):
    """
    Upload an image file.

    Returns the UUID, dimensions, and URL for the uploaded image.
    Accepts JPEG, PNG, and WebP formats only.
    """
    # Validate content type
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type: {file.content_type}. Allowed: JPEG, PNG, WebP",
        )

    # Generate UUID and create directory
    file_uuid = str(uuid.uuid4())
    upload_path = UPLOAD_DIR / file_uuid
    upload_path.mkdir(parents=True, exist_ok=True)

    # Determine extension from content type
    ext = EXTENSION_MAP[file.content_type]
    file_path = upload_path / f"original{ext}"

    # Save file using streaming copy
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Extract dimensions
    width, height = extract_dimensions(file_path)

    return UploadResponse(
        uuid=file_uuid,
        dimensions=Dimensions(width=width, height=height),
        url=f"/api/uploads/{file_uuid}",
    )


@router.get("/api/uploads/{file_uuid}")
async def get_upload(file_uuid: str):
    """
    Retrieve an uploaded image by UUID.

    Returns the image file with appropriate content type.
    """
    upload_path = UPLOAD_DIR / file_uuid

    if not upload_path.exists():
        raise HTTPException(status_code=404, detail="Upload not found")

    # Find the original file
    for ext, media_type in [
        (".jpg", "image/jpeg"),
        (".png", "image/png"),
        (".webp", "image/webp"),
    ]:
        file_path = upload_path / f"original{ext}"
        if file_path.exists():
            return FileResponse(
                file_path,
                media_type=media_type,
                content_disposition_type="inline",
            )

    raise HTTPException(status_code=404, detail="File not found")


@router.get("/api/uploads/{file_uuid}/exists")
async def upload_exists(file_uuid: str) -> dict:
    """
    Console-quiet existence probe — ALWAYS returns 200 {"exists": bool}.

    A 404 (even via the Fetch API) is logged to the browser console by
    Safari/WebKit. The client validates a restored localStorage upload ref
    against this before issuing any image/detect request, so a wiped
    backend (ephemeral FS, D-10) degrades with ZERO console errors (D-15).
    """
    upload_path = UPLOAD_DIR / file_uuid
    exists = upload_path.exists() and any(
        (upload_path / f"original{ext}").exists()
        for ext in (".jpg", ".png", ".webp")
    )
    return {"exists": exists}
