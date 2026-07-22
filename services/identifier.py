import anthropic
import base64
import os
import json
from PIL import Image
import io

client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

def encode_image(image_bytes: bytes) -> str:
    return base64.standard_b64encode(image_bytes).decode("utf-8")

def get_media_type(image_bytes: bytes) -> str:
    if image_bytes[:4] == b'\x89PNG':
        return "image/png"
    elif image_bytes[:2] in (b'\xff\xd8',):
        return "image/jpeg"
    elif image_bytes[:4] == b'RIFF' and image_bytes[8:12] == b'WEBP':
        return "image/webp"
    else:
        return "image/jpeg"

def identify_tree(image_bytes: bytes, latitude: float = None, longitude: float = None) -> dict:
    location_hint = ""
    if latitude and longitude:
        location_hint = f"图片拍摄于北美坐标 ({latitude}, {longitude})。"

    prompt = f"""你是一位北美树木专家。{location_hint}
    
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

    image_data = encode_image(image_bytes)
    
    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1000,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": get_media_type(image_bytes),
                            "data": image_data,
                        },
                    },
                    {
                        "type": "text",
                        "text": prompt
                    }
                ],
            }
        ],
    )
    
    response_text = message.content[0].text
    # 清除Claude可能返回的markdown格式
    response_text = response_text.strip()
    if response_text.startswith("```"):
        response_text = response_text.split("```")[1]
        if response_text.startswith("json"):
            response_text = response_text[4:]
    response_text = response_text.strip()

    result = json.loads(response_text)
    return result