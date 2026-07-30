import base64
import os
import shutil
import tempfile
from pathlib import Path

import cv2
from anthropic import Anthropic
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, PlainTextResponse, Response
from dotenv import load_dotenv


load_dotenv()


PROMPT = """
You are GymCom Coach — an elite AI fitness coach, posture analyst,
biomechanics evaluator, and exercise form specialist.

You are analyzing a workout video using extracted frames from a gym session.

Your job is to act like a professional strength coach, personal trainer,
posture correction expert, and movement analyst.

You must think like:
- an expert gym trainer
- a biomechanics specialist
- a rehabilitation posture coach
- a movement correction expert
- a professional strength and conditioning coach

You must prioritize:
accuracy > detail > practical correction > safety

Do NOT give generic advice.
Do NOT give vague answers.
Do NOT guess randomly.
Only infer based on visible movement patterns across all frames.

PRIMARY TASKS
1. EXERCISE IDENTIFICATION
2. REP COUNTING
3. MOVEMENT PHASE ANALYSIS
4. ADVANCED POSTURE ANALYSIS
5. JOINT ANGLE ESTIMATION
6. LEFT vs RIGHT SYMMETRY ANALYSIS
7. RANGE OF MOTION ANALYSIS
8. TEMPO & CONTROL ANALYSIS
10. PERFORMANCE LEVEL CLASSIFICATION
11. SAFETY & INJURY RISK ANALYSIS
12. FORM SCORE
13. COACHING CORRECTIONS

OUTPUT FORMAT (exact structure required)

Exercise: <name> (Confidence: <0–100>%) | Equipment: <type>
Reps Counted: <number> (<motion pattern note>)
Performance Level: <Beginner / Intermediate / Advanced>

Movement Phases:
  - <phase>: <observation>

Posture Summary:
  - <observation>

Joint Angle Estimates:
  ┌─────────────────┬──────────┬──────────┬──────────┬────────────┐
  │ Joint           │ Bottom   │ Lockout  │ In Range?│ L/R Match? │
  ├─────────────────┼──────────┼──────────┼──────────┼────────────┤
  │ <joint name>    │ ~<X>°    │ ~<X>°    │ Yes / No │ Yes / ~X°  │
  │                 │          │          │          │ difference │
  └─────────────────┴──────────┴──────────┴──────────┴────────────┘
  Note: All angles are visual estimates, not precision measurements.

Left vs. Right Balance:
  - <observation>

Tempo & Control:
  - <observation>

Form Score: <1–10> — <one-line justification>

Safety Risks:
  - <risk> [linked to angle finding if applicable]

Major Issues:
  - <issue>

Corrections (priority order):
  1. <most critical — tie to angle if relevant>
  2. <second>
  3. <third>

Coach Feedback:
<2–3 sentences a real trainer would say directly to the athlete.
Honest, specific, encouraging. Reference a key angle finding.>

GROUND RULES
✔ Analyze motion across the FULL frame sequence — never one frame alone.
✔ Joint angles are VISUAL ESTIMATES — always label them as such.
✔ If confidence is below 50%, lead with that caveat before any analysis.
✔ Compare first and last reps — fatigue matters as much as peak form.
✔ If a detail is unclear, say so — never fabricate observations.
✔ Connect angle findings to safety risks and corrections wherever possible.
✔ Prioritize safety above all else.
✔ Tone: honest, specific, encouraging — like a great coach, not a cheerleader.
✔ Never inflate the Form Score.
"""

MODEL_NAME = os.getenv("ANTHROPIC_MODEL", "claude-haiku-4-5")
SECONDS_PER_FRAME = float(os.getenv("GYMCOM_SECONDS_PER_FRAME", "2"))
MAX_MODEL_FRAMES = int(os.getenv("GYMCOM_MAX_MODEL_FRAMES", "12"))
MAX_PREVIEW_FRAMES = int(os.getenv("GYMCOM_MAX_PREVIEW_FRAMES", "3"))
BASE_DIR = Path(__file__).resolve().parent

