from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from typing import Optional

load_dotenv(override=True)

from services.identifier import identify_tree
from services.labels import label_for_filename
from services.image_normalize import ImageDecodeError
from services.wikipedia import get_reference_image
from services.prompt_builder import DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES

MAX_PHOTOS = 3
MAX_ALTERNATIVES = 2

app = FastAPI(title="TreeLens API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "TreeLens API is running"}

@app.post("/identify")
async def identify(
    files: list[UploadFile] = File(...),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    capture_date: Optional[str] = Form(None),
    language: Optional[str] = Form(DEFAULT_LANGUAGE),
):
    if len(files) > MAX_PHOTOS:
        raise HTTPException(status_code=400, detail=f"Maximum {MAX_PHOTOS} photos per identification")
    if language not in SUPPORTED_LANGUAGES:
        language = DEFAULT_LANGUAGE
    images = [await f.read() for f in files]
    image_labels = [label_for_filename(f.filename) for f in files]
    try:
        result = identify_tree(images, image_labels, latitude, longitude, capture_date, language)
    except ImageDecodeError:
        raise HTTPException(status_code=400, detail="Could not process the image, please try a different photo")
    if not result.get("error"):
        result["reference_image"] = get_reference_image(result.get("scientific_name"))
        alternatives = (result.get("alternatives") or [])[:MAX_ALTERNATIVES]
        for alt in alternatives:
            alt["reference_image"] = get_reference_image(alt.get("scientific_name"))
        result["alternatives"] = alternatives
    return result