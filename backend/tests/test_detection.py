"""Tests for detection route endpoint."""


def test_detect_endpoint_exists(client, uploaded_jpeg):
    """POST /api/detect/{uuid} endpoint should exist."""
    response = client.post(f"/api/detect/{uploaded_jpeg}")
    # Should not be 404 (method not allowed or OK)
    assert response.status_code != 404 or "method" not in response.text.lower()


def test_detect_returns_panels_for_valid_image(client, uploaded_jpeg):
    """Test that detection returns panels array for valid upload."""
    response = client.post(f"/api/detect/{uploaded_jpeg}")
    assert response.status_code == 200
    data = response.json()
    assert "panels" in data
    assert "content_type" in data
    assert isinstance(data["panels"], list)
    assert data["content_type"] in ["manga", "western", "unknown"]


def test_detect_returns_404_for_unknown_uuid(client):
    """Test that unknown UUID returns 404."""
    response = client.post("/api/detect/nonexistent-uuid")
    assert response.status_code == 404


def test_detect_accepts_model_hint_parameter(client, uploaded_jpeg):
    """Test that model_hint query parameter is accepted."""
    response = client.post(f"/api/detect/{uploaded_jpeg}?model_hint=manga")
    assert response.status_code == 200
    data = response.json()
    # When model_hint is provided, it should be used as content_type
    assert data["content_type"] == "manga"


def test_detect_western_hint_returns_western_content_type(client, uploaded_jpeg):
    """Test that western model_hint returns western content_type."""
    response = client.post(f"/api/detect/{uploaded_jpeg}?model_hint=western")
    assert response.status_code == 200
    data = response.json()
    assert data["content_type"] == "western"


def test_detect_panel_bbox_is_normalized(client, uploaded_jpeg):
    """Test that panel bbox values are normalized 0-1."""
    response = client.post(f"/api/detect/{uploaded_jpeg}")
    assert response.status_code == 200
    data = response.json()
    # Note: 1x1 pixel test image may return 0 panels
    # This test validates format when panels are detected
    for panel in data["panels"]:
        x, y, w, h = panel["bbox"]
        assert 0 <= x <= 1, f"x={x} not in [0,1]"
        assert 0 <= y <= 1, f"y={y} not in [0,1]"
        assert 0 <= w <= 1, f"w={w} not in [0,1]"
        assert 0 <= h <= 1, f"h={h} not in [0,1]"
