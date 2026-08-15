"""
ModelManager: Singleton that manages the YOLO panel-detection model.

Lazy-loads the model on first request to avoid blocking startup.
The model is downloaded from HuggingFace and cached in backend/models/.

A single manga-trained detector serves all content types: 2026-07
benchmarking on Pepper&Carrot (color/euro) and golden-age Western pages
showed it generalizes across styles, while the previous Western-specific
YOLOv12x (trained on 86 images) missed obvious panels and collapsed at
imgsz >= 1024. Trained on Manga109-s (used under its license conditions;
see MODEL.md attribution).
"""

from pathlib import Path

from huggingface_hub import hf_hub_download
from ultralytics import YOLO


class ModelManager:
    """Singleton that manages the YOLO panel model instance."""

    _panel_model: YOLO | None = None
    _models_dir = Path("models")

    @classmethod
    def get_panel_model(cls) -> YOLO:
        """
        Get the universal panel detector model (lazy-loaded).

        Uses leoxs22/manga-panel-detector-yolo26n from HuggingFace.
        mAP50: 0.956, ~15MB FP32 model, Apache 2.0 license,
        trained on Manga109-s.
        """
        if cls._panel_model is None:
            model_path = cls._models_dir / "manga_panel_detector_fp32.pt"
            if not model_path.exists():
                cls._download_panel_model()
            cls._panel_model = YOLO(str(model_path))
        return cls._panel_model

    @classmethod
    def _download_panel_model(cls) -> None:
        """Download the panel model from HuggingFace."""
        cls._models_dir.mkdir(exist_ok=True)
        hf_hub_download(
            repo_id="leoxs22/manga-panel-detector-yolo26n",
            filename="manga_panel_detector_fp32.pt",
            local_dir=cls._models_dir,
        )
