from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from typing import Optional

load_dotenv(override=True)

from services.identifier import identify_tree

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
    file: UploadFile = File(...),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
):
    image_bytes = await file.read()
    result = identify_tree(image_bytes, latitude, longitude)
    return result