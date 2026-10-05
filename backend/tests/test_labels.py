from services.labels import label_for_filename, DEFAULT_LABEL


def test_known_stems():
    assert label_for_filename("leaf.jpg") == "叶片近照"
    assert label_for_filename("bark.jpg") == "树皮纹理"
    assert label_for_filename("full.jpg") == "完整树形"


def test_case_insensitive():
    assert label_for_filename("BARK.PNG") == "树皮纹理"
    assert label_for_filename("Leaf.JPEG") == "叶片近照"


def test_unknown_stem_falls_back_to_default():
    assert label_for_filename("photo123.jpg") == DEFAULT_LABEL


def test_missing_filename_falls_back_to_default():
    assert label_for_filename(None) == DEFAULT_LABEL
    assert label_for_filename("") == DEFAULT_LABEL
