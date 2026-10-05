LANGUAGE_NAMES = {"en": "English", "zh": "中文", "es": "español"}
DEFAULT_LANGUAGE = "zh"
SUPPORTED_LANGUAGES = frozenset(LANGUAGE_NAMES)


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
    language: str = DEFAULT_LANGUAGE,
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

    language_name = LANGUAGE_NAMES.get(language, LANGUAGE_NAMES[DEFAULT_LANGUAGE])
    language_instruction = (
        f"请将 common_name、description、identification_basis、conservation_status、"
        f"height_range、lifespan、distribution、toxicity.details、allergen.details、"
        f"medicinal_uses[].use/.detail、ecology[].label/.value、"
        f"alternatives[].common_name/.reason 用{language_name}撰写。"
        f"但 scientific_name、family 必须保持拉丁学名原文，"
        f"conservation_code 必须保持标准 IUCN 缩写（LC/NT/VU/EN/CR/EW/EX），两者都不要翻译。"
    )

    hints = "\n".join(h for h in (location_hint, season_hint, species_hint, language_instruction) if h)

    return f"""你是一位北美树木专家。{hints}

本次提供了以下照片：
{image_section}

请仔细分析图片中的树木，返回以下JSON格式（只返回JSON，不要其他文字）：

{{
  "common_name": "常见名称",
  "scientific_name": "学名",
  "family": "科名",
  "confidence": 置信度0-100的数字,
  "identification_basis": "你是根据什么特征识别的（叶形、树皮、树冠等）",
  "description": "这种树的简短介绍（2-3句话）",
  "conservation_status": "IUCN保护状态的文字描述",
  "conservation_code": "LC / VU / EN / CR 等",
  "height_range": "典型高度范围（例如 20-30m）",
  "lifespan": "寿命（例如 200+）",
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
    {{"label": "类别名称（如野生动物价值/土壤类型/光照需求等）", "value": "描述"}}
  ],
  "alternatives": [
    {{"common_name": "...", "scientific_name": "...", "confidence": 0-100的数字, "reason": "为什么这也是一个可能的候选"}}
  ]
}}

如果图片中没有树，请返回 {{"error": "No tree detected"}}
如果无法识别具体树种，confidence设为低于50并说明原因。
如果你的识别置信度低于80，或者该树种容易与其他相似树种混淆，请在 alternatives 中列出最多2个次优候选及理由；
如果你非常确定，alternatives 返回空数组 []。"""
