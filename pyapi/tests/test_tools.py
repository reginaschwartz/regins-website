import zipfile
from datetime import datetime

import pytest

from app.tools import ToolError, Workspace, build_registry, catalogue


@pytest.fixture
def workspace(tmp_path):
    return Workspace(tmp_path, clock=lambda: datetime(2026, 9, 11, 13, 30))


def test_dated_folder_is_named_after_the_execution_date(workspace):
    result = workspace.create_dated_folder()

    assert result["name"] == "2026-09-11"
    assert (workspace.root / "2026-09-11").is_dir()


def test_dated_folder_appends_a_slugged_label(workspace):
    result = workspace.create_dated_folder("Acme Payments!")

    assert result["name"] == "2026-09-11-acme-payments"


def test_copy_then_zip_bundles_the_cover_letter(workspace):
    document = workspace.save_cover_letter("Dear Hiring Manager")["document"]
    folder = workspace.create_dated_folder()["folder"]
    workspace.copy_document(document, folder)

    archive = workspace.zip_folder(folder)

    with zipfile.ZipFile(archive["archive"]) as bundle:
        assert bundle.namelist() == ["2026-09-11/cover-letter.txt"]
        assert bundle.read("2026-09-11/cover-letter.txt").decode() == "Dear Hiring Manager"


def test_paths_cannot_escape_the_workspace(workspace):
    with pytest.raises(ToolError):
        workspace.copy_document("../../etc/passwd", str(workspace.root))

    with pytest.raises(ToolError):
        workspace.save_cover_letter("x", filename="../escape.txt")


def test_copying_a_missing_document_is_reported(workspace):
    folder = workspace.create_dated_folder()["folder"]

    with pytest.raises(ToolError):
        workspace.copy_document(str(workspace.root / "nope.txt"), folder)


def test_catalogue_lists_every_tool(workspace):
    registry = build_registry(workspace)
    text = catalogue(registry)

    for name in ["create_dated_folder", "save_cover_letter", "copy_document", "zip_folder"]:
        assert name in text
