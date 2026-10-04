import requests

GBIF_URL = "https://api.gbif.org/v1/occurrence/search"
RADIUS_KM = 50
FACET_LIMIT = 8
TIMEOUT_S = 5
KINGDOM_PLANTAE = 6


def _valid_coords(latitude, longitude) -> bool:
    if latitude is None or longitude is None:
        return False
    try:
        return -90 <= float(latitude) <= 90 and -180 <= float(longitude) <= 180
    except (TypeError, ValueError):
        return False


def get_local_species(latitude: float = None, longitude: float = None) -> list[str]:
    if not _valid_coords(latitude, longitude):
        return []

    params = {
        "geoDistance": f"{latitude},{longitude},{RADIUS_KM}km",
        "kingdomKey": KINGDOM_PLANTAE,
        "facet": "scientificName",
        "facetLimit": FACET_LIMIT,
        "limit": 0,
    }
    try:
        resp = requests.get(GBIF_URL, params=params, timeout=TIMEOUT_S)
        resp.raise_for_status()
        data = resp.json()
        facets = data.get("facets") or []
        if not facets:
            return []
        counts = facets[0].get("counts") or []
        return [c["name"] for c in counts if c.get("name")]
    except (requests.RequestException, ValueError, KeyError, IndexError, TypeError):
        return []
