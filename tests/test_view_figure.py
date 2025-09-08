import os
import pathlib
import socket
import tarfile
import tempfile
from unittest.mock import patch

import pytest

from figpack.core._view_figure import serve_files, view_figure


def test_serve_files_finds_free_port():
    """Test that serve_files can find a free port when none is specified"""
    with tempfile.TemporaryDirectory() as tmpdir:
        # Mock input to avoid hanging
        with patch("builtins.input", side_effect=KeyboardInterrupt):
            serve_files(tmpdir, port=None, open_in_browser=False)


def test_serve_files_uses_specified_port():
    """Test that serve_files uses the specified port"""
    # Find a free port first
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("", 0))
        port = s.getsockname()[1]

    with tempfile.TemporaryDirectory() as tmpdir:
        # Mock input to avoid hanging
        with patch("builtins.input", side_effect=KeyboardInterrupt):
            serve_files(tmpdir, port=port, open_in_browser=False)


def test_serve_files_invalid_directory():
    """Test that serve_files raises SystemExit for invalid directory"""
    with pytest.raises(SystemExit):
        serve_files("/nonexistent/dir", port=0)


@patch("webbrowser.open")
def test_serve_files_browser_opening(mock_browser_open):
    """Test that serve_files opens browser when requested"""
    with tempfile.TemporaryDirectory() as tmpdir:
        with patch("builtins.input", side_effect=KeyboardInterrupt):
            serve_files(tmpdir, port=0, open_in_browser=True)
            mock_browser_open.assert_called_once()


def test_view_figure_nonexistent_file():
    """Test that view_figure handles nonexistent files"""
    with pytest.raises(SystemExit):
        view_figure("/nonexistent/figure.tar.gz")


def test_view_figure_invalid_extension():
    """Test that view_figure validates file extensions"""
    with tempfile.NamedTemporaryFile(suffix=".txt") as tmp_file:
        with pytest.raises(SystemExit):
            view_figure(tmp_file.name)


@patch("figpack.core._view_figure.serve_files")
def test_view_figure_directory(mock_serve_files):
    """Test that view_figure can handle directories"""
    with tempfile.TemporaryDirectory() as tmpdir:
        view_figure(tmpdir)
        mock_serve_files.assert_called_once_with(
            str(pathlib.Path(tmpdir)),
            port=None,
            open_in_browser=True,
            allow_origin=None,
        )


@patch("figpack.core._view_figure.serve_files")
def test_view_figure_tar_archive(mock_serve_files):
    """Test that view_figure can handle tar archives"""
    with tempfile.TemporaryDirectory() as tmpdir:
        # Create a simple tar.gz archive
        archive_path = os.path.join(tmpdir, "test.tar.gz")
        with tarfile.open(archive_path, "w:gz") as tar:
            test_file = os.path.join(tmpdir, "test.txt")
            with open(test_file, "w") as f:
                f.write("test content")
            tar.add(test_file, arcname="test.txt")

        view_figure(archive_path)
        mock_serve_files.assert_called_once()


@patch("figpack.core._view_figure.serve_files")
def test_view_figure_with_index_html(mock_serve_files):
    """Test that view_figure handles archives with index.html"""
    with tempfile.TemporaryDirectory() as tmpdir:
        # Create a tar.gz archive with index.html
        archive_path = os.path.join(tmpdir, "test.tar.gz")
        with tarfile.open(archive_path, "w:gz") as tar:
            index_file = os.path.join(tmpdir, "index.html")
            with open(index_file, "w") as f:
                f.write("<html><body>Test</body></html>")
            tar.add(index_file, arcname="index.html")

        view_figure(archive_path)
        mock_serve_files.assert_called_once()


def test_view_figure_corrupt_archive():
    """Test that view_figure handles corrupt archives"""
    with tempfile.NamedTemporaryFile(suffix=".tar.gz") as tmp_file:
        tmp_file.write(b"not a valid tar.gz file")
        tmp_file.flush()

        with pytest.raises(SystemExit):
            view_figure(tmp_file.name)
