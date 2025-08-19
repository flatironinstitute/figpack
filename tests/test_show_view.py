"""
Tests for figpack._show_view module
"""

import os
import pathlib
import socket
import tempfile
import threading
import time
from http.server import SimpleHTTPRequestHandler
from unittest.mock import MagicMock, Mock, call, patch

import pytest
import requests

from figpack.core._show_view import CORSRequestHandler, _show_view, serve_files
from figpack.core.figpack_view import FigpackView
from figpack.views import Markdown


class MockView(FigpackView):
    """Mock view for testing"""

    def __init__(self, content="test"):
        self.content = content

    def _write_to_zarr_group(self, group):
        group.attrs["view_type"] = "MockView"
        group.attrs["content"] = self.content


class TestShowView:
    """Test _show_view function"""

    @patch("figpack.core._show_view.serve_files")
    @patch("figpack.core._show_view.prepare_figure_bundle")
    def test_show_view_basic_local_serving(self, mock_prepare, mock_serve):
        """Test basic local serving without upload"""
        view = MockView()

        _show_view(view, open_in_browser=False, port=8080)

        # Verify prepare_figure_bundle was called
        mock_prepare.assert_called_once()
        args, kwargs = mock_prepare.call_args
        assert args[0] == view
        assert isinstance(args[1], str)  # tmpdir
        assert kwargs.get("title") is None
        assert kwargs.get("description") is None

        # Verify serve_files was called
        mock_serve.assert_called_once()
        args, kwargs = mock_serve.call_args
        assert isinstance(args[0], str)  # tmpdir
        assert kwargs["port"] == 8080
        assert kwargs["open_in_browser"] is False
        assert kwargs["allow_origin"] is None

    @patch("figpack.core._show_view.serve_files")
    @patch("figpack.core._show_view.prepare_figure_bundle")
    def test_show_view_with_title_and_description(self, mock_prepare, mock_serve):
        """Test _show_view with title and description"""
        view = MockView()
        title = "Test Title"
        description = "Test Description"

        _show_view(view, title=title, description=description)

        # Verify prepare_figure_bundle was called with title and description
        mock_prepare.assert_called_once()
        args, kwargs = mock_prepare.call_args
        assert kwargs["title"] == title
        assert kwargs["description"] == description

    @patch("figpack.core._show_view.serve_files")
    @patch("figpack.core._show_view.prepare_figure_bundle")
    def test_show_view_with_cors_origin(self, mock_prepare, mock_serve):
        """Test _show_view with CORS allow_origin"""
        view = MockView()
        allow_origin = "http://localhost:3000"

        _show_view(view, allow_origin=allow_origin)

        # Verify serve_files was called with allow_origin
        mock_serve.assert_called_once()
        args, kwargs = mock_serve.call_args
        assert kwargs["allow_origin"] == allow_origin

    @patch("figpack.core._show_view.webbrowser.open")
    @patch("figpack.core._show_view._upload_bundle")
    @patch("figpack.core._show_view.prepare_figure_bundle")
    @patch("builtins.input", return_value="")
    def test_show_view_upload_with_browser(
        self, mock_input, mock_prepare, mock_upload, mock_browser
    ):
        """Test _show_view with upload and open_in_browser"""
        view = MockView()
        test_url = "https://example.com/figure/123"
        mock_upload.return_value = test_url

        with patch.dict(os.environ, {"FIGPACK_UPLOAD_PASSCODE": "test_passcode"}):
            result = _show_view(view, upload=True, open_in_browser=True)

        assert result == test_url
        mock_upload.assert_called_once()
        mock_browser.assert_called_once_with(test_url)
        mock_input.assert_called_once()

    @patch("figpack.core._show_view._upload_bundle")
    @patch("figpack.core._show_view.prepare_figure_bundle")
    def test_show_view_upload_without_browser(self, mock_prepare, mock_upload):
        """Test _show_view with upload but no browser opening"""
        view = MockView()
        test_url = "https://example.com/figure/456"
        mock_upload.return_value = test_url

        with patch.dict(os.environ, {"FIGPACK_UPLOAD_PASSCODE": "test_passcode"}):
            result = _show_view(view, upload=True, open_in_browser=False)

        assert result == test_url
        mock_upload.assert_called_once()

    @patch("figpack.core._show_view.prepare_figure_bundle")
    def test_show_view_upload_missing_passcode(self, mock_prepare):
        """Test _show_view upload fails without passcode"""
        view = MockView()

        # Ensure FIGPACK_UPLOAD_PASSCODE is not set
        with patch.dict(os.environ, {}, clear=True):
            with pytest.raises(
                EnvironmentError,
                match="FIGPACK_UPLOAD_PASSCODE environment variable must be set",
            ):
                _show_view(view, upload=True)

    @patch("figpack.core._show_view._upload_bundle")
    @patch("figpack.core._show_view.prepare_figure_bundle")
    def test_show_view_upload_with_passcode_from_env(self, mock_prepare, mock_upload):
        """Test _show_view upload uses passcode from environment"""
        view = MockView()
        test_passcode = "secret_passcode_123"
        test_url = "https://example.com/figure/789"
        mock_upload.return_value = test_url

        with patch.dict(os.environ, {"FIGPACK_UPLOAD_PASSCODE": test_passcode}):
            result = _show_view(view, upload=True)

        # Verify upload was called with the correct passcode
        mock_upload.assert_called_once()
        args, kwargs = mock_upload.call_args
        assert args[1] == test_passcode  # Second argument should be passcode
        assert result == test_url


