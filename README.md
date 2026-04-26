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

4. Open `index.html` in the browser and upload a video.

The frontend calls `http://127.0.0.1:8000/api/analyze`.
