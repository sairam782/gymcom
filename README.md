# GymBuddy Vision

## Run locally

1. Create an environment and install dependencies:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

2. Export your Anthropic key:

```bash
export ANTHROPIC_API_KEY="your-key"
```

3. Start the backend:

```bash
uvicorn backend:app --reload
```

4. Open `http://127.0.0.1:8000/` in the browser.

The frontend calls `/api/analyze`.

## Deploy on Render

This repo is set up for Render with [render.yaml](/Users/abhishek/Documents/Codex/2026-04-26-help-me-prep-for-my-meetings/render.yaml).

1. Push this project to GitHub.
2. In Render, create a new `Blueprint` or `Web Service` from the repo.
3. If using the blueprint, Render will read `render.yaml` automatically.
4. Set `ANTHROPIC_API_KEY` as a secret environment variable in Render.
5. Deploy and open the generated `onrender.com` URL.

Render start command:

```bash
uvicorn backend:app --host 0.0.0.0 --port $PORT
```

Health check:

```text
/api/health
```

## Important security note

Do not commit your Anthropic API key into the repo or frontend code.

If you have shared a real API key in chat or pasted it anywhere public, rotate it in Anthropic and replace it with a fresh key before deploying.
