LABELS = {
    "leaf": "叶片近照",
    "bark": "树皮纹理",
    "full": "完整树形",
}
DEFAULT_LABEL = "照片"


def label_for_filename(filename: str | None) -> str:
    if not filename:
        return DEFAULT_LABEL
    stem = filename.rsplit(".", 1)[0].strip().lower()
    return LABELS.get(stem, DEFAULT_LABEL)
