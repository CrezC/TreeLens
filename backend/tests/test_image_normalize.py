import io

import pytest
from PIL import Image

from services.image_normalize import to_jpeg_bytes, ImageDecodeError, JPEG_MEDIA_TYPE


def _make_image_bytes(fmt, size=(64, 64), color=(10, 80, 20), mode="RGB"):
    img = Image.new(mode, size, color=color)
    buf = io.BytesIO()
    img.save(buf, format=fmt)
    return buf.getvalue()


def test_jpeg_passes_through_as_jpeg():
    jpeg_bytes = _make_image_bytes("JPEG")
    result = to_jpeg_bytes(jpeg_bytes)
    assert Image.open(io.BytesIO(result)).format == "JPEG"


def test_png_converts_to_jpeg():
    png_bytes = _make_image_bytes("PNG")
    result = to_jpeg_bytes(png_bytes)
    assert Image.open(io.BytesIO(result)).format == "JPEG"


def test_heic_converts_to_jpeg():
    heic_bytes = _make_image_bytes("HEIF")
    result = to_jpeg_bytes(heic_bytes)
    assert Image.open(io.BytesIO(result)).format == "JPEG"


def test_rgba_png_converts_without_error():
    rgba_bytes = _make_image_bytes("PNG", mode="RGBA")
    result = to_jpeg_bytes(rgba_bytes)
    opened = Image.open(io.BytesIO(result))
    assert opened.format == "JPEG"
    assert opened.mode == "RGB"


def test_garbage_bytes_raise_image_decode_error():
    with pytest.raises(ImageDecodeError):
        to_jpeg_bytes(b"not an image at all")


def test_media_type_constant():
    assert JPEG_MEDIA_TYPE == "image/jpeg"
