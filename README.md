# GymCom

> AI-powered workout analysis and live movement coaching from a normal camera.

GymCom is a software-only fitness analysis platform that helps users review exercise form, count reps, estimate movement quality, and receive trainer-style corrections. It is built for people who want meaningful feedback from a phone or laptop camera without any wearable device, sensor, or custom hardware.

The product has two connected experiences:

- **Upload analyzer** for post-set video review
- **Live interaction** for real-time movement tracking and instant cues

At its core, GymCom blends browser-based pose estimation, a FastAPI backend, and Anthropic Claude for deeper written coaching feedback.

## Why this project exists

Most workout apps either give generic advice or depend on hardware most users do not have. GymCom takes a more practical path:

- record a lift or bodyweight movement
- upload it or track it live
- receive structured movement feedback
- understand what to correct next session

The goal is not to replace a coach. The goal is to make movement review clearer, faster, and far more accessible.

## What GymCom does

### Upload analyzer

The main page accepts a workout video and turns it into a structured performance report. The output includes:

- exercise identification
- rep counting
- movement phase review
- posture summary
- joint angle estimates
- left/right balance observations
- tempo and control notes
- safety risks
- form score
- prioritized corrections
- coach-style feedback

To make this production-friendly, the browser does not upload the full raw video by default. Instead, it samples and compresses key frames locally, then sends those frames to the backend. That keeps the payload smaller and works better with serverless deployment limits.

### Live interaction

The live page acts like a browser-based movement lab. It supports:

- exercise selection
- home workout and gym workout categories
- full-body pose tracking
- joint-angle monitoring
- rep counting
- phase detection
- live form score
- camera positioning guidance
- instant cues such as move left, move right, move closer, and step back

This mode is built for real-time exercise guidance. After the set, the session can be summarized further with Claude for a richer post-workout report.

## Product experience

### 1. Record or open the camera

Users can either upload a workout clip or move directly into live tracking mode.

### 2. Detect the movement

The system tracks visible body landmarks and maps them into exercise-specific logic such as squat depth, elbow flexion, hip hinge range, or symmetry.

### 3. Score and explain

Instead of just showing raw numbers, GymCom turns the motion into something useful:

- what exercise was performed
- how many reps were completed
- where form starts to drift
- what the biggest risks are
- what to fix first

### 4. Coach the next rep

The platform is designed to support action, not just analysis. The output is written so a user knows what to change on the next set.

## How it works

### Upload flow

1. A user selects a workout video on the main page.
2. The frontend samples important frames in the browser.
3. Those frames are posted to the FastAPI backend.
4. The backend sends them to Anthropic Claude with the GymBuddy analysis prompt.
5. The frontend parses the response into a clean report with summary, risks, corrections, scores, and frame highlights.

### Live flow

1. A user opens the live page and selects an exercise.
2. The browser starts the webcam.
3. A browser pose model tracks the full-body skeleton.
4. Exercise-specific angle thresholds drive rep counting, phase detection, and cue logic.
5. The interface surfaces live metrics and framing guidance.
6. The recorded session can later be summarized with Claude for a deeper narrative report.

## Highlights

- **Software only**: no gadget, no wearable, no special hardware
- **Two-mode experience**: upload review plus live tracking
- **Exercise-aware logic**: different movements use different joint chains and thresholds
- **Readable feedback**: summary-first output instead of raw technical noise
- **Production-ready upload flow**: browser frame sampling avoids oversized video payloads
- **Deployment-ready**: supports both Vercel and Render

## Tech stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: FastAPI
- **AI feedback**: Anthropic Claude API
- **Video processing**: browser-side frame sampling plus OpenCV support on the backend
- **Live motion tracking**: browser pose detection with MediaPipe / BlazePose-style tracking
- **Deployment**: Vercel and Render

## Project structure

