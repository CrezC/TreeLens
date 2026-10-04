# TreeLens — North American Tree Identification App

## Project Overview
TreeLens is a mobile app that identifies North American tree species from photos using Claude Vision API. Beyond identification, it provides ecological distribution data, IUCN conservation status, toxicity/allergen warnings, and medicinal use information.

## Project Structure
```
treelens/                        # FastAPI backend
├── main.py                      # FastAPI app, routes
├── .env                         # ANTHROPIC_API_KEY (never commit)
├── requirements.txt / requirements-dev.txt
├── tests/                       # pytest — labels, gbif, prompt_builder
└── services/
    ├── identifier.py            # Claude Vision API call + image processing
    ├── prompt_builder.py        # pure prompt construction (multi-image/season/species hints)
    ├── gbif.py                  # GBIF occurrence lookup for local species hint
    └── labels.py                # filename stem -> Chinese photo label

treelens-app/                    # React Native frontend (Expo)
├── App.js                       # Main UI, 3-slot image picker, API calls
├── theme.js                     # shared color theme
├── history.js                   # local identification history (AsyncStorage)
└── HistoryModal.js              # history list UI
```

## Tech Stack
- **Backend**: FastAPI (Python), Anthropic Claude Vision API (`claude-sonnet-5`)
- **Frontend**: React Native with Expo, expo-image-picker, expo-camera, expo-location
- **Target platform**: iOS + Android (North American users)

## Running the Project

### Backend
```bash
cd treelens
source venv/bin/activate  # or use conda base env
pip install -r requirements-dev.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Run tests: `venv/bin/pytest`

### Frontend
```bash
cd treelens-app
npx expo start
# Press 'w' for web, or scan QR with Expo Go app
```

Run tests: `npm test`

## API Endpoints
- `GET /` — health check
- `POST /identify` — accepts up to 3 `files` (repeated form field; filename stem `leaf`/`bark`/`full` tags each photo, anything else falls back to a generic label), plus optional `latitude`/`longitude`/`capture_date` (ISO string), returns tree identification JSON

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
- ✅ Frontend — 3-slot image picker (leaf/bark/full-tree, any subset), identify button, result display
- ✅ Frontend connects to backend via local IP (`EXPO_PUBLIC_API_URL` in `treelens-app/.env`)
- ✅ Camera capture UI (`CameraCaptureModal`) + GPS auto-detect via `expo-location`, now parameterized per photo slot
- ✅ Multi-image identification — up to 3 photos (leaf/bark/full tree) sent per request, each labeled for Claude
- ✅ GBIF geo-verification — `services/gbif.py` looks up species recorded near the given coordinates as a prompt hint (fails closed, never blocks identification)
- ✅ Seasonal context — capture date is sent and turned into a season hint so winter bare-branch deciduous trees aren't penalized
- ✅ Local identification history — `treelens-app/history.js` + `HistoryModal.js`, AsyncStorage-backed, full result JSON stored per entry

## Known Issues / Active Bugs
- Web picker uses blob URI which works; native mobile camera/location flow confirmed working on a real device as of this round of changes
- History thumbnails use a cache-directory URI that can go stale after app restarts/cache eviction (old entries may show a broken image while the text result stays intact) — not fixed, would need `expo-file-system` to copy into permanent storage
- `Alert.alert()` is a no-op in `react-native-web`, so the photo-slot chooser only works on iOS/Android via Expo Go, not the web preview
- Accuracy on non-close-up single photos should be improved now by multi-image + GBIF + season hints, but not yet validated against real-world misidentifications the way the original issue was found

## Recently Fixed
- `main.py` was crashing `/identify` with 500 on every call: `services.identifier` was imported before `load_dotenv()` ran, and an ambient empty `ANTHROPIC_API_KEY` env var was shadowing the real key. Fixed with `load_dotenv(override=True)` moved before the import.
- `ImagePicker.MediaTypeOptions` (deprecated in SDK 56) replaced with `mediaTypes: ['images']`.
- `API_URL` in `App.js` was hardcoded to a personal local IP. Now read from `EXPO_PUBLIC_API_URL` (Expo auto-inlines `EXPO_PUBLIC_*` vars from `.env`). Real value lives in gitignored `treelens-app/.env`; `treelens-app/.env.example` documents the format.

## Planned Features (not yet built)
1. **IUCN Red List API** — fetch live conservation status
2. **Results caching** — avoid re-calling API for same species
3. **GBIF distribution map** — the occurrence lookup now exists (`services/gbif.py`) but only feeds a text hint into the prompt; a real map view in the frontend is still unbuilt
4. **Permanent history image storage** — copy picked/captured photos into `expo-file-system`'s document directory so history thumbnails don't rot

## Environment Variables
```
ANTHROPIC_API_KEY=sk-ant-...
```

## Key Design Decisions
- Using `claude-sonnet-5` for stronger vision accuracy (switched from `claude-haiku-4-5-20251001`, which was cheaper/faster but misidentified trees from non-close-up photos)
- Prompt instructs Claude to return raw JSON only — strip markdown fences in `identifier.py` before parsing
- Image format detection uses raw byte headers (Python 3.13 removed `imghdr`)
- CORS fully open for development (`allow_origins=["*"]`) — restrict before production
- Prompt construction lives in `services/prompt_builder.py` as a pure function (no `anthropic` import) specifically so it's unit-testable without an API key; same reasoning for `services/gbif.py` and `services/labels.py` being dependency-free
- Each photo's role (leaf/bark/full) is passed from frontend to backend via the upload's **filename stem** (`leaf.jpg`/`bark.jpg`/`full.jpg`) rather than an extra form field — `services/labels.py` maps it to a Chinese label, defaulting gracefully for anything unrecognized
- GBIF lookups and the Claude call are both synchronous/blocking inside an `async def` route — pre-existing pattern, not worth fixing until it's actually a bottleneck (`fastapi.concurrency.run_in_threadpool` would be the fix)
- Breaking change: `/identify`'s file field was renamed `file` → `files` (now a list) — both repos must be deployed together
