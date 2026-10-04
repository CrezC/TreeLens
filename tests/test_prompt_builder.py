import pytest

from services.prompt_builder import build_prompt


def test_empty_labels_raises():
    with pytest.raises(ValueError):
        build_prompt([])


def test_schema_includes_alternatives_with_cap_instruction():
    prompt = build_prompt(["完整树形"])
    assert '"alternatives"' in prompt
    assert "最多2个" in prompt


def test_single_label_no_hints():
    prompt = build_prompt(["完整树形"])
    assert "图片1：完整树形" in prompt
    assert "坐标" not in prompt
    assert "拍摄日期" not in prompt
    assert "曾有记录的树种" not in prompt


def test_multi_label_enumeration():
    prompt = build_prompt(["叶片近照", "树皮纹理", "完整树形"])
    assert "图片1：叶片近照" in prompt
    assert "图片2：树皮纹理" in prompt
    assert "图片3：完整树形" in prompt


def test_location_hint():
    prompt = build_prompt(["照片"], latitude=45.5, longitude=-122.6)
    assert "45.5" in prompt
    assert "-122.6" in prompt


@pytest.mark.parametrize(
    "month,expected_season",
    [
        (1, "冬季"),
        (2, "冬季"),
        (12, "冬季"),
        (3, "春季"),
        (4, "春季"),
        (5, "春季"),
        (6, "夏季"),
        (7, "夏季"),
        (8, "夏季"),
        (9, "秋季"),
        (10, "秋季"),
        (11, "秋季"),
    ],
)
def test_season_hint_by_month(month, expected_season):
    capture_date = f"2026-{month:02d}-15"
    prompt = build_prompt(["照片"], capture_date=capture_date)
    assert expected_season in prompt
    assert capture_date in prompt
    assert "裸枝" in prompt


def test_species_hint_present_and_overridable():
    prompt = build_prompt(["照片"], local_species=["Acer saccharum", "Quercus rubra"])
    assert "Acer saccharum" in prompt
    assert "Quercus rubra" in prompt
    assert "以视觉证据为准" in prompt


def test_all_hints_combined():
    prompt = build_prompt(
        ["叶片近照", "树皮纹理"],
        latitude=45.5,
        longitude=-122.6,
        capture_date="2026-01-10",
        local_species=["Acer saccharum"],
    )
    assert "图片1：叶片近照" in prompt
    assert "图片2：树皮纹理" in prompt
    assert "45.5" in prompt
    assert "冬季" in prompt
    assert "Acer saccharum" in prompt
