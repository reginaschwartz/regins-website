import pytest
from fastapi.testclient import TestClient

from app import main
from app.llm import TemplateBackend

JOB = "Senior backend engineer working on Java, Spring Boot and Kafka on Kubernetes."
RESUME = "Technical lead with 15 years of Java, Spring Boot, Kafka and Kubernetes."


@pytest.fixture
def client(tmp_path, monkeypatch):
    from app.tools import Workspace

    monkeypatch.setattr(main, "workspace", Workspace(tmp_path))
    monkeypatch.setattr(main, "_backend", TemplateBackend())
    return TestClient(main.app)


def test_healthz(client):
    body = client.get("/pyapi/healthz").json()

    assert body["status"] == "ok"
    assert body["backend"] == "template"


def test_cover_letter_returns_a_download_url(client):
    response = client.post(
        "/pyapi/cover-letter",
        json={"jobDescription": JOB, "resumeText": RESUME, "label": "Acme"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["letter"]
    assert body["downloadUrl"].startswith("/pyapi/artifacts/")
    assert body["archive"]["bytes"] > 0

    download = client.get(body["downloadUrl"])
    assert download.status_code == 200
    assert download.headers["content-type"] == "application/zip"


def test_short_input_is_rejected(client):
    response = client.post(
        "/pyapi/cover-letter", json={"jobDescription": "too short", "resumeText": RESUME}
    )

    assert response.status_code == 422


def test_artifact_traversal_is_blocked(client):
    assert client.get("/pyapi/artifacts/..%2F..%2Fetc%2Fpasswd").status_code in {400, 404}
