import os
from dataclasses import dataclass, field
from pathlib import Path


def _split(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


@dataclass(frozen=True)
class Settings:
    # "auto" loads the Hugging Face model and silently falls back to the
    # deterministic composer when weights or memory are unavailable.
    backend: str = os.getenv("COVER_LETTER_BACKEND", "auto")
    model_id: str = os.getenv("COVER_LETTER_MODEL", "Qwen/Qwen2.5-0.5B-Instruct")
    device: str = os.getenv("COVER_LETTER_DEVICE", "auto")
    max_new_tokens: int = int(os.getenv("COVER_LETTER_MAX_NEW_TOKENS", "220"))
    temperature: float = float(os.getenv("COVER_LETTER_TEMPERATURE", "0.7"))
    artifact_root: Path = Path(
        os.getenv("COVER_LETTER_ARTIFACT_ROOT", "/tmp/cover-letters")
    )
    max_input_chars: int = int(os.getenv("COVER_LETTER_MAX_INPUT_CHARS", "20000"))
    allowed_origins: list[str] = field(
        default_factory=lambda: _split(
            os.getenv(
                "COVER_LETTER_ALLOWED_ORIGINS",
                "https://testec2.rinatschwartz770.xyz,http://localhost:3000,http://127.0.0.1:3000,http://localhost:8000,http://127.0.0.1:8000",
            )
        )
    )


settings = Settings()