- [index.html](/Users/abhishek/Documents/Codex/2026-04-26-help-me-prep-for-my-meetings/index.html): main upload analyzer
- [live.html](/Users/abhishek/Documents/Codex/2026-04-26-help-me-prep-for-my-meetings/live.html): live tracking experience
- [app.js](/Users/abhishek/Documents/Codex/2026-04-26-help-me-prep-for-my-meetings/app.js): upload flow, browser frame sampling, report parsing
- [live.js](/Users/abhishek/Documents/Codex/2026-04-26-help-me-prep-for-my-meetings/live.js): live pose logic, exercise profiles, rep counting, form cues
- [styles.css](/Users/abhishek/Documents/Codex/2026-04-26-help-me-prep-for-my-meetings/styles.css): shared UI styling
- [backend.py](/Users/abhishek/Documents/Codex/2026-04-26-help-me-prep-for-my-meetings/backend.py): FastAPI API, Claude integration, backend frame handling
- [app.py](/Users/abhishek/Documents/Codex/2026-04-26-help-me-prep-for-my-meetings/app.py): Vercel entrypoint
- [render.yaml](/Users/abhishek/Documents/Codex/2026-04-26-help-me-prep-for-my-meetings/render.yaml): Render deployment config
- [.env.example](/Users/abhishek/Documents/Codex/2026-04-26-help-me-prep-for-my-meetings/.env.example): environment variable template

## Run locally

### 1. Create the environment

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Add your values to `.env`, especially:

- `ANTHROPIC_API_KEY`
- `ANTHROPIC_MODEL`
- `GYMBUDDY_SECONDS_PER_FRAME`
- `GYMBUDDY_MAX_MODEL_FRAMES`
- `GYMBUDDY_MAX_PREVIEW_FRAMES`

### 3. Start the app

```bash
uvicorn backend:app --reload
```

### 4. Open the site

- `http://127.0.0.1:8000/`
- `http://127.0.0.1:8000/live.html`

## Environment variables

- `ANTHROPIC_API_KEY`: required for Claude analysis
- `ANTHROPIC_MODEL`: defaults to `claude-haiku-4-5`
- `GYMBUDDY_SECONDS_PER_FRAME`: backend extraction interval for raw video uploads
- `GYMBUDDY_MAX_MODEL_FRAMES`: maximum number of frames sent to Claude
- `GYMBUDDY_MAX_PREVIEW_FRAMES`: maximum preview frames shown in the UI

## Deploy on Vercel

The project can be deployed to Vercel with the Python backend exposed through [app.py](/Users/abhishek/Documents/Codex/2026-04-26-help-me-prep-for-my-meetings/app.py).

### Vercel CLI flow

```bash
npm i -g vercel
vercel login
vercel
```

Add secrets:

```bash
vercel env add ANTHROPIC_API_KEY production
vercel env add ANTHROPIC_API_KEY preview
vercel env add ANTHROPIC_API_KEY development
vercel env add ANTHROPIC_MODEL production
vercel env add GYMBUDDY_SECONDS_PER_FRAME production
vercel env add GYMBUDDY_MAX_MODEL_FRAMES production
vercel env add GYMBUDDY_MAX_PREVIEW_FRAMES production
```

Deploy production:

```bash
vercel --prod
```

Useful routes:

- `/`
- `/live.html`
- `/api/health`
- `/api/analyze`

## Deploy on Render

This project also includes [render.yaml](/Users/abhishek/Documents/Codex/2026-04-26-help-me-prep-for-my-meetings/render.yaml) for Render.

Basic flow:

1. Push the repo to GitHub.
2. Import it into Render as a Blueprint or Web Service.
3. Set `ANTHROPIC_API_KEY` in Render.
4. Deploy.

Render start command:

```bash
uvicorn backend:app --host 0.0.0.0 --port $PORT
```

## Notes

- GymCom is a movement coaching tool, not a diagnostic medical device.
- Single-camera tracking works best with clear framing, decent lighting, and the right camera angle.
- Side-view movements usually give cleaner angle estimates than heavily occluded front-view clips.
- Live tracking is best for guidance during the set, while Claude is best for the deeper written summary after the set.

## Security

Do not commit your Anthropic API key into the repository or expose it in frontend code. If a key has been shared in chat, screenshots, or any public place, rotate it and replace it in local and deployed environments.

## Credits

Built by **Abhishek Sairam Gaduputi**.
