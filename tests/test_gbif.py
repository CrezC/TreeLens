import requests

from services import gbif


class _FakeResponse:
    def __init__(self, json_data, status_code=200):
        self._json_data = json_data
        self.status_code = status_code

    def raise_for_status(self):
        if self.status_code >= 400:
            raise requests.HTTPError(f"status {self.status_code}")

    def json(self):
        return self._json_data


def test_success_returns_ordered_species_names(monkeypatch):
    captured = {}

    def fake_get(url, params=None, timeout=None):
        captured["url"] = url
        captured["params"] = params
        captured["timeout"] = timeout
        return _FakeResponse({
            "facets": [{
                "counts": [
                    {"name": "Acer saccharum", "count": 50},
                    {"name": "Quercus rubra", "count": 30},
                ]
            }]
        })

    monkeypatch.setattr(requests, "get", fake_get)

    result = gbif.get_local_species(45.5, -122.6)

    assert result == ["Acer saccharum", "Quercus rubra"]
    assert captured["url"] == gbif.GBIF_URL
    assert captured["params"]["geoDistance"] == "45.5,-122.6,50km"
    assert captured["params"]["kingdomKey"] == gbif.KINGDOM_PLANTAE
    assert captured["params"]["limit"] == 0
    assert captured["timeout"] == gbif.TIMEOUT_S


def test_timeout_returns_empty_list(monkeypatch):
    def fake_get(*args, **kwargs):
        raise requests.exceptions.Timeout()

    monkeypatch.setattr(requests, "get", fake_get)
    assert gbif.get_local_species(45.5, -122.6) == []


def test_connection_error_returns_empty_list(monkeypatch):
    def fake_get(*args, **kwargs):
        raise requests.exceptions.ConnectionError()

    monkeypatch.setattr(requests, "get", fake_get)
    assert gbif.get_local_species(45.5, -122.6) == []


def test_non_2xx_returns_empty_list(monkeypatch):
    monkeypatch.setattr(requests, "get", lambda *a, **k: _FakeResponse({}, status_code=500))
    assert gbif.get_local_species(45.5, -122.6) == []


def test_malformed_json_returns_empty_list(monkeypatch):
    class BadJsonResponse(_FakeResponse):
        def json(self):
            raise ValueError("not json")

    monkeypatch.setattr(requests, "get", lambda *a, **k: BadJsonResponse({}))
    assert gbif.get_local_species(45.5, -122.6) == []


def test_missing_facets_returns_empty_list(monkeypatch):
    monkeypatch.setattr(requests, "get", lambda *a, **k: _FakeResponse({"facets": []}))
    assert gbif.get_local_species(45.5, -122.6) == []


def test_repeated_nearby_coords_hit_cache(monkeypatch):
    call_count = {"n": 0}

    def fake_get(url, params=None, timeout=None):
        call_count["n"] += 1
        return _FakeResponse({
            "facets": [{"counts": [{"name": "Acer saccharum", "count": 50}]}]
        })

    monkeypatch.setattr(requests, "get", fake_get)

    first = gbif.get_local_species(45.501, -122.602)
    second = gbif.get_local_species(45.50, -122.60)  # rounds to the same cache key

    assert first == second == ["Acer saccharum"]
    assert call_count["n"] == 1


def test_different_coords_do_not_share_cache(monkeypatch):
    seen_params = []

    def fake_get(url, params=None, timeout=None):
        seen_params.append(params["geoDistance"])
        return _FakeResponse({"facets": [{"counts": [{"name": "Acer saccharum", "count": 1}]}]})

    monkeypatch.setattr(requests, "get", fake_get)

    gbif.get_local_species(45.5, -122.6)
    gbif.get_local_species(40.7, -74.0)

    assert len(seen_params) == 2


def test_invalid_coords_skip_request_entirely(monkeypatch):
    def fake_get(*args, **kwargs):
        raise AssertionError("requests.get should not be called for invalid coords")

    monkeypatch.setattr(requests, "get", fake_get)

    assert gbif.get_local_species(None, None) == []
    assert gbif.get_local_species(200, -122.6) == []
    assert gbif.get_local_species(45.5, -200) == []
