import pytest

from services import gbif, wikipedia


@pytest.fixture(autouse=True)
def _clear_caches():
    gbif._get_local_species_cached.cache_clear()
    wikipedia.get_reference_image.cache_clear()
    yield
