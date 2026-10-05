import pytest

from services.prompt_builder import build_prompt, DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, LANGUAGE_NAMES


def test_empty_labels_raises():
    with pytest.raises(ValueError):
        build_prompt([])


def test_schema_includes_alternatives_with_cap_instruction():
    prompt = build_prompt(["full tree shape"])
    assert '"alternatives"' in prompt
    assert "up to 2" in prompt


def test_single_label_no_hints():
    prompt = build_prompt(["full tree shape"])
    assert "Photo 1: full tree shape" in prompt
    assert "coordinates" not in prompt
    assert "taken on" not in prompt
    assert "previously recorded" not in prompt


def test_multi_label_enumeration():
    prompt = build_prompt(["leaf close-up", "bark texture", "full tree shape"])
    assert "Photo 1: leaf close-up" in prompt
    assert "Photo 2: bark texture" in prompt
    assert "Photo 3: full tree shape" in prompt


def test_location_hint():
    prompt = build_prompt(["photo"], latitude=45.5, longitude=-122.6)
    assert "45.5" in prompt
    assert "-122.6" in prompt


@pytest.mark.parametrize(
    "month,expected_season",
    [
        (1, "winter"),
        (2, "winter"),
        (12, "winter"),
        (3, "spring"),
        (4, "spring"),
        (5, "spring"),
        (6, "summer"),
        (7, "summer"),
        (8, "summer"),
        (9, "fall"),
        (10, "fall"),
        (11, "fall"),
    ],
)
def test_season_hint_by_month(month, expected_season):
    capture_date = f"2026-{month:02d}-15"
    prompt = build_prompt(["photo"], capture_date=capture_date)
    assert expected_season in prompt
    assert capture_date in prompt
    assert "bare in winter" in prompt


def test_species_hint_present_and_overridable():
    prompt = build_prompt(["photo"], local_species=["Acer saccharum", "Quercus rubra"])
    assert "Acer saccharum" in prompt
    assert "Quercus rubra" in prompt
    assert "visual evidence" in prompt


@pytest.mark.parametrize("language", sorted(SUPPORTED_LANGUAGES))
def test_language_directive_names_the_target_language(language):
    prompt = build_prompt(["photo"], language=language)
    assert LANGUAGE_NAMES[language] in prompt
    assert "scientific_name" in prompt
    assert "conservation_code" in prompt
    assert "do not translate" in prompt


def test_default_language_used_when_omitted():
    prompt = build_prompt(["photo"])
    assert LANGUAGE_NAMES[DEFAULT_LANGUAGE] in prompt


def test_unsupported_language_falls_back_to_default():
    prompt = build_prompt(["photo"], language="fr")
    assert LANGUAGE_NAMES[DEFAULT_LANGUAGE] in prompt


def test_schema_examples_do_not_leak_biasing_sample_values():
    prompt = build_prompt(["photo"], language="zh")
    assert "Wildlife Value" not in prompt
    assert "Least Concern" not in prompt
    assert "200+ years" not in prompt
    assert "common English name" not in prompt


def test_all_hints_combined():
    prompt = build_prompt(
        ["leaf close-up", "bark texture"],
        latitude=45.5,
        longitude=-122.6,
        capture_date="2026-01-10",
        local_species=["Acer saccharum"],
    )
    assert "Photo 1: leaf close-up" in prompt
    assert "Photo 2: bark texture" in prompt
    assert "45.5" in prompt
    assert "winter" in prompt
    assert "Acer saccharum" in prompt
