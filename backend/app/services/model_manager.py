"""
ModelManager: Singleton that manages YOLO model instances.

Lazy-loads models on first request to avoid blocking startup.
Models are downloaded from HuggingFace and cached in backend/models/.
"""

from pathlib import Path

from huggingface_hub import hf_hub_download
from ultralytics import YOLO


class ModelManager:
    """Singleton that manages YOLO model instances."""

    _manga_model: YOLO | None = None
    _western_model: YOLO | None = None
    _models_dir = Path("models")

    @classmethod
    def get_manga_model(cls) -> YOLO:
        """
        Get the manga panel detector model (lazy-loaded).

        Uses leoxs22/manga-panel-detector-yolo26n from HuggingFace.
        mAP50: 0.956, 2.7MB INT8 model, Apache 2.0 license.
        """
        if cls._manga_model is None:
            model_path = cls._models_dir / "manga_panel_detector_fp32.pt"
            if not model_path.exists():
                cls._download_manga_model()
            cls._manga_model = YOLO(str(model_path))
        return cls._manga_model

    @classmethod
    def get_western_model(cls) -> YOLO:
        """
        Get the Western comic panel detector model (lazy-loaded).

        Uses mosesb/best-comic-panel-detection from HuggingFace.
        mAP50: 0.991, YOLOv12x, Apache 2.0 license.
        """
        if cls._western_model is None:
            model_path = cls._models_dir / "best.pt"
            if not model_path.exists():
                cls._download_western_model()
            cls._western_model = YOLO(str(model_path))
        return cls._western_model

    @classmethod
    def _download_manga_model(cls) -> None:
        """Download manga model from HuggingFace."""
        cls._models_dir.mkdir(exist_ok=True)
        hf_hub_download(
            repo_id="leoxs22/manga-panel-detector-yolo26n",
            filename="manga_panel_detector_fp32.pt",
            local_dir=cls._models_dir,
        )

    @classmethod
    def _download_western_model(cls) -> None:
        """Download Western comic model from HuggingFace."""
        cls._models_dir.mkdir(exist_ok=True)
        hf_hub_download(
            repo_id="mosesb/best-comic-panel-detection",
            filename="best.pt",
            local_dir=cls._models_dir,
            local_dir_use_symlinks=False,
        )
