import anthropic
import base64
import os
import json

from services.gbif import get_local_species
from services.prompt_builder import build_prompt
from services.image_normalize import to_jpeg_bytes, JPEG_MEDIA_TYPE

client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

def encode_image(image_bytes: bytes) -> str:
    return base64.standard_b64encode(image_bytes).decode("utf-8")

def identify_tree(
    images: list[bytes],
    image_labels: list[str],
    latitude: float = None,
    longitude: float = None,
    capture_date: str = None,
) -> dict:
    local_species = get_local_species(latitude, longitude) if latitude is not None and longitude is not None else []
    prompt = build_prompt(image_labels, latitude, longitude, capture_date, local_species)

    content = [
        {
            "type": "image",
            "source": {
                "type": "base64",
                "media_type": JPEG_MEDIA_TYPE,
                "data": encode_image(to_jpeg_bytes(image_bytes)),
            },
        }
        for image_bytes in images
    ]
    content.append({"type": "text", "text": prompt})

    message = client.messages.create(
        model="claude-sonnet-5",
        max_tokens=1000,
        messages=[
            {
                "role": "user",
                "content": content,
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
