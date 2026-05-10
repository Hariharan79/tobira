"""Tests for Panel and DetectionResponse schemas."""

import pytest
from pydantic import ValidationError

from app.models.schemas import DetectionResponse, Panel


class TestPanelSchema:
    """Tests for Panel schema."""

    def test_panel_with_valid_data(self):
        """Panel accepts valid id, bbox, and confidence."""
        panel = Panel(id=1, bbox=(0.1, 0.2, 0.3, 0.4), confidence=0.95)
        assert panel.id == 1
        assert panel.bbox == (0.1, 0.2, 0.3, 0.4)
        assert panel.confidence == 0.95

    def test_panel_bbox_is_four_floats(self):
        """Panel bbox must be a tuple of 4 floats."""
        panel = Panel(id=1, bbox=(0.0, 0.0, 1.0, 1.0), confidence=0.5)
        assert len(panel.bbox) == 4
        assert all(isinstance(v, float) for v in panel.bbox)

    def test_panel_model_dump(self):
        """Panel can be serialized to dict."""
        panel = Panel(id=2, bbox=(0.25, 0.5, 0.25, 0.25), confidence=0.88)
        data = panel.model_dump()
        assert data["id"] == 2
        assert data["bbox"] == (0.25, 0.5, 0.25, 0.25)
        assert data["confidence"] == 0.88


class TestDetectionResponseSchema:
    """Tests for DetectionResponse schema."""

    def test_detection_response_with_panels(self):
        """DetectionResponse accepts panels list, content_type, and direction."""
        panels = [
            Panel(id=1, bbox=(0.1, 0.1, 0.4, 0.4), confidence=0.9),
            Panel(id=2, bbox=(0.5, 0.1, 0.4, 0.4), confidence=0.85),
        ]
        response = DetectionResponse(panels=panels, content_type="manga", direction="rtl")
        assert len(response.panels) == 2
        assert response.content_type == "manga"
        assert response.direction == "rtl"
        assert response.ambiguous is False  # default value

    def test_detection_response_empty_panels(self):
        """DetectionResponse accepts empty panels list."""
        response = DetectionResponse(panels=[], content_type="western", direction="ltr")
        assert response.panels == []
        assert response.content_type == "western"
        assert response.direction == "ltr"

    def test_detection_response_content_type_literal(self):
        """DetectionResponse content_type must be manga, western, or unknown."""
        # Valid values
        DetectionResponse(panels=[], content_type="manga", direction="rtl")
        DetectionResponse(panels=[], content_type="western", direction="ltr")
        DetectionResponse(panels=[], content_type="unknown", direction="ltr")

        # Invalid value should raise ValidationError
        with pytest.raises(ValidationError):
            DetectionResponse(panels=[], content_type="invalid", direction="ltr")

    def test_detection_response_direction_literal(self):
        """DetectionResponse direction must be ltr or rtl."""
        # Valid values
        DetectionResponse(panels=[], content_type="manga", direction="ltr")
        DetectionResponse(panels=[], content_type="manga", direction="rtl")

        # Invalid value should raise ValidationError
        with pytest.raises(ValidationError):
            DetectionResponse(panels=[], content_type="manga", direction="invalid")

    def test_detection_response_ambiguous_field(self):
        """DetectionResponse includes ambiguous boolean field."""
        response = DetectionResponse(
            panels=[], content_type="manga", direction="rtl", ambiguous=True
        )
        assert response.ambiguous is True
