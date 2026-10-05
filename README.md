# 🌿 TreeLens

TreeLens identifies North American tree species from photos using Claude's vision models. Point your phone at a tree — leaf, bark, or the whole thing — and get back a species ID with conservation status, toxicity/allergen warnings, medicinal uses, and ecological info, in English, Chinese, or Spanish.

## Features

- **Multi-image identification** — submit a leaf close-up, bark texture, and/or full-tree shot together for better accuracy than a single photo
- **Geo-verification** — cross-checks the result against species actually recorded nearby via [GBIF](https://www.gbif.org/)
- **Seasonal awareness** — accounts for deciduous trees looking bare in winter instead of penalizing confidence for it
- **Alternative candidates** — when Claude isn't fully confident, see the next most likely species with its own reasoning and reference photo
- **Reference photo** — a Wikipedia photo of the identified species shown alongside yours, so you can visually sanity-check the result
- **Multi-language** — English, Chinese, and Spanish, switchable in-app; identification content itself is generated in the selected language, not just the UI
- **Local history** — past identifications are saved on-device

## How it's built

```
treelens-github/
├── backend/     FastAPI (Python) — calls Claude's vision API, enriches results with GBIF/Wikipedia data
└── frontend/    Expo (React Native) — camera/photo picker UI, talks to the backend over HTTP
```

The two halves run as separate processes: the backend is a small FastAPI server, the frontend is an Expo app you run in [Expo Go](https://expo.dev/go) on your own phone. See each folder's own `CLAUDE.md` for implementation details and design notes.

## Running it yourself

You'll need:
- An [Anthropic API key](https://console.anthropic.com/) (Claude's vision API isn't free — this will use your own API credits)
- Python 3.13+
- Node.js 20+ and npm
- The [Expo Go](https://expo.dev/go) app on your phone
- Your phone and computer on the same Wi-Fi network

### 1. Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements-dev.txt
cp .env.example .env              # then edit .env and paste in your Anthropic API key
uvicorn main:app --host 0.0.0.0 --port 8000
```

Leave this running. Run `venv/bin/pytest` to run the backend test suite.

### 2. Frontend

In a new terminal:

```bash
cd frontend
npm install
cp .env.example .env
```

Edit `frontend/.env` and set `EXPO_PUBLIC_API_URL` to `http://<your computer's local IP>:8000` (not `localhost` — your phone needs to reach your computer over Wi-Fi). Find your local IP with `ipconfig getifaddr en0` (macOS) or `ipconfig` (Windows).

```bash
npx expo start
```

Scan the QR code with your phone's camera (iOS) or the Expo Go app (Android). Run `npm test` to run the frontend test suite.

### Troubleshooting

- **"Project is incompatible with this version of Expo Go"** — update the Expo Go app on your phone.
- **"无法连接到服务器" / "Could not connect to the server"** — your phone and computer need to be on the same Wi-Fi network, and `EXPO_PUBLIC_API_URL` needs to point at your computer's *current* local IP (it changes between networks).
- **HEIC/photo upload errors** — the backend normalizes any image format automatically; if you still hit this, make sure `pillow-heif` installed correctly (`pip install -r requirements-dev.txt` again).

## Tech stack

- **Backend**: FastAPI, Anthropic's Claude API (`claude-sonnet-5`), GBIF occurrence API, Wikipedia REST API
- **Frontend**: Expo / React Native, `expo-camera`, `expo-image-picker`, `expo-location`, `@react-native-async-storage/async-storage`

## License

MIT — see [LICENSE](LICENSE). This is a personal project shared for others to run and learn from; it isn't a hosted service, so you'll need your own Anthropic API key to use it.
