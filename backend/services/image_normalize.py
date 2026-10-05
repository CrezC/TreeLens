import io

import pillow_heif
from PIL import Image, UnidentifiedImageError

pillow_heif.register_heif_opener()

JPEG_MEDIA_TYPE = "image/jpeg"


class ImageDecodeError(Exception):
    pass


def to_jpeg_bytes(image_bytes: bytes, quality: int = 85) -> bytes:
    """Decode arbitrary image bytes (JPEG/PNG/WEBP/HEIC/...) and re-encode as JPEG.

    iOS photo library photos are HEIC by default, which Claude's API can't
    process directly — normalizing every input to JPEG here avoids needing
    to sniff/trust the original format at all.
    """
    try:
        image = Image.open(io.BytesIO(image_bytes))
        image.load()
    except (UnidentifiedImageError, OSError) as e:
        raise ImageDecodeError(f"Could not decode image: {e}") from e

    out = io.BytesIO()
    image.convert("RGB").save(out, format="JPEG", quality=quality)
    return out.getvalue()
