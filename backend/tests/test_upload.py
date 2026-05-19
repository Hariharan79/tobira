import io


def test_upload_jpeg_returns_uuid_and_dimensions(client, sample_jpeg):
    """Test that uploading a JPEG returns uuid, dimensions, and url."""
    response = client.post(
        "/api/upload", files={"file": ("test.jpg", io.BytesIO(sample_jpeg), "image/jpeg")}
    )
    assert response.status_code == 200
    data = response.json()
    assert "uuid" in data
    assert "dimensions" in data
    assert "url" in data
    assert data["dimensions"]["width"] == 1
    assert data["dimensions"]["height"] == 1
    assert data["url"] == f"/api/uploads/{data['uuid']}"


def test_upload_png_returns_uuid_and_dimensions(client, sample_png):
    """Test that uploading a PNG returns uuid, dimensions, and url."""
    response = client.post(
        "/api/upload", files={"file": ("test.png", io.BytesIO(sample_png), "image/png")}
    )
    assert response.status_code == 200
    data = response.json()
    assert "uuid" in data
    assert data["dimensions"]["width"] == 1
    assert data["dimensions"]["height"] == 1


def test_upload_rejects_non_image_with_400(client):
    """Test that non-image files are rejected with 400 status."""
    response = client.post(
        "/api/upload", files={"file": ("test.txt", io.BytesIO(b"hello world"), "text/plain")}
    )
    assert response.status_code == 400


def test_upload_rejects_pdf_with_400(client):
    """Test that PDF files are rejected with 400 status (deferred to Phase 5)."""
    response = client.post(
        "/api/upload", files={"file": ("test.pdf", io.BytesIO(b"%PDF-1.4"), "application/pdf")}
    )
    assert response.status_code == 400


def test_get_upload_returns_image(client, sample_jpeg):
    """Test that GET /api/uploads/<uuid> returns the uploaded image."""
    # First upload
    upload_response = client.post(
        "/api/upload", files={"file": ("test.jpg", io.BytesIO(sample_jpeg), "image/jpeg")}
    )
    uuid = upload_response.json()["uuid"]

    # Then retrieve
    get_response = client.get(f"/api/uploads/{uuid}")
    assert get_response.status_code == 200
    assert get_response.headers["content-type"] == "image/jpeg"


def test_get_upload_returns_404_for_unknown_uuid(client):
    """Test that GET /api/uploads/<uuid> returns 404 for unknown UUID."""
    response = client.get("/api/uploads/nonexistent-uuid")
    assert response.status_code == 404


def test_upload_exists_probe_is_always_200(client):
    """The /exists probe must NEVER 404 — Safari/WebKit logs any 404 to the
    browser console (D-15). Unknown uuid → 200 {"exists": false}."""
    response = client.get("/api/uploads/nonexistent-uuid/exists")
    assert response.status_code == 200
    assert response.json() == {"exists": False}
