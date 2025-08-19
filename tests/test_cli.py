"""
Tests for figpack CLI module
"""

import json
import pathlib
import sys
import tarfile
import tempfile
from io import StringIO
from unittest.mock import MagicMock, Mock, patch

import pytest

from figpack.cli import (
    download_figure,
    download_file,
    get_figure_base_url,
    main,
    view_figure,
)


class TestGetFigureBaseUrl:
    """Test get_figure_base_url function"""

    def test_url_with_index_html(self):
        """Test URL that ends with /index.html"""
        url = "https://example.com/figure/index.html"
        result = get_figure_base_url(url)
        assert result == "https://example.com/figure/"

    def test_url_with_trailing_slash(self):
        """Test URL that ends with trailing slash"""
        url = "https://example.com/figure/"
        result = get_figure_base_url(url)
        assert result == "https://example.com/figure/"

    def test_url_without_trailing_slash(self):
        """Test URL without trailing slash"""
        url = "https://example.com/figure"
        result = get_figure_base_url(url)
        assert result == "https://example.com/figure/"

    def test_complex_url(self):
        """Test complex URL with query parameters"""
        url = "https://figpack.example.com/figures/abc123/index.html"
        result = get_figure_base_url(url)
        assert result == "https://figpack.example.com/figures/abc123/"


class TestDownloadFile:
    """Test download_file function"""

    @patch("figpack.cli.requests.get")
    def test_download_text_file_success(self, mock_get):
        """Test successful download of text file"""
        # Mock response
        mock_response = Mock()
        mock_response.text = '{"test": "data"}'
        mock_response.content = b'{"test": "data"}'
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response

        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = pathlib.Path(temp_dir)
            file_info = {"path": "test.json", "size": 100}

            result_path, success = download_file(
                "https://example.com/", file_info, temp_path
            )

            assert success is True
            assert result_path == "test.json"

            # Check file was created
            downloaded_file = temp_path / "test.json"
            assert downloaded_file.exists()
            assert downloaded_file.read_text() == '{"test": "data"}'

    @patch("figpack.cli.requests.get")
    def test_download_binary_file_success(self, mock_get):
        """Test successful download of binary file"""
        # Mock response
        mock_response = Mock()
        mock_response.content = b"binary data"
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response

        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = pathlib.Path(temp_dir)
            file_info = {"path": "test.bin", "size": 100}

            result_path, success = download_file(
                "https://example.com/", file_info, temp_path
            )

            assert success is True
            assert result_path == "test.bin"

            # Check file was created
            downloaded_file = temp_path / "test.bin"
            assert downloaded_file.exists()
            assert downloaded_file.read_bytes() == b"binary data"

    @patch("figpack.cli.requests.get")
    def test_download_file_failure(self, mock_get):
        """Test download failure"""
        # Mock failed response
        mock_get.side_effect = Exception("Network error")

        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = pathlib.Path(temp_dir)
            file_info = {"path": "test.json", "size": 100}

            result_path, success = download_file(
                "https://example.com/", file_info, temp_path
            )

            assert success is False
            assert result_path == "test.json"

    @patch("figpack.cli.requests.get")
    def test_download_file_with_subdirectory(self, mock_get):
        """Test download file in subdirectory"""
        # Mock response
        mock_response = Mock()
        mock_response.text = "test content"
        mock_response.content = b"test content"
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response

        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = pathlib.Path(temp_dir)
            file_info = {"path": "subdir/test.txt", "size": 100}

            result_path, success = download_file(
                "https://example.com/", file_info, temp_path
            )

            assert success is True
            assert result_path == "subdir/test.txt"

            # Check file and directory were created
            downloaded_file = temp_path / "subdir" / "test.txt"
            assert downloaded_file.exists()
            assert downloaded_file.read_text() == "test content"


