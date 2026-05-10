"""Tests for detection service (auto-detect heuristic and panel detection)."""

import tempfile
from pathlib import Path

import pytest
from PIL import Image

from app.services.detection import detect_content_type, detect_panels


class TestDetectContentType:
    """Tests for content type auto-detection heuristic."""

    @pytest.fixture
    def grayscale_image(self) -> Path:
        """Create a temporary grayscale image (manga-like)."""
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
            # Create a 100x150 grayscale image (tall, grayscale = manga indicators)
            img = Image.new("RGB", (100, 150), color=(128, 128, 128))
            img.save(f.name)
            yield Path(f.name)

    @pytest.fixture
    def color_image(self) -> Path:
        """Create a temporary color image (Western-like)."""
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
            # Create a 100x100 colorful image
            img = Image.new("RGB", (100, 100), color=(255, 50, 50))
            img.save(f.name)
            yield Path(f.name)

    def test_grayscale_image_detected_as_manga(self, grayscale_image: Path):
        """Grayscale images should be detected as manga."""
        result = detect_content_type(grayscale_image)
        assert result == "manga"

    def test_colorful_image_detected_as_western(self, color_image: Path):
        """Colorful images should be detected as Western."""
        result = detect_content_type(color_image)
        assert result == "western"


class TestDetectPanels:
    """Tests for panel detection function."""

    @pytest.fixture
    def sample_image(self) -> Path:
        """Create a sample image for detection testing."""
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
            # Create a simple image (detection results depend on model)
            img = Image.new("RGB", (640, 480), color=(200, 200, 200))
            img.save(f.name)
            yield Path(f.name)

    def test_detect_panels_returns_detection_result(self, sample_image: Path):
        """detect_panels should return a DetectionResult with panels and content_type."""
        result = detect_panels(sample_image)
        assert hasattr(result, "panels")
        assert hasattr(result, "content_type")
        assert isinstance(result.panels, list)
        assert result.content_type in ("manga", "western", "unknown")

    def test_detect_panels_with_manga_hint(self, sample_image: Path):
        """model_hint='manga' should force manga content_type."""
        result = detect_panels(sample_image, model_hint="manga")
        assert result.content_type == "manga"

    def test_detect_panels_with_western_hint(self, sample_image: Path):
        """model_hint='western' should force western content_type."""
        result = detect_panels(sample_image, model_hint="western")
        assert result.content_type == "western"

    def test_panels_have_required_fields(self, sample_image: Path):
        """Each panel should have id, bbox, and confidence."""
        result = detect_panels(sample_image)
        # Note: Simple test images may return 0 panels
        for panel in result.panels:
            assert isinstance(panel.id, int)
            assert len(panel.bbox) == 4
            assert all(isinstance(v, float) for v in panel.bbox)
            assert isinstance(panel.confidence, float)

    def test_panels_bbox_are_normalized(self, sample_image: Path):
        """Panel bbox values should be normalized 0-1."""
        result = detect_panels(sample_image)
        for panel in result.panels:
            x, y, w, h = panel.bbox
            assert 0 <= x <= 1, f"x={x} not in [0,1]"
            assert 0 <= y <= 1, f"y={y} not in [0,1]"
            assert 0 <= w <= 1, f"w={w} not in [0,1]"
            assert 0 <= h <= 1, f"h={h} not in [0,1]"

    def test_panels_sorted_by_confidence(self, sample_image: Path):
        """Panels should be sorted by confidence descending."""
        result = detect_panels(sample_image)
        if len(result.panels) > 1:
            confidences = [p.confidence for p in result.panels]
            assert confidences == sorted(confidences, reverse=True)
