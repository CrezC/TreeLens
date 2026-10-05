LABELS = {
    "leaf": "leaf close-up",
    "bark": "bark texture",
    "full": "full tree shape",
}
DEFAULT_LABEL = "photo"


def label_for_filename(filename: str | None) -> str:
    if not filename:
        return DEFAULT_LABEL
    stem = filename.rsplit(".", 1)[0].strip().lower()
    return LABELS.get(stem, DEFAULT_LABEL)
