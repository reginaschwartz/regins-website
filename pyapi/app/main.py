import logging
import threading

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from .agent import run_agent
from .config import settings
from .llm import load_backend
from .prompts import SYSTEM_PROMPT, USER_PROMPT
from .tools import ToolError, Workspace

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

app = FastAPI(title="Cover letter agent", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

workspace = Workspace(settings.artifact_root)

_backend = None
_backend_lock = threading.Lock()


def get_backend():
    """Loaded on first use: model download must not block startup or /healthz."""
    global _backend
    if _backend is None:
        with _backend_lock:
            if _backend is None:
                _backend = load_backend(settings)
    return _backend


class CoverLetterRequest(BaseModel):
    job_description: str = Field(min_length=20, alias="jobDescription")
    resume_text: str = Field(min_length=20, alias="resumeText")
    label: str = Field(default="", max_length=60)

    model_config = {"populate_by_name": True}


class CoverLetterResponse(BaseModel):
    letter: str
    backend: str
    plannedBy: str
    steps: list[dict]
    archive: dict | None
    downloadUrl: str | None


@app.get("/pyapi/healthz")
def healthz() -> dict:
    return {
        "status": "ok",
        "backend": _backend.name if _backend else "not loaded",
        "configuredBackend": settings.backend,
        "model": settings.model_id,
        "artifactRoot": str(workspace.root),
    }


@app.get("/pyapi/prompts")
def prompts() -> dict:
    return {"system": SYSTEM_PROMPT, "user": USER_PROMPT}


@app.post("/pyapi/cover-letter", response_model=CoverLetterResponse)
def cover_letter(request: CoverLetterRequest) -> CoverLetterResponse:
    if len(request.job_description) > settings.max_input_chars:
        raise HTTPException(413, "job description is too long")
    if len(request.resume_text) > settings.max_input_chars:
        raise HTTPException(413, "resume is too long")

    try:
        run = run_agent(
            request.job_description,
            request.resume_text,
            backend=get_backend(),
            workspace=workspace,
            label=request.label,
        )
    except ToolError as error:
        raise HTTPException(502, str(error)) from error

    payload = run.as_dict()
    archive = payload.get("archive")
    payload["downloadUrl"] = (
        f"/pyapi/artifacts/{archive['name']}" if archive else None
    )
    return CoverLetterResponse(**payload)


@app.get("/pyapi/artifacts/{name}")
def artifact(name: str) -> FileResponse:
    try:
        path = workspace.resolve_artifact(name)
    except ToolError as error:
        raise HTTPException(400, str(error)) from error

    if not path.is_file():
        raise HTTPException(404, "no such archive")

    return FileResponse(path, media_type="application/zip", filename=path.name)
