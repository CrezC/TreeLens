import urllib.parse

import requests

SUMMARY_URL = "https://en.wikipedia.org/api/rest_v1/page/summary/{title}"
TIMEOUT_S = 5
# Wikimedia's API rejects requests without a descriptive User-Agent (403):
# https://meta.wikimedia.org/wiki/User-Agent_policy
HEADERS = {"User-Agent": "TreeLens/1.0 (tree identification app; reference-image lookup)"}


def get_reference_image(scientific_name: str) -> dict | None:
    if not scientific_name:
        return None

    title = urllib.parse.quote(scientific_name.strip().replace(" ", "_"))
    try:
        resp = requests.get(SUMMARY_URL.format(title=title), timeout=TIMEOUT_S, headers=HEADERS)
        if resp.status_code != 200:
            return None
        data = resp.json()
        thumbnail = data.get("thumbnail") or {}
        thumbnail_url = thumbnail.get("source")
        page_url = (data.get("content_urls") or {}).get("desktop", {}).get("page")
        if not thumbnail_url or not page_url:
            return None
        return {
            "thumbnail_url": thumbnail_url,
            "page_url": page_url,
            "attribution": "Wikipedia",
        }
    except (requests.RequestException, ValueError, KeyError, TypeError):
        return None
