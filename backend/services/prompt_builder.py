LANGUAGE_NAMES = {"en": "English", "zh": "Chinese", "es": "Spanish"}
DEFAULT_LANGUAGE = "en"
SUPPORTED_LANGUAGES = frozenset(LANGUAGE_NAMES)


def _season_for_month(month: int) -> str:
    # Northern Hemisphere only — app is scoped to North America.
    if month in (12, 1, 2):
        return "winter"
    if month in (3, 4, 5):
        return "spring"
    if month in (6, 7, 8):
        return "summer"
    return "fall"


def build_prompt(
    image_labels: list[str],
    latitude: float = None,
    longitude: float = None,
    capture_date: str = None,
    local_species: list[str] = None,
    language: str = DEFAULT_LANGUAGE,
) -> str:
    if not image_labels:
        raise ValueError("image_labels must contain at least one label")

    image_section = "\n".join(f"Photo {i + 1}: {label}" for i, label in enumerate(image_labels))

    location_hint = ""
    if latitude is not None and longitude is not None:
        location_hint = f"The photo was taken at North American coordinates ({latitude}, {longitude})."

    season_hint = ""
    if capture_date:
        month = int(capture_date[5:7])
        season_hint = (
            f"The photo was taken on {capture_date} (Northern Hemisphere {_season_for_month(month)}). "
            f"Deciduous trees may be bare in winter — adjust your judgment accordingly rather than "
            f"lowering confidence or misidentifying the species just because it has no leaves."
        )

    species_hint = ""
    if local_species:
        species_list = ", ".join(local_species)
        species_hint = (
            f"Species previously recorded in this area include: {species_list}. This is only a reference "
            f"clue, not the final answer — if the photo's features clearly point to a different species "
            f"(including recently planted ornamental/non-native varieties), go with the visual evidence."
        )

    language_name = LANGUAGE_NAMES.get(language, LANGUAGE_NAMES[DEFAULT_LANGUAGE])
    language_instruction = (
        f"Write common_name, description, identification_basis, conservation_status, "
        f"height_range, lifespan, distribution, toxicity.details, allergen.details, "
        f"medicinal_uses[].use/.detail, ecology[].label/.value, and "
        f"alternatives[].common_name/.reason in {language_name}. "
        f"But scientific_name and family must stay as the original Latin name, and "
        f"conservation_code must stay as the standard IUCN abbreviation (LC/NT/VU/EN/CR/EW/EX) — "
        f"do not translate either of those."
    )

    hints = "\n".join(h for h in (location_hint, season_hint, species_hint, language_instruction) if h)

    return f"""You are a North American tree expert. {hints}

The following photos are provided:
{image_section}

Carefully analyze the tree in the photos and return the following JSON format (return JSON only, no other text):

{{
  "common_name": "common name",
  "scientific_name": "scientific name",
  "family": "family name",
  "confidence": a number 0-100,
  "identification_basis": "what features you used to identify it (leaf shape, bark, crown, etc.)",
  "description": "a brief introduction to this tree (2-3 sentences)",
  "conservation_status": "text description of IUCN conservation status",
  "conservation_code": "LC / VU / EN / CR etc.",
  "height_range": "typical height range (e.g. 20-30m)",
  "lifespan": "lifespan (e.g. 200+)",
  "distribution": ["main distribution region 1", "distribution region 2"],
  "toxicity": {{
    "is_toxic": true or false,
    "details": "toxicity details, if any"
  }},
  "allergen": {{
    "is_allergen": true or false,
    "details": "allergen details, if any"
  }},
  "medicinal_uses": [
    {{"use": "use name", "detail": "detailed explanation"}}
  ],
  "ecology": [
    {{"label": "category name (e.g. wildlife value/soil type/sun preference)", "value": "description"}}
  ],
  "alternatives": [
    {{"common_name": "...", "scientific_name": "...", "confidence": a number 0-100, "reason": "why this is also a possible candidate"}}
  ]
}}

If there is no tree in the photo, return {{"error": "No tree detected"}}
If you can't identify the specific species, set confidence below 50 and explain why.
If your confidence is below 80, or the species is easily confused with other similar species, list up to 2 runner-up candidates with reasons in alternatives;
if you're very confident, return an empty array [] for alternatives."""