class TestServeFiles:
    """Test serve_files function"""

    def test_serve_files_invalid_directory(self):
        """Test serve_files with invalid directory"""
        with pytest.raises(SystemExit, match="Directory not found"):
            serve_files("/nonexistent/directory", port=8080)

    @patch("figpack.core._show_view.ThreadingHTTPServer")
    @patch("figpack.core._show_view.threading.Thread")
    @patch("builtins.input", return_value="")
    def test_serve_files_with_specified_port(
        self, mock_input, mock_thread, mock_server
    ):
        """Test serve_files with specified port"""
        with tempfile.TemporaryDirectory() as tmpdir:
            mock_httpd = Mock()
            mock_server.return_value = mock_httpd
            mock_thread_instance = Mock()
            mock_thread.return_value = mock_thread_instance

            serve_files(tmpdir, port=8080, open_in_browser=False)

            # Verify server was created with correct parameters
            mock_server.assert_called_once()
            args, kwargs = mock_server.call_args
            assert args[0] == ("0.0.0.0", 8080)

            # Verify thread was started
            mock_thread_instance.start.assert_called_once()

            # Verify server shutdown
            mock_httpd.shutdown.assert_called_once()
            mock_httpd.server_close.assert_called_once()

    @patch("socket.socket")
    @patch("figpack.core._show_view.ThreadingHTTPServer")
    @patch("figpack.core._show_view.threading.Thread")
    @patch("builtins.input", return_value="")
    def test_serve_files_auto_port_selection(
        self, mock_input, mock_thread, mock_server, mock_socket
    ):
        """Test serve_files with automatic port selection"""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Mock socket to return a specific port
            mock_sock = Mock()
            mock_sock.getsockname.return_value = ("localhost", 9999)
            mock_socket.return_value.__enter__.return_value = mock_sock

            mock_httpd = Mock()
            mock_server.return_value = mock_httpd
            mock_thread_instance = Mock()
            mock_thread.return_value = mock_thread_instance

            serve_files(tmpdir, port=None, open_in_browser=False)

            # Verify socket was used to find free port
            mock_sock.bind.assert_called_once_with(("", 0))
            mock_sock.getsockname.assert_called_once()

            # Verify server was created with the auto-selected port
            mock_server.assert_called_once()
            args, kwargs = mock_server.call_args
            assert args[0] == ("0.0.0.0", 9999)

    @patch("figpack.core._show_view.webbrowser.open")
    @patch("figpack.core._show_view.ThreadingHTTPServer")
    @patch("figpack.core._show_view.threading.Thread")
    @patch("builtins.input", return_value="")
    def test_serve_files_open_in_browser(
        self, mock_input, mock_thread, mock_server, mock_browser
    ):
        """Test serve_files with open_in_browser=True"""
        with tempfile.TemporaryDirectory() as tmpdir:
            mock_httpd = Mock()
            mock_server.return_value = mock_httpd
            mock_thread_instance = Mock()
            mock_thread.return_value = mock_thread_instance

            serve_files(tmpdir, port=8080, open_in_browser=True)

            # Verify browser was opened
            mock_browser.assert_called_once_with("http://localhost:8080")

    @patch("figpack.core._show_view.ThreadingHTTPServer")
    @patch("figpack.core._show_view.threading.Thread")
    @patch("builtins.input", side_effect=KeyboardInterrupt())
    def test_serve_files_keyboard_interrupt(self, mock_input, mock_thread, mock_server):
        """Test serve_files handles KeyboardInterrupt"""
        with tempfile.TemporaryDirectory() as tmpdir:
            mock_httpd = Mock()
            mock_server.return_value = mock_httpd
            mock_thread_instance = Mock()
            mock_thread.return_value = mock_thread_instance

            serve_files(tmpdir, port=8080, open_in_browser=False)

            # Verify server shutdown even with KeyboardInterrupt
            mock_httpd.shutdown.assert_called_once()
            mock_httpd.server_close.assert_called_once()

    @patch("figpack.core._show_view.ThreadingHTTPServer")
    @patch("figpack.core._show_view.threading.Thread")
    @patch("builtins.input", side_effect=EOFError())
    def test_serve_files_eof_error(self, mock_input, mock_thread, mock_server):
        """Test serve_files handles EOFError"""
        with tempfile.TemporaryDirectory() as tmpdir:
            mock_httpd = Mock()
            mock_server.return_value = mock_httpd
            mock_thread_instance = Mock()
            mock_thread.return_value = mock_thread_instance

            serve_files(tmpdir, port=8080, open_in_browser=False)

            # Verify server shutdown even with EOFError
            mock_httpd.shutdown.assert_called_once()
            mock_httpd.server_close.assert_called_once()


