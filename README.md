# GymCom

GymCom is a software-only workout analysis and live movement coaching app. It helps users review exercise form, count reps, estimate movement quality, and get practical coaching feedback from a normal phone or laptop camera.

The product has two core experiences:

- **Upload analyzer**: upload a recorded workout clip and receive a structured AI form report.
- **Live lab**: use the webcam for real-time pose tracking, rep counting, form scoring, and camera-positioning cues.

GymCom combines browser-side video processing, browser pose tracking, a FastAPI backend, and Anthropic Claude for deeper written coaching reports.

## Features

- Exercise identification and rep counting
- Movement phase and posture review
- Joint-angle estimates and left/right balance notes
- Tempo, control, safety risk, and form-score feedback
- Browser-side frame sampling to keep upload payloads smaller
- Live webcam tracking with exercise-specific thresholds
- Instant live cues for framing, depth, symmetry, and control
- Vercel and Render deployment support

## Project Structure

- `index.html`: upload analyzer page
- `live.html`: live tracking page
- `app.js`: upload flow, frame sampling, report parsing, and sample reports
- `live.js`: live pose tracking, exercise profiles, rep logic, and form cues
- `styles.css`: shared UI styling
- `backend.py`: FastAPI routes, Claude integration, and static file serving
- `app.py`: Vercel Python entrypoint
- `render.yaml`: Render deployment config
- `.env.example`: environment variable template

## How It Works

### Upload Analyzer

1. The user selects a workout video.
2. The frontend samples and compresses key frames in the browser.
3. The sampled frames are posted to the FastAPI backend.
4. The backend sends those frames to Claude with the GymCom coaching prompt.
5. The frontend parses the response into summary cards, issue frames, risks, corrections, and coach feedback.

### Live Lab

1. The user opens `live.html` and selects an exercise.
2. The browser starts the webcam.
3. A browser pose model tracks full-body landmarks.
4. Exercise-specific joint thresholds drive phase detection, rep counting, and form scoring.
5. The UI shows live metrics, positioning guidance, and corrective cues.

## Run Locally

Create and activate a Python environment:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create a local environment file:

```bash
cp .env.example .env
```

Set the required Claude API key:

```bash
ANTHROPIC_API_KEY=your-key-here
```

Start the app:

```bash
uvicorn backend:app --reload
```

Open:

- `http://127.0.0.1:8000/`
- `http://127.0.0.1:8000/live.html`

## Environment Variables

- `ANTHROPIC_API_KEY`: required for Claude-powered analysis
- `ANTHROPIC_MODEL`: Claude model name, defaults to `claude-haiku-4-5`
- `GYMCOM_SECONDS_PER_FRAME`: backend extraction interval for raw video uploads
- `GYMCOM_MAX_MODEL_FRAMES`: maximum number of frames sent to Claude
- `GYMCOM_MAX_PREVIEW_FRAMES`: maximum preview frames returned to the UI

## Deploy On Vercel

The FastAPI app is exposed through `app.py`, so Vercel can serve the frontend and API routes together.

Install and log in to the Vercel CLI:

```bash
npm i -g vercel
vercel login
```

Add production environment variables:

```bash
vercel env add ANTHROPIC_API_KEY production
vercel env add ANTHROPIC_MODEL production
vercel env add GYMCOM_SECONDS_PER_FRAME production
vercel env add GYMCOM_MAX_MODEL_FRAMES production
vercel env add GYMCOM_MAX_PREVIEW_FRAMES production
```

Deploy:

```bash
vercel --prod
```

Useful routes:

- `/`
- `/live.html`
- `/api/health`
- `/api/analyze`

## Deploy On Render

This repo includes `render.yaml`.

1. Push the repo to GitHub.
2. Import it into Render as a Blueprint or Web Service.
3. Set `ANTHROPIC_API_KEY`.
4. Deploy.

Render start command:

```bash
uvicorn backend:app --host 0.0.0.0 --port $PORT
```

## Notes

- GymCom is a movement coaching tool, not a diagnostic medical device.
- Single-camera tracking works best with clear lighting and full-body framing.
- Side-view movements usually produce cleaner lower-body angle estimates.
- Live tracking is best for immediate cues; Claude is best for deeper post-set written feedback.

## Security

Do not commit API keys or secrets. If a key is exposed in chat, screenshots, commits, or logs, rotate it before using the app in production.

## Credits

Built by **Abhishek Sairam Gaduputi**.
