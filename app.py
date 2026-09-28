import os
import tempfile
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from faster_whisper import WhisperModel

MODEL_SIZE = os.getenv("WHISPER_MODEL", "small")
MAX_MB = int(os.getenv("MAX_UPLOAD_MB", "100"))
ALLOWED = {".mp3", ".wav", ".mp4", ".ogg", ".opus", ".flac", ".aac", ".webm", ".m4a", ".mov", ".mkv"}

app = FastAPI(title="Audio to Text")
model = WhisperModel(MODEL_SIZE, compute_type="int8")

BASE = Path(__file__).parent

@app.post("/api/transcribe")
async def transcribe(file: UploadFile = File(...), language: str = Form("auto")):
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED:
        raise HTTPException(400, f"Unsupported file type. Only {', '.join(sorted(ALLOWED))}")

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        size = 0
        while chunk := await file.read(1024 * 1024):
            size += len(chunk)
            if size > MAX_MB * 1024 * 1024:
                tmp.close()
                os.unlink(tmp.name)
                raise HTTPException(413, f"File is larger than {MAX_MB}MBs")
            tmp.write(chunk)
        path = tmp.name

    try:
        segments, info = model.transcribe(
            path,
            language=None if language == "auto" else language,
            vad_filter=True,
        )
        segs = [{"start": s.start, "end": s.end, "text": s.text.strip()} for s in segments]
    except Exception:
        raise HTTPException(500, "Can't read audio")
    finally:
        os.unlink(path)

    return {
        "language": info.language,
        "duration": info.duration,
        "text": " ".join(s["text"] for s in segs),
        "segments": segs,
    }

@app.get("/")
def index():
    return FileResponse(BASE / "static" / "index.html")

app.mount("/static", StaticFiles(directory=BASE / "static"), name="static")