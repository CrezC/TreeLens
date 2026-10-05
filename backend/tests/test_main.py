import io

from fastapi.testclient import TestClient
from PIL import Image

import main


def _jpeg_bytes():
    img = Image.new("RGB", (32, 32), color=(10, 80, 20))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def test_identify_attaches_reference_image_on_success(monkeypatch):
    monkeypatch.setattr(main, "identify_tree", lambda *a, **k: {
        "common_name": "Sugar Maple",
        "scientific_name": "Acer saccharum",
    })
    monkeypatch.setattr(main, "get_reference_image", lambda name: {
        "thumbnail_url": "https://example.com/thumb.jpg",
        "page_url": "https://en.wikipedia.org/wiki/Acer_saccharum",
        "attribution": "Wikipedia",
    })

    client = TestClient(main.app)
    response = client.post("/identify", files={"files": ("leaf.jpg", _jpeg_bytes(), "image/jpeg")})

    assert response.status_code == 200
    data = response.json()
    assert data["reference_image"]["page_url"] == "https://en.wikipedia.org/wiki/Acer_saccharum"


def test_identify_skips_reference_image_on_error_result(monkeypatch):
    monkeypatch.setattr(main, "identify_tree", lambda *a, **k: {"error": "No tree detected"})

    def fail_if_called(name):
        raise AssertionError("get_reference_image should not be called when identification errored")

    monkeypatch.setattr(main, "get_reference_image", fail_if_called)

    client = TestClient(main.app)
    response = client.post("/identify", files={"files": ("leaf.jpg", _jpeg_bytes(), "image/jpeg")})

    assert response.status_code == 200
    assert response.json() == {"error": "No tree detected"}


def test_identify_enriches_each_alternative_with_its_own_reference_image(monkeypatch):
    monkeypatch.setattr(main, "identify_tree", lambda *a, **k: {
        "common_name": "Sugar Maple",
        "scientific_name": "Acer saccharum",
        "alternatives": [
            {"common_name": "Red Maple", "scientific_name": "Acer rubrum", "confidence": 60, "reason": "叶形相近"},
            {"common_name": "Silver Maple", "scientific_name": "Acer saccharinum", "confidence": 40, "reason": "树皮相近"},
        ],
    })
    monkeypatch.setattr(main, "get_reference_image", lambda name: {"thumbnail_url": f"https://example.com/{name}.jpg", "page_url": "x", "attribution": "Wikipedia"})

    client = TestClient(main.app)
    response = client.post("/identify", files={"files": ("leaf.jpg", _jpeg_bytes(), "image/jpeg")})

    data = response.json()
    assert len(data["alternatives"]) == 2
    assert data["alternatives"][0]["reference_image"]["thumbnail_url"] == "https://example.com/Acer rubrum.jpg"
    assert data["alternatives"][1]["reference_image"]["thumbnail_url"] == "https://example.com/Acer saccharinum.jpg"


def test_identify_caps_alternatives_at_max(monkeypatch):
    monkeypatch.setattr(main, "identify_tree", lambda *a, **k: {
        "common_name": "Sugar Maple",
        "scientific_name": "Acer saccharum",
        "alternatives": [
            {"common_name": f"Species {i}", "scientific_name": f"Genus species{i}", "confidence": 50, "reason": "r"}
            for i in range(5)
        ],
    })
    monkeypatch.setattr(main, "get_reference_image", lambda name: None)

    client = TestClient(main.app)
    response = client.post("/identify", files={"files": ("leaf.jpg", _jpeg_bytes(), "image/jpeg")})

    assert len(response.json()["alternatives"]) == main.MAX_ALTERNATIVES


def test_identify_passes_language_through_unchanged(monkeypatch):
    captured = {}

    def fake_identify_tree(images, image_labels, latitude, longitude, capture_date, language):
        captured["language"] = language
        return {"common_name": "x", "scientific_name": "y"}

    monkeypatch.setattr(main, "identify_tree", fake_identify_tree)
    monkeypatch.setattr(main, "get_reference_image", lambda name: None)

    client = TestClient(main.app)
    client.post("/identify", files={"files": ("leaf.jpg", _jpeg_bytes(), "image/jpeg")}, data={"language": "en"})

    assert captured["language"] == "en"


def test_identify_defaults_language_when_omitted(monkeypatch):
    captured = {}

    def fake_identify_tree(images, image_labels, latitude, longitude, capture_date, language):
        captured["language"] = language
        return {"common_name": "x", "scientific_name": "y"}

    monkeypatch.setattr(main, "identify_tree", fake_identify_tree)
    monkeypatch.setattr(main, "get_reference_image", lambda name: None)

    client = TestClient(main.app)
    client.post("/identify", files={"files": ("leaf.jpg", _jpeg_bytes(), "image/jpeg")})

    assert captured["language"] == main.DEFAULT_LANGUAGE


def test_identify_normalizes_unsupported_language(monkeypatch):
    captured = {}

    def fake_identify_tree(images, image_labels, latitude, longitude, capture_date, language):
        captured["language"] = language
        return {"common_name": "x", "scientific_name": "y"}

    monkeypatch.setattr(main, "identify_tree", fake_identify_tree)
    monkeypatch.setattr(main, "get_reference_image", lambda name: None)

    client = TestClient(main.app)
    response = client.post("/identify", files={"files": ("leaf.jpg", _jpeg_bytes(), "image/jpeg")}, data={"language": "fr"})

    assert response.status_code == 200
    assert captured["language"] == main.DEFAULT_LANGUAGE


def test_identify_rejects_more_than_max_photos(monkeypatch):
    monkeypatch.setattr(main, "identify_tree", lambda *a, **k: {"common_name": "x", "scientific_name": "y"})
    monkeypatch.setattr(main, "get_reference_image", lambda name: None)

    client = TestClient(main.app)
    jpeg = _jpeg_bytes()
    files = [("files", (f"photo{i}.jpg", jpeg, "image/jpeg")) for i in range(main.MAX_PHOTOS + 1)]
    response = client.post("/identify", files=files)

    assert response.status_code == 400
