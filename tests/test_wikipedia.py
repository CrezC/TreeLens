import requests

from services import wikipedia


class _FakeResponse:
    def __init__(self, json_data, status_code=200):
        self._json_data = json_data
        self.status_code = status_code

    def json(self):
        return self._json_data


def test_success_returns_thumbnail_and_page(monkeypatch):
    captured = {}

    def fake_get(url, timeout=None, headers=None):
        captured["url"] = url
        captured["timeout"] = timeout
        captured["headers"] = headers
        return _FakeResponse({
            "thumbnail": {"source": "https://example.com/thumb.jpg"},
            "content_urls": {"desktop": {"page": "https://en.wikipedia.org/wiki/Acer_saccharum"}},
        })

    monkeypatch.setattr(requests, "get", fake_get)

    result = wikipedia.get_reference_image("Acer saccharum")

    assert result == {
        "thumbnail_url": "https://example.com/thumb.jpg",
        "page_url": "https://en.wikipedia.org/wiki/Acer_saccharum",
        "attribution": "Wikipedia",
    }
    assert captured["url"] == "https://en.wikipedia.org/api/rest_v1/page/summary/Acer_saccharum"
    assert captured["timeout"] == wikipedia.TIMEOUT_S
    assert "User-Agent" in captured["headers"]


def test_name_with_spaces_is_url_encoded(monkeypatch):
    captured = {}

    def fake_get(url, timeout=None, headers=None):
        captured["url"] = url
        return _FakeResponse({
            "thumbnail": {"source": "https://example.com/thumb.jpg"},
            "content_urls": {"desktop": {"page": "https://en.wikipedia.org/wiki/Quercus_rubra"}},
        })

    monkeypatch.setattr(requests, "get", fake_get)
    wikipedia.get_reference_image("Quercus rubra")

    assert captured["url"].endswith("/Quercus_rubra")


def test_404_returns_none(monkeypatch):
    monkeypatch.setattr(requests, "get", lambda *a, **k: _FakeResponse({}, status_code=404))
    assert wikipedia.get_reference_image("Totally Fake Species") is None


def test_missing_thumbnail_returns_none(monkeypatch):
    monkeypatch.setattr(requests, "get", lambda *a, **k: _FakeResponse({
        "content_urls": {"desktop": {"page": "https://en.wikipedia.org/wiki/Something"}},
    }))
    assert wikipedia.get_reference_image("Something") is None


def test_timeout_returns_none(monkeypatch):
    def fake_get(*args, **kwargs):
        raise requests.exceptions.Timeout()

    monkeypatch.setattr(requests, "get", fake_get)
    assert wikipedia.get_reference_image("Acer saccharum") is None


def test_malformed_json_returns_none(monkeypatch):
    class BadJsonResponse(_FakeResponse):
        def json(self):
            raise ValueError("not json")

    monkeypatch.setattr(requests, "get", lambda *a, **k: BadJsonResponse({}))
    assert wikipedia.get_reference_image("Acer saccharum") is None


def test_empty_name_skips_request_entirely(monkeypatch):
    def fake_get(*args, **kwargs):
        raise AssertionError("requests.get should not be called for an empty name")

    monkeypatch.setattr(requests, "get", fake_get)

    assert wikipedia.get_reference_image("") is None
    assert wikipedia.get_reference_image(None) is None