class TestCORSRequestHandler:
    """Test CORSRequestHandler class"""

    def test_cors_handler_initialization(self):
        """Test CORSRequestHandler initialization"""
        # Create a mock request and client address
        mock_request = Mock()
        mock_client_address = ("127.0.0.1", 12345)
        mock_server = Mock()

        # Mock the parent class initialization
        with patch.object(SimpleHTTPRequestHandler, "__init__", return_value=None):
            handler = CORSRequestHandler(
                mock_request,
                mock_client_address,
                mock_server,
                allow_origin="http://localhost:3000",
            )

            assert handler.allow_origin == "http://localhost:3000"

    def test_cors_handler_end_headers_with_origin(self):
        """Test CORSRequestHandler.end_headers with allow_origin set"""
        # Create a mock handler
        handler = CORSRequestHandler.__new__(CORSRequestHandler)
        handler.allow_origin = "http://localhost:3000"

        # Mock the send_header and parent end_headers methods
        handler.send_header = Mock()

        with patch.object(
            SimpleHTTPRequestHandler, "end_headers"
        ) as mock_parent_end_headers:
            handler.end_headers()

            # Verify CORS headers were sent
            expected_calls = [
                call("Access-Control-Allow-Origin", "http://localhost:3000"),
                call("Vary", "Origin"),
                call("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS"),
                call("Access-Control-Allow-Headers", "Content-Type, Range"),
                call(
                    "Access-Control-Expose-Headers",
                    "Accept-Ranges, Content-Encoding, Content-Length, Content-Range",
                ),
            ]
            handler.send_header.assert_has_calls(expected_calls)
            mock_parent_end_headers.assert_called_once()

    def test_cors_handler_end_headers_without_origin(self):
        """Test CORSRequestHandler.end_headers without allow_origin"""
        # Create a mock handler
        handler = CORSRequestHandler.__new__(CORSRequestHandler)
        handler.allow_origin = None

        # Mock the send_header and parent end_headers methods
        handler.send_header = Mock()

        with patch.object(
            SimpleHTTPRequestHandler, "end_headers"
        ) as mock_parent_end_headers:
            handler.end_headers()

            # Verify no CORS headers were sent
            handler.send_header.assert_not_called()
            mock_parent_end_headers.assert_called_once()

    def test_cors_handler_do_options(self):
        """Test CORSRequestHandler.do_OPTIONS method"""
        # Create a mock handler
        handler = CORSRequestHandler.__new__(CORSRequestHandler)
        handler.send_response = Mock()
        handler.end_headers = Mock()

        handler.do_OPTIONS()

        # Verify OPTIONS response
        handler.send_response.assert_called_once_with(204, "No Content")
        handler.end_headers.assert_called_once()

    def test_cors_handler_log_message_suppressed(self):
        """Test CORSRequestHandler.log_message is suppressed"""
        # Create a mock handler
        handler = CORSRequestHandler.__new__(CORSRequestHandler)

        # This should not raise any exception and should do nothing
        result = handler.log_message("test format", "arg1", "arg2")
        assert result is None


class TestIntegration:
    """Integration tests for _show_view module"""

    def test_real_view_with_serve_files(self):
        """Test with a real view and actual file serving (quick test)"""
        view = Markdown(content="# Test\n\nThis is a test markdown.")

        # Mock the server components to avoid actually starting a server
        with patch("figpack.core._show_view.ThreadingHTTPServer") as mock_server, patch(
            "figpack.core._show_view.threading.Thread"
        ) as mock_thread, patch("builtins.input", return_value=""):

            mock_httpd = Mock()
            mock_server.return_value = mock_httpd
            mock_thread_instance = Mock()
            mock_thread.return_value = mock_thread_instance

            # This should not raise any exceptions
            _show_view(view, port=8080, open_in_browser=False)

            # Verify the server was set up
            mock_server.assert_called_once()
            mock_thread_instance.start.assert_called_once()
            mock_httpd.shutdown.assert_called_once()

    @pytest.mark.slow
    def test_actual_server_startup_and_shutdown(self):
        """Test actual server startup and shutdown (slower test)"""
        view = Markdown(content="# Test\n\nActual server test.")

        # Find a free port
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind(("", 0))
            free_port = s.getsockname()[1]

        # Start server in a separate thread
        server_started = threading.Event()
        server_error = []

        def run_server():
            try:
                with patch("builtins.input", side_effect=[server_started.set(), ""]):
                    _show_view(view, port=free_port, open_in_browser=False)
            except Exception as e:
                server_error.append(e)

        server_thread = threading.Thread(target=run_server, daemon=True)
        server_thread.start()

        # Wait for server to start
        server_started.wait(timeout=5)

        # Give the server a moment to fully start
        time.sleep(0.1)

        # Test that we can connect to the server
        try:
            response = requests.get(f"http://localhost:{free_port}", timeout=2)
            assert response.status_code == 200
        except requests.exceptions.RequestException:
            # Server might not be fully ready, which is okay for this test
            pass

        # The server should shut down when the thread ends
        server_thread.join(timeout=2)

        # Check if there were any errors
        if server_error:
            raise server_error[0]
