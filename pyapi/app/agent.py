import json
import logging
import re
from dataclasses import dataclass, field
from typing import Any

from .prompts import TOOL_PROMPT, build_context
from .tools import Tool, ToolError, Workspace, build_registry, catalogue

log = logging.getLogger(__name__)

# Used whenever the model does not return a usable plan, which is the common
# case for the small instruct models this service is meant to run on CPU.
DEFAULT_PLAN = ["save_cover_letter", "create_dated_folder", "copy_document", "zip_folder"]

_JSON_BLOCK = re.compile(r"\[.*?\]", re.DOTALL)


@dataclass
class Step:
    tool: str
    arguments: dict[str, Any]
    result: dict[str, Any] | None = None
    error: str | None = None

    def as_dict(self) -> dict[str, Any]:
        return {
            "tool": self.tool,
            "arguments": {k: _truncate(v) for k, v in self.arguments.items()},
            "result": self.result,
            "error": self.error,
        }


@dataclass
class AgentRun:
    letter: str
    backend: str
    planned_by: str
    steps: list[Step] = field(default_factory=list)
    archive: dict[str, Any] | None = None

    def as_dict(self) -> dict[str, Any]:
        return {
            "letter": self.letter,
            "backend": self.backend,
            "plannedBy": self.planned_by,
            "steps": [step.as_dict() for step in self.steps],
            "archive": self.archive,
        }


def parse_tool_calls(raw: str, registry: dict[str, Tool]) -> list[str]:
    """Pull an ordered list of known tool names out of a model response."""
    match = _JSON_BLOCK.search(raw or "")
    if not match:
        return []

    try:
        payload = json.loads(match.group(0))
    except json.JSONDecodeError:
        return []

    names: list[str] = []
    for entry in payload if isinstance(payload, list) else []:
        name = entry.get("tool") if isinstance(entry, dict) else entry
        if isinstance(name, str) and name in registry and name not in names:
            names.append(name)
    return names


def _plan(backend, registry: dict[str, Tool]) -> tuple[list[str], str]:
    try:
        raw = backend.generate(TOOL_PROMPT.format(tool_catalogue=catalogue(registry)))
    except Exception as error:  # noqa: BLE001 - planning is best effort
        log.warning("tool planning failed: %s", error)
        return DEFAULT_PLAN, "default"

    names = parse_tool_calls(raw, registry)
    if not names:
        return DEFAULT_PLAN, "default"

    # Archiving only makes sense in dependency order, so keep the model's
    # selection but not its ordering.
    ordered = [name for name in DEFAULT_PLAN if name in names]
    return ordered or DEFAULT_PLAN, "model"


def _arguments(name: str, state: dict[str, Any]) -> dict[str, Any]:
    if name == "save_cover_letter":
        return {"text": state["letter"]}
    if name == "create_dated_folder":
        return {"label": state.get("label", "")}
    if name == "copy_document":
        return {"document": state.get("document", ""), "folder": state.get("folder", "")}
    if name == "zip_folder":
        return {"folder": state.get("folder", "")}
    return {}


def run_agent(
    job_description: str,
    resume_text: str,
    *,
    backend,
    workspace: Workspace,
    label: str = "",
) -> AgentRun:
    registry = build_registry(workspace)

    letter = backend.generate(build_context(job_description, resume_text)).strip()
    if not letter:
        raise ToolError("the model returned an empty cover letter")

    plan, planned_by = _plan(backend, registry)
    run = AgentRun(letter=letter, backend=backend.name, planned_by=planned_by)
    state: dict[str, Any] = {"letter": letter, "label": label}

    for name in plan:
        tool = registry[name]
        arguments = _arguments(name, state)
        step = Step(tool=name, arguments=arguments)

        try:
            step.result = tool.run(**arguments)
            state.update(step.result)
            if name == "zip_folder":
                run.archive = step.result
        except (ToolError, OSError) as error:
            step.error = str(error)
            log.warning("tool %s failed: %s", name, error)

        run.steps.append(step)

    return run


def _truncate(value: Any, limit: int = 120) -> Any:
    if isinstance(value, str) and len(value) > limit:
        return f"{value[:limit]}…"
    return value
