import json
import pathlib
import tarfile
import tempfile
from unittest import mock
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


def test_view_figure_invalid_archive():
    with pytest.raises(SystemExit) as excinfo:
        view_figure("nonexistent.tar.gz")
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


def test_main_view(tmp_path):
    archive_path = tmp_path / "test.tar.gz"

    # Create a simple test archive
    with tarfile.open(archive_path, "w:gz") as tar:
        temp_file = tmp_path / "index.html"
        temp_file.write_text("<html>Test</html>")
        tar.add(temp_file, arcname="index.html")

    with patch("sys.argv", ["figpack", "view", str(archive_path)]), patch(
        "figpack.cli.serve_files"
    ) as mock_serve:
        main()
        mock_serve.assert_called_once()


def test_main_help():
    with patch("sys.argv", ["figpack"]):
        main()  # Should just print help and return normally
