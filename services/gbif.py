from functools import lru_cache

import requests

GBIF_URL = "https://api.gbif.org/v1/occurrence/search"
RADIUS_KM = 50
FACET_LIMIT = 8
TIMEOUT_S = 5
KINGDOM_PLANTAE = 6
# Repeat visits to the same spot rarely report the exact same GPS float twice;
# rounding to ~1.1km buckets is what makes the cache below actually hit.
COORD_CACHE_PRECISION = 2


def _valid_coords(latitude, longitude) -> bool:
    if latitude is None or longitude is None:
        return False
    try:
        return -90 <= float(latitude) <= 90 and -180 <= float(longitude) <= 180
    except (TypeError, ValueError):
        return False


@lru_cache(maxsize=256)
def _get_local_species_cached(lat_rounded: float, lon_rounded: float) -> tuple[str, ...]:
    params = {
        "geoDistance": f"{lat_rounded},{lon_rounded},{RADIUS_KM}km",
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
            return ()
        counts = facets[0].get("counts") or []
        return tuple(c["name"] for c in counts if c.get("name"))
    except (requests.RequestException, ValueError, KeyError, IndexError, TypeError):
        return ()


def get_local_species(latitude: float = None, longitude: float = None) -> list[str]:
    if not _valid_coords(latitude, longitude):
        return []
    lat_rounded = round(float(latitude), COORD_CACHE_PRECISION)
    lon_rounded = round(float(longitude), COORD_CACHE_PRECISION)
    return list(_get_local_species_cached(lat_rounded, lon_rounded))
