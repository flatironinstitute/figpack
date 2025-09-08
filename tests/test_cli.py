import json
import pathlib
import tarfile
import tempfile
from unittest.mock import MagicMock, patch

import pytest
import requests

from figpack.cli import (
    download_figure,
    get_figure_base_url,
    download_file,
    view_figure,
    main,
)


def test_get_figure_base_url():
    # Test with /index.html
    assert (
        get_figure_base_url("https://example.com/fig/index.html")
        == "https://example.com/fig/"
    )

    # Test with trailing slash
    assert get_figure_base_url("https://example.com/fig/") == "https://example.com/fig/"

    # Test without trailing elements
    assert get_figure_base_url("https://example.com/fig") == "https://example.com/fig/"


@pytest.fixture
def mock_response():
    mock_resp = MagicMock()
    mock_resp.text = "test content"
    mock_resp.content = b"test content"
    return mock_resp


def test_download_file(mock_response, tmp_path):
    base_url = "https://example.com/fig/"
    file_info = {"path": "test.json", "size": 12}

    with patch("requests.get", return_value=mock_response) as mock_get:
        file_path, success = download_file(base_url, file_info, tmp_path)

        assert success is True
        assert file_path == "test.json"
        downloaded_file = tmp_path / "test.json"
        assert downloaded_file.exists()
        assert downloaded_file.read_text() == "test content"

        mock_get.assert_called_once_with(
            "https://example.com/fig/test.json", timeout=30
        )


def test_download_file_binary(mock_response, tmp_path):
    base_url = "https://example.com/fig/"
    file_info = {"path": "test.dat", "size": 12}

    with patch("requests.get", return_value=mock_response) as mock_get:
        file_path, success = download_file(base_url, file_info, tmp_path)

        assert success is True
        assert file_path == "test.dat"
        downloaded_file = tmp_path / "test.dat"
        assert downloaded_file.exists()
        assert downloaded_file.read_bytes() == b"test content"


def test_download_file_empty_response(tmp_path):
    base_url = "https://example.com/fig/"
    file_info = {"path": "test.json", "size": 12}

    mock_resp = MagicMock()
    mock_resp.text = ""
    mock_resp.content = b""

    with patch("requests.get", return_value=mock_resp):
        file_path, success = download_file(base_url, file_info, tmp_path)
        assert success is True
        downloaded_file = tmp_path / "test.json"
        assert downloaded_file.exists()
        assert downloaded_file.read_text() == ""


def test_download_file_failure(tmp_path):
    base_url = "https://example.com/fig/"
    file_info = {"path": "test.json", "size": 12}

    with patch("requests.get", side_effect=requests.exceptions.RequestException):
        file_path, success = download_file(base_url, file_info, tmp_path)

        assert success is False
        assert file_path == "test.json"
        downloaded_file = tmp_path / "test.json"
        assert not downloaded_file.exists()


@pytest.fixture
def mock_manifest():
    return {
        "files": [
            {"path": "index.html", "size": 100},
            {"path": "data/test.json", "size": 200},
        ]
    }


@pytest.fixture
def mock_manifest_response():
    mock_resp = MagicMock()
    mock_resp.json.return_value = {
        "files": [
            {"path": "index.html", "size": 100},
            {"path": "data/test.json", "size": 200},
        ]
    }
    return mock_resp


def test_download_figure(mock_manifest_response, mock_response, tmp_path):
    dest_path = str(tmp_path / "figure.tar.gz")

    with patch("requests.get") as mock_get:
        # Set up mock responses for manifest and file downloads
        mock_get.side_effect = [mock_manifest_response, mock_response, mock_response]

        # Run download
        download_figure("https://example.com/fig", dest_path)

        # Verify tar.gz was created
        assert pathlib.Path(dest_path).exists()

        # Verify contents
        with tarfile.open(dest_path, "r:gz") as tar:
            files = tar.getnames()
            assert "index.html" in files
            assert "data/test.json" in files
            assert "manifest.json" in files


def test_download_figure_manifest_error():
    with patch(
        "requests.get", side_effect=requests.exceptions.RequestException
    ), pytest.raises(SystemExit) as excinfo:
        download_figure("https://example.com/fig", "test.tar.gz")
    assert excinfo.value.code == 1


def test_download_figure_invalid_manifest():
    mock_resp = MagicMock()
    mock_resp.json.side_effect = json.JSONDecodeError("Invalid JSON", "{", 0)

    with patch("requests.get", return_value=mock_resp), pytest.raises(
        SystemExit
    ) as excinfo:
        download_figure("https://example.com/fig", "test.tar.gz")
    assert excinfo.value.code == 1


def test_download_figure_all_files_failed(mock_manifest_response, tmp_path):
    dest_path = str(tmp_path / "figure.tar.gz")

    with patch("requests.get") as mock_get:
        # Return manifest but make all file downloads fail
        mock_get.side_effect = [mock_manifest_response] + [
            requests.exceptions.RequestException()
        ] * len(mock_manifest_response.json()["files"])

        with pytest.raises(SystemExit) as excinfo:
            download_figure("https://example.com/fig", dest_path)
        assert excinfo.value.code == 1
        assert not pathlib.Path(dest_path).exists()


def test_view_figure_invalid_archive():
    with pytest.raises(SystemExit) as excinfo:
        view_figure("nonexistent.tar.gz")
    assert excinfo.value.code == 1


def test_view_figure_wrong_extension():
    with tempfile.NamedTemporaryFile(suffix=".txt") as tmp_file:
        with pytest.raises(SystemExit) as excinfo:
            view_figure(tmp_file.name)
        assert excinfo.value.code == 1


def test_view_figure_invalid_archive_format(tmp_path):
    # Create an invalid tar.gz file
    invalid_archive = tmp_path / "invalid.tar.gz"
    invalid_archive.write_text("Not a tar.gz file")

    with pytest.raises(SystemExit) as excinfo:
        view_figure(str(invalid_archive))
    assert excinfo.value.code == 1


def test_main_download(mock_manifest_response, mock_response, tmp_path):
    dest_path = str(tmp_path / "figure.tar.gz")

    with patch(
        "sys.argv", ["figpack", "download", "https://example.com/fig", dest_path]
    ), patch("requests.get") as mock_get:
        # Set up mock responses
        mock_get.side_effect = [mock_manifest_response, mock_response, mock_response]

        main()

        assert pathlib.Path(dest_path).exists()


def test_main_help():
    with patch("sys.argv", ["figpack"]):
        main()  # Should just print help and return normally
