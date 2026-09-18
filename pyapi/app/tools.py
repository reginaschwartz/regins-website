import shutil
import zipfile
from collections.abc import Callable
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path
from typing import Any


class ToolError(RuntimeError):
    pass


@dataclass(frozen=True)
class Tool:
    name: str
    description: str
    parameters: dict[str, str]
    run: Callable[..., dict[str, Any]]

    def catalogue_entry(self) -> str:
        args = ", ".join(f"{k}: {v}" for k, v in self.parameters.items()) or "none"
        return f"- {self.name}({args}) — {self.description}"


class Workspace:
    """Filesystem side of the agent. Every path is confined to `root`."""

    def __init__(self, root: Path, clock: Callable[[], datetime] = datetime.now) -> None:
        self.root = Path(root).resolve()
        self.root.mkdir(parents=True, exist_ok=True)
        self._clock = clock

    def today(self) -> date:
        return self._clock().date()

    def _inside(self, candidate: Path) -> Path:
        resolved = (self.root / candidate).resolve() if not candidate.is_absolute() else candidate.resolve()
        if resolved != self.root and self.root not in resolved.parents:
            raise ToolError(f"path escapes the workspace: {candidate}")
        return resolved

    def create_dated_folder(self, label: str = "") -> dict[str, Any]:
        stamp = self.today().isoformat()
        suffix = _slug(label)
        folder = self._inside(Path(f"{stamp}-{suffix}" if suffix else stamp))
        folder.mkdir(parents=True, exist_ok=True)
        return {"folder": str(folder), "name": folder.name}

    def save_cover_letter(self, text: str, filename: str = "cover-letter.txt") -> dict[str, Any]:
        staging = self._inside(Path("staging"))
        staging.mkdir(parents=True, exist_ok=True)
        document = self._inside(staging / _safe_name(filename))
        document.write_text(text, encoding="utf-8")
        return {"document": str(document), "bytes": document.stat().st_size}

    def copy_document(self, document: str, folder: str) -> dict[str, Any]:
        source = self._inside(Path(document))
        target_dir = self._inside(Path(folder))
        if not source.is_file():
            raise ToolError(f"no document at {document}")
        target_dir.mkdir(parents=True, exist_ok=True)
        target = target_dir / source.name
        shutil.copy2(source, target)
        return {"copied_to": str(target)}

    def zip_folder(self, folder: str) -> dict[str, Any]:
        target_dir = self._inside(Path(folder))
        if not target_dir.is_dir():
            raise ToolError(f"no folder at {folder}")

        archive = self._inside(Path(f"{target_dir.name}.zip"))
        with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as bundle:
            for item in sorted(target_dir.rglob("*")):
                if item.is_file():
                    bundle.write(item, item.relative_to(target_dir.parent))

        return {
            "archive": str(archive),
            "name": archive.name,
            "bytes": archive.stat().st_size,
        }

    def resolve_artifact(self, name: str) -> Path:
        return self._inside(Path(_safe_name(name)))


def _slug(value: str) -> str:
    cleaned = "".join(char if char.isalnum() else "-" for char in value.lower())
    return "-".join(part for part in cleaned.split("-") if part)[:40]


def _safe_name(value: str) -> str:
    """A bare file name. Rejects rather than silently stripping directories."""
    name = Path(value).name
    if not name or name in {".", ".."} or name != value:
        raise ToolError(f"unusable filename: {value}")
    return name


def build_registry(workspace: Workspace) -> dict[str, Tool]:
    tools = [
        Tool(
            name="create_dated_folder",
            description="Create a folder named after the execution date.",
            parameters={"label": "optional suffix, e.g. the company name"},
            run=workspace.create_dated_folder,
        ),
        Tool(
            name="save_cover_letter",
            description="Write the cover letter to a document.",
            parameters={"text": "letter body", "filename": "optional file name"},
            run=workspace.save_cover_letter,
        ),
        Tool(
            name="copy_document",
            description="Copy the cover letter document into the dated folder.",
            parameters={"document": "source path", "folder": "destination folder"},
            run=workspace.copy_document,
        ),
        Tool(
            name="zip_folder",
            description="Zip the dated folder together with the cover letter.",
            parameters={"folder": "folder to archive"},
            run=workspace.zip_folder,
        ),
    ]
    return {tool.name: tool for tool in tools}


def catalogue(registry: dict[str, Tool]) -> str:
    return "\n".join(tool.catalogue_entry() for tool in registry.values())