app = FastAPI(title="GymCom API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def require_client() -> Anthropic:
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
      raise HTTPException(
          status_code=500,
          detail="Missing ANTHROPIC_API_KEY. Set it in your environment before starting the server.",
      )
    return Anthropic(api_key=api_key)


def extract_frames(video_path: Path, frame_dir: Path, seconds_per_frame: float) -> list[Path]:
    frame_dir.mkdir(parents=True, exist_ok=True)
    cap = cv2.VideoCapture(str(video_path))
    fps = cap.get(cv2.CAP_PROP_FPS)
    if not fps or fps <= 0:
        fps = 30

    interval = max(1, int(fps * seconds_per_frame))
    count = 0
    saved = 0
    paths: list[Path] = []

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        if count % interval == 0:
            path = frame_dir / f"frame_{saved}.jpg"
            cv2.imwrite(str(path), frame)
            paths.append(path)
            saved += 1

        count += 1

    cap.release()
    return paths


def select_frames(frame_paths: list[Path], num_frames: int) -> list[Path]:
    if not frame_paths:
        return []
    step = max(1, len(frame_paths) // num_frames)
    return frame_paths[::step][:num_frames]


def encode_image(path: Path) -> str:
    return base64.b64encode(path.read_bytes()).decode()


def encode_bytes(data: bytes) -> str:
    return base64.b64encode(data).decode()


def build_claude_content(encoded_images: list[str]) -> list[dict]:
    content: list[dict] = [{"type": "text", "text": PROMPT}]
    for image in encoded_images:
        content.append(
            {
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": "image/jpeg",
                    "data": image,
                },
            }
        )
    return content


def extract_error_message(error: Exception) -> str:
    message = str(error).strip()
    return message or error.__class__.__name__


def create_claude_report(encoded_model_frames: list[str]) -> str:
    client = require_client()
    try:
        response = client.messages.create(
            model=MODEL_NAME,
            max_tokens=2500,
            messages=[
                {
                    "role": "user",
                    "content": build_claude_content(encoded_model_frames),
                }
            ],
        )
    except Exception as error:
        raise HTTPException(
            status_code=502,
            detail=f"Anthropic request failed: {extract_error_message(error)}",
        ) from error

    report_text = ""
    for block in response.content:
        if getattr(block, "type", None) == "text":
            report_text += block.text

    return report_text.strip()


@app.get("/api/health")
def healthcheck() -> dict:
    return {"ok": True}


@app.get("/", response_class=FileResponse)
def root() -> FileResponse:
    return FileResponse(BASE_DIR / "index.html")


@app.get("/api", response_class=PlainTextResponse)
def api_root() -> str:
    return (
        "GymCom API is running.\n\n"
        "Frontend: GET /\n"
        "Live page: GET /live.html\n"
        "Analyze endpoint: POST /api/analyze\n"
        "Health check: GET /api/health\n"
    )


@app.get("/favicon.ico")
def favicon() -> Response:
    return Response(status_code=204)


@app.get("/app", response_class=FileResponse)
def app_index() -> FileResponse:
    return FileResponse(BASE_DIR / "index.html")


@app.get("/app/{path:path}", response_class=FileResponse)
def serve_app_file(path: str) -> FileResponse:
    requested = (BASE_DIR / path).resolve()
    if BASE_DIR not in requested.parents and requested != BASE_DIR:
        raise HTTPException(status_code=403, detail="Path is outside the app directory.")
    if not requested.is_file():
        raise HTTPException(status_code=404, detail="Requested file was not found.")
    return FileResponse(requested)


@app.post("/api/analyze")
async def analyze_video(
    file: UploadFile | None = File(None),
    frames: list[UploadFile] | None = File(None),
    filename: str | None = Form(None),
    extracted_frame_count: int | None = Form(None),
    duration_seconds: float | None = Form(None),
) -> JSONResponse:
    if frames:
        frame_payloads: list[tuple[str, bytes]] = []
        for index, frame in enumerate(frames):
            payload = await frame.read()
            if not payload:
                continue
            frame_name = frame.filename or f"frame_{index}.jpg"
            frame_payloads.append((frame_name, payload))

        if not frame_payloads:
            raise HTTPException(status_code=400, detail="No usable frames were uploaded.")

        selected_frame_payloads = frame_payloads[:MAX_MODEL_FRAMES]
        preview_frame_payloads = frame_payloads[:MAX_PREVIEW_FRAMES]
        report_text = create_claude_report(
            [encode_bytes(payload) for _, payload in selected_frame_payloads]
        )

        return JSONResponse(
            {
                "ok": True,
                "filename": filename or "browser-sampled-video",
                "frames_extracted": extracted_frame_count or len(frame_payloads),
                "frames_sent": len(selected_frame_payloads),
                "duration_seconds": duration_seconds,
                "seconds_per_frame": SECONDS_PER_FRAME,
                "report_text": report_text,
                "preview_frames": [
                    f"data:image/jpeg;base64,{encode_bytes(payload)}"
                    for _, payload in preview_frame_payloads
                ],
            }
        )

    if not file or not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No video or extracted frames were uploaded.",
        )

    suffix = Path(file.filename).suffix or ".mp4"
    workspace = Path(tempfile.mkdtemp(prefix="gymcom_"))
    video_path = workspace / f"upload{suffix}"
    frame_dir = workspace / "frames"

    try:
        video_path.write_bytes(await file.read())

        extracted_frames = extract_frames(
            video_path=video_path,
            frame_dir=frame_dir,
            seconds_per_frame=SECONDS_PER_FRAME,
        )
        if not extracted_frames:
            raise HTTPException(status_code=400, detail="Could not extract frames from the uploaded video.")

        selected_frames = select_frames(extracted_frames, MAX_MODEL_FRAMES)
        preview_frames = select_frames(extracted_frames, MAX_PREVIEW_FRAMES)
        encoded_model_frames = [encode_image(path) for path in selected_frames]

        report_text = create_claude_report(encoded_model_frames)

        return JSONResponse(
            {
                "ok": True,
                "filename": file.filename,
                "frames_extracted": len(extracted_frames),
                "frames_sent": len(selected_frames),
                "seconds_per_frame": SECONDS_PER_FRAME,
                "report_text": report_text,
                "preview_frames": [f"data:image/jpeg;base64,{encode_image(path)}" for path in preview_frames],
            }
        )
    finally:
        shutil.rmtree(workspace, ignore_errors=True)


@app.get("/{path:path}", response_class=FileResponse)
def serve_frontend_file(path: str) -> FileResponse:
    requested = (BASE_DIR / path).resolve()
    if BASE_DIR not in requested.parents and requested != BASE_DIR:
        raise HTTPException(status_code=403, detail="Path is outside the app directory.")
    if not requested.is_file():
        raise HTTPException(status_code=404, detail="Requested file was not found.")
    return FileResponse(requested)
