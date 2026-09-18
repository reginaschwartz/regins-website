import zipfile
from datetime import datetime

import pytest

from app.agent import DEFAULT_PLAN, parse_tool_calls, run_agent
from app.llm import TemplateBackend
from app.prompts import build_context
from app.tools import Workspace, build_registry

JOB = "Senior backend engineer working on Java, Spring Boot and Kafka on Kubernetes."
RESUME = "Technical lead with 15 years of Java, Spring Boot, Kafka and Kubernetes."


class ScriptedBackend:
    name = "scripted"

    def __init__(self, letter: str, plan: str = "") -> None:
        self._letter = letter
        self._plan = plan
        self.prompts: list[str] = []

    def generate(self, context: str) -> str:
        self.prompts.append(context)
        return self._plan if "Available tools" in context else self._letter


@pytest.fixture
def workspace(tmp_path):
    return Workspace(tmp_path, clock=lambda: datetime(2026, 9, 11, 13, 30))


def test_context_carries_both_inputs_and_the_fixed_request():
    context = build_context(JOB, RESUME)

    assert "3-4 lines" in context
    assert JOB in context
    assert RESUME in context


def test_run_produces_a_letter_and_a_zip(workspace):
    run = run_agent(JOB, RESUME, backend=TemplateBackend(), workspace=workspace)

    assert run.letter
    assert [step.tool for step in run.steps] == DEFAULT_PLAN
    assert all(step.error is None for step in run.steps)

    with zipfile.ZipFile(run.archive["archive"]) as bundle:
        assert bundle.namelist() == ["2026-09-11/cover-letter.txt"]


def test_label_flows_into_the_folder_name(workspace):
    run = run_agent(JOB, RESUME, backend=TemplateBackend(), workspace=workspace, label="Acme")

    assert run.archive["name"] == "2026-09-11-acme.zip"


def test_model_chosen_tools_are_honoured_in_dependency_order(workspace):
    plan = '[{"tool": "zip_folder"}, {"tool": "create_dated_folder"}, {"tool": "save_cover_letter"}]'
    backend = ScriptedBackend("A four line letter.", plan)

    run = run_agent(JOB, RESUME, backend=backend, workspace=workspace)

    assert run.planned_by == "model"
    assert [step.tool for step in run.steps] == [
        "save_cover_letter",
        "create_dated_folder",
        "zip_folder",
    ]


def test_unparseable_plan_falls_back_to_the_default(workspace):
    backend = ScriptedBackend("A four line letter.", "I would run all of them, probably.")

    run = run_agent(JOB, RESUME, backend=backend, workspace=workspace)

    assert run.planned_by == "default"
    assert [step.tool for step in run.steps] == DEFAULT_PLAN


def test_parse_tool_calls_ignores_unknown_names(workspace):
    registry = build_registry(workspace)
    raw = '[{"tool": "rm_rf"}, {"tool": "zip_folder"}]'

    assert parse_tool_calls(raw, registry) == ["zip_folder"]


def test_template_backend_mentions_the_interview():
    letter = TemplateBackend().generate(build_context(JOB, RESUME))

    assert "interview" in letter.lower()
    assert 3 <= len(letter.splitlines()) <= 5


def test_template_backend_names_the_role_and_shared_skills():
    letter = TemplateBackend().generate(build_context(JOB, RESUME))

    assert "Senior backend engineer" in letter or "backend engineer" in letter.lower()
    assert "Spring Boot" in letter
    assert "Spring, Boot" not in letter
