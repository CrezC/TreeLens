# TreeLens — North American Tree Identification App

## Project Overview
TreeLens is a mobile app that identifies North American tree species from photos using Claude Vision API. Beyond identification, it provides ecological distribution data, IUCN conservation status, toxicity/allergen warnings, and medicinal use information.

## Project Structure
```
treelens/                        # FastAPI backend
├── main.py                      # FastAPI app, routes
├── .env                         # ANTHROPIC_API_KEY (never commit)
└── services/
    └── identifier.py            # Claude Vision API call + image processing

treelens-app/                    # React Native frontend (Expo)
└── App.js                       # Main UI, image picker, API calls
```

## Tech Stack
- **Backend**: FastAPI (Python), Anthropic Claude Vision API (`claude-haiku-4-5-20251001`)
- **Frontend**: React Native with Expo, expo-image-picker, expo-camera, expo-location
- **Target platform**: iOS + Android (North American users)

## Running the Project

### Backend
```bash
cd treelens
source venv/bin/activate  # or use conda base env
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend
```bash
cd treelens-app
npx expo start
# Press 'w' for web, or scan QR with Expo Go app
```

## API Endpoints
- `GET /` — health check
- `POST /identify` — accepts image file + optional latitude/longitude, returns tree identification JSON

## identify Response Schema
```json
{
  "common_name": "string",
  "scientific_name": "string",
  "family": "string",
  "confidence": 0-100,
  "identification_basis": "string",
  "description": "string",
  "conservation_status": "string",
  "conservation_code": "LC | NT | VU | EN | CR | EW | EX",
  "height_range": "string",
  "lifespan": "string",
  "distribution": ["string"],
  "toxicity": { "is_toxic": bool, "details": "string" },
  "allergen": { "is_allergen": bool, "details": "string" },
  "medicinal_uses": [{ "use": "string", "detail": "string" }],
  "ecology": [{ "label": "string", "value": "string" }]
}
```

## Current Status
- ✅ Backend working — Claude Vision identifies trees and returns full JSON
- ✅ Frontend skeleton — image picker, identify button, result display
- ✅ Frontend connects to backend via local IP (set API_URL in App.js)
- ✅ Camera capture UI (`CameraCaptureModal`) + GPS auto-detect via `expo-location` — photo taken/picked triggers a best-effort location fetch, lat/lng sent to `/identify`

## Known Issues / Active Bugs
- `API_URL` in `App.js` is hardcoded to local IP `http://192.168.0.19:8000` — needs proper config
- Web picker uses blob URI which works; native mobile not yet tested end-to-end (camera + location permission flow specifically needs a real device/simulator)
- `ImagePicker.MediaTypeOptions` deprecated warning — update to `ImagePicker.MediaType`

## Planned Features (not yet built)
1. **GBIF integration** — show real distribution map using `GET https://api.gbif.org/v1/occurrence/search?scientificName={name}&country=US`
2. **IUCN Red List API** — fetch live conservation status
3. **Multi-image support** — let user upload 2-3 photos (leaves, bark, full tree) for better accuracy
4. **Results caching** — avoid re-calling API for same species

## Environment Variables
```
ANTHROPIC_API_KEY=sk-ant-...
```

## Key Design Decisions
- Using `claude-haiku-4-5-20251001` (cheapest, fast enough for image classification)
- Prompt instructs Claude to return raw JSON only — strip markdown fences in `identifier.py` before parsing
- Image format detection uses raw byte headers (Python 3.13 removed `imghdr`)
- CORS fully open for development (`allow_origins=["*"]`) — restrict before production
