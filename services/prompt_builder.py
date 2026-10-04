def _season_for_month(month: int) -> str:
    # Northern Hemisphere only — app is scoped to North America.
    if month in (12, 1, 2):
        return "冬季"
    if month in (3, 4, 5):
        return "春季"
    if month in (6, 7, 8):
        return "夏季"
    return "秋季"


def build_prompt(
    image_labels: list[str],
    latitude: float = None,
    longitude: float = None,
    capture_date: str = None,
    local_species: list[str] = None,
) -> str:
    if not image_labels:
        raise ValueError("image_labels must contain at least one label")

    image_section = "\n".join(f"图片{i + 1}：{label}" for i, label in enumerate(image_labels))

    location_hint = ""
    if latitude is not None and longitude is not None:
        location_hint = f"图片拍摄于北美坐标 ({latitude}, {longitude})。"

    season_hint = ""
    if capture_date:
        month = int(capture_date[5:7])
        season_hint = (
            f"照片拍摄日期为 {capture_date}（北半球{_season_for_month(month)}），"
            f"落叶树在冬季可能呈裸枝状态，请据此调整判断，不要仅因无叶而降低置信度或误判树种。"
        )

    species_hint = ""
    if local_species:
        species_list = "、".join(local_species)
        species_hint = (
            f"该地区曾有记录的树种包括：{species_list}。这仅是参考线索，不是最终答案——"
            f"如果图片特征明显指向其他树种（包括近期种植的园艺/非本地品种），请以视觉证据为准。"
        )

    hints = "\n".join(h for h in (location_hint, season_hint, species_hint) if h)

    return f"""你是一位北美树木专家。{hints}

本次提供了以下照片：
{image_section}

请仔细分析图片中的树木，返回以下JSON格式（只返回JSON，不要其他文字）：

{{
  "common_name": "常见英文名",
  "scientific_name": "学名",
  "family": "科名",
  "confidence": 置信度0-100的数字,
  "identification_basis": "你是根据什么特征识别的（叶形、树皮、树冠等）",
  "description": "这种树的简短介绍（2-3句话）",
  "conservation_status": "IUCN保护状态，如 Least Concern / Vulnerable / Endangered",
  "conservation_code": "LC / VU / EN / CR 等",
  "height_range": "典型高度范围，如 20-30m",
  "lifespan": "寿命，如 200+ years",
  "distribution": ["主要分布区域1", "分布区域2"],
  "toxicity": {{
    "is_toxic": true或false,
    "details": "毒性详情，如果有的话"
  }},
  "allergen": {{
    "is_allergen": true或false,
    "details": "过敏源详情，如果有的话"
  }},
  "medicinal_uses": [
    {{"use": "用途名称", "detail": "详细说明"}}
  ],
  "ecology": [
    {{"label": "Wildlife Value", "value": "描述"}},
    {{"label": "Soil Type", "value": "描述"}},
    {{"label": "Sun Preference", "value": "描述"}}
  ]
}}

如果图片中没有树，请返回 {{"error": "No tree detected"}}
如果无法识别具体树种，confidence设为低于50并说明原因。"""