class TestDownloadFigure:
    """Test download_figure function"""

    @patch("figpack.cli.requests.get")
    def test_download_figure_success(self, mock_get):
        """Test successful figure download"""
        # Mock manifest response
        manifest_data = {
            "files": [
                {"path": "index.html", "size": 1000},
                {"path": "data.json", "size": 500},
            ]
        }

        mock_response = Mock()
        mock_response.json.return_value = manifest_data
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response

        with tempfile.TemporaryDirectory() as temp_dir:
            dest_path = pathlib.Path(temp_dir) / "test.tar.gz"

            # Mock the entire parallel download section
            with patch("figpack.cli.ThreadPoolExecutor") as mock_executor_class:
                with patch("figpack.cli.as_completed") as mock_as_completed:
                    with patch("figpack.cli.tarfile.open") as mock_tarfile:
                        # Setup executor mock
                        mock_executor = MagicMock()
                        mock_executor_class.return_value.__enter__.return_value = (
                            mock_executor
                        )

                        # Setup future mocks
                        mock_future1 = Mock()
                        mock_future1.result.return_value = ("index.html", True)
                        mock_future2 = Mock()
                        mock_future2.result.return_value = ("data.json", True)

                        mock_executor.submit.side_effect = [mock_future1, mock_future2]
                        mock_as_completed.return_value = [mock_future1, mock_future2]

                        # Setup tarfile mock
                        mock_tar = Mock()
                        mock_tarfile.return_value.__enter__.return_value = mock_tar

                        # This should not raise an exception
                        download_figure("https://example.com/figure/", str(dest_path))

                        # Verify manifest was requested
                        mock_get.assert_called()
                        # Verify tarfile operations
                        mock_tarfile.assert_called_once()

    @patch("figpack.cli.requests.get")
    def test_download_figure_manifest_not_found(self, mock_get):
        """Test download when manifest is not found"""
        # Mock failed manifest response - use requests.exceptions.RequestException
        import requests

        mock_get.side_effect = requests.exceptions.RequestException("404 Not Found")

        with tempfile.TemporaryDirectory() as temp_dir:
            dest_path = pathlib.Path(temp_dir) / "test.tar.gz"

            with pytest.raises(SystemExit):
                download_figure("https://example.com/figure/", str(dest_path))


class TestViewFigure:
    """Test view_figure function"""

    def test_view_figure_file_not_found(self):
        """Test view_figure with non-existent file"""
        with pytest.raises(SystemExit):
            view_figure("nonexistent.tar.gz")

    def test_view_figure_wrong_extension(self):
        """Test view_figure with wrong file extension"""
        with tempfile.NamedTemporaryFile(suffix=".txt") as temp_file:
            with pytest.raises(SystemExit):
                view_figure(temp_file.name)

    @patch("figpack.cli.serve_files")
    @patch("figpack.cli.tarfile.open")
    def test_view_figure_success(self, mock_tarfile, mock_serve):
        """Test successful figure viewing"""
        # Create a temporary tar.gz file
        with tempfile.NamedTemporaryFile(suffix=".tar.gz", delete=False) as temp_file:
            temp_path = pathlib.Path(temp_file.name)

            try:
                # Mock tarfile extraction
                mock_tar = Mock()
                mock_tarfile.return_value.__enter__.return_value = mock_tar
                mock_tar.extractall.return_value = None

                # Mock serve_files to avoid actually starting a server
                mock_serve.return_value = None

                view_figure(str(temp_path))

                # Verify tarfile.open was called
                mock_tarfile.assert_called_once()

                # Verify serve_files was called
                mock_serve.assert_called_once()

            finally:
                # Clean up
                temp_path.unlink()


class TestMain:
    """Test main CLI function"""

    def test_main_no_args(self):
        """Test main with no arguments shows help"""
        with patch("sys.argv", ["figpack"]):
            with patch("sys.stdout", new_callable=StringIO) as mock_stdout:
                # The main function prints help but doesn't exit when no args provided
                main()
                # Verify that help was printed (should contain usage information)
                output = mock_stdout.getvalue()
                assert "usage:" in output.lower() or "figpack" in output

    def test_main_version(self):
        """Test main with --version flag"""
        with patch("sys.argv", ["figpack", "--version"]):
            with pytest.raises(SystemExit) as exc_info:
                main()
            # Version should exit with code 0
            assert exc_info.value.code == 0

    @patch("figpack.cli.download_figure")
    def test_main_download_command(self, mock_download):
        """Test main with download command"""
        with patch(
            "sys.argv", ["figpack", "download", "https://example.com", "output.tar.gz"]
        ):
            main()
            mock_download.assert_called_once_with(
                "https://example.com", "output.tar.gz"
            )

    @patch("figpack.cli.view_figure")
    def test_main_view_command(self, mock_view):
        """Test main with view command"""
        with patch("sys.argv", ["figpack", "view", "test.tar.gz"]):
            main()
            mock_view.assert_called_once_with("test.tar.gz", port=None)

    @patch("figpack.cli.view_figure")
    def test_main_view_command_with_port(self, mock_view):
        """Test main with view command and port"""
        with patch("sys.argv", ["figpack", "view", "test.tar.gz", "--port", "8080"]):
            main()
            mock_view.assert_called_once_with("test.tar.gz", port=8080)
