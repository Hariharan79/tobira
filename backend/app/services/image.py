from pathlib import Path

from PIL import Image


def extract_dimensions(file_path: Path) -> tuple[int, int]:
    """Extract width and height from an image file using PIL."""
    with Image.open(file_path) as img:
        return img.size
