import os
import pathlib
import socket
import tempfile
import threading
import time
import pytest
from unittest.mock import patch, MagicMock, Mock
from http.server import ThreadingHTTPServer

from figpack.core._show_view import _show_view, serve_files, CORSRequestHandler
from figpack.core.figpack_view import FigpackView


class MockView(FigpackView):
    """Mock view class for testing"""

    def _write_to_zarr_group(self, group):
        pass


@pytest.fixture
def mock_view():
    return MockView()


def test_show_view_upload_without_api_key():
    """Test that uploading without API key raises error"""
    view = MockView()

    # Ensure the env var is not set
    if "FIGPACK_API_KEY" in os.environ:
        del os.environ["FIGPACK_API_KEY"]

    with pytest.raises(EnvironmentError) as exc_info:
        _show_view(view, upload=True)

    assert "FIGPACK_API_KEY environment variable must be set" in str(exc_info.value)


@patch("figpack.core._show_view.prepare_figure_bundle")
def test_show_view_creates_temp_dir(mock_prepare):
    """Test that show_view creates and uses a temporary directory"""
    view = MockView()

    # Mock the serve_files function to avoid actually serving
    with patch("figpack.core._show_view.serve_files") as mock_serve:
        _show_view(view)

        # Verify prepare_figure_bundle was called with a temp dir
        assert mock_prepare.call_count == 1
        temp_dir = mock_prepare.call_args[0][1]
        assert temp_dir.startswith("/tmp/figpack_")

        # Verify serve_files was called with same temp dir
        assert mock_serve.call_count == 1
        assert mock_serve.call_args[0][0] == temp_dir


@patch("figpack.core._show_view.prepare_figure_bundle")
@patch("figpack.core._show_view._upload_bundle")
def test_show_view_upload_flow(mock_upload, mock_prepare):
    """Test the upload flow with mocked upload function"""
    view = MockView()
    expected_url = "https://example.com/figure"
    mock_upload.return_value = expected_url

    # Set mock API key
    os.environ["FIGPACK_API_KEY"] = "test_key"

    try:
        # Test with upload=True but open_in_browser=False
        with patch("builtins.input") as mock_input:
            url = _show_view(view, upload=True, open_in_browser=False)

            # Verify upload was called
            assert mock_upload.call_count == 1
            assert url == expected_url

            # Verify user was not prompted to press Enter
            assert mock_input.call_count == 0
    finally:
        # Clean up environment
        del os.environ["FIGPACK_API_KEY"]


def test_show_view_title_description():
    """Test that title and description are passed to prepare_figure_bundle"""
    view = MockView()
    title = "Test Title"
    description = "Test Description"

    with patch("figpack.core._show_view.prepare_figure_bundle") as mock_prepare:
        with patch("figpack.core._show_view.serve_files"):
            _show_view(view, title=title, description=description)

            # Verify prepare_figure_bundle was called with title and description
            assert mock_prepare.call_count == 1
            _, _, kwargs = mock_prepare.mock_calls[0]
            assert kwargs["title"] == title
            assert kwargs["description"] == description


@patch("figpack.core._show_view.prepare_figure_bundle")
@patch("figpack.core._show_view._upload_bundle")
@patch("webbrowser.open")
def test_show_view_upload_with_browser(mock_browser, mock_upload, mock_prepare):
    """Test upload flow with browser opening"""
    view = MockView()
    expected_url = "https://example.com/figure"
    mock_upload.return_value = expected_url

    # Set mock API key
    os.environ["FIGPACK_API_KEY"] = "test_key"

    try:
        # Test with upload=True and open_in_browser=True
        with patch("builtins.input") as mock_input:
            url = _show_view(view, upload=True, open_in_browser=True)

            # Verify upload was called
            assert mock_upload.call_count == 1
            assert url == expected_url

            # Verify browser was opened
            mock_browser.assert_called_once_with(expected_url)

            # Verify user was prompted to press Enter
            assert mock_input.call_count == 1
    finally:
        # Clean up environment
        del os.environ["FIGPACK_API_KEY"]


@patch("figpack.core._show_view.prepare_figure_bundle")
def test_show_view_serve_with_port(mock_prepare):
    """Test serving with specific port"""
    view = MockView()
    port = 8080

    with patch("figpack.core._show_view.serve_files") as mock_serve:
        _show_view(view, port=port)

        # Verify serve_files was called with correct port
        assert mock_serve.call_count == 1
        call_kwargs = mock_serve.call_args[1]
        assert call_kwargs["port"] == port


@patch("figpack.core._show_view.prepare_figure_bundle")
def test_show_view_serve_with_allow_origin(mock_prepare):
    """Test serving with CORS allow_origin"""
    view = MockView()
    allow_origin = "https://example.com"

    with patch("figpack.core._show_view.serve_files") as mock_serve:
        _show_view(view, allow_origin=allow_origin)

        # Verify serve_files was called with correct allow_origin
        assert mock_serve.call_count == 1
        call_kwargs = mock_serve.call_args[1]
        assert call_kwargs["allow_origin"] == allow_origin


@patch("figpack.core._show_view.prepare_figure_bundle")
@patch("webbrowser.open")
def test_show_view_serve_with_browser(mock_browser, mock_prepare):
    """Test serving with browser opening"""
    view = MockView()

    with patch("figpack.core._show_view.serve_files") as mock_serve:
        _show_view(view, open_in_browser=True)

        # Verify serve_files was called with open_in_browser=True
        assert mock_serve.call_count == 1
        call_kwargs = mock_serve.call_args[1]
        assert call_kwargs["open_in_browser"] == True


def test_cors_request_handler_init():
    """Test CORSRequestHandler initialization"""
    # Mock the required parameters for HTTP request handler
    mock_request = Mock()
    mock_client_address = ("127.0.0.1", 12345)
    mock_server = Mock()

    # Test with allow_origin
    with patch("figpack.core._show_view.SimpleHTTPRequestHandler.__init__"):
        handler = CORSRequestHandler(
            mock_request,
            mock_client_address,
            mock_server,
            allow_origin="https://example.com",
        )
        assert handler.allow_origin == "https://example.com"

    # Test without allow_origin
    with patch("figpack.core._show_view.SimpleHTTPRequestHandler.__init__"):
        handler = CORSRequestHandler(mock_request, mock_client_address, mock_server)
        assert handler.allow_origin is None


def test_cors_request_handler_end_headers():
    """Test CORS headers are added correctly"""
    # Mock the required parameters for HTTP request handler
    mock_request = Mock()
    mock_client_address = ("127.0.0.1", 12345)
    mock_server = Mock()

    with patch("figpack.core._show_view.SimpleHTTPRequestHandler.__init__"):
        handler = CORSRequestHandler(
            mock_request,
            mock_client_address,
            mock_server,
            allow_origin="https://example.com",
        )

        # Mock the parent class methods
        handler.send_header = Mock()

        # Mock the parent end_headers method
        with patch(
            "figpack.core._show_view.SimpleHTTPRequestHandler.end_headers"
        ) as mock_parent:
            handler.end_headers()

            # Verify CORS headers were sent
            expected_calls = [
                ("Access-Control-Allow-Origin", "https://example.com"),
                ("Vary", "Origin"),
                ("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS"),
                ("Access-Control-Allow-Headers", "Content-Type, Range"),
                (
                    "Access-Control-Expose-Headers",
                    "Accept-Ranges, Content-Encoding, Content-Length, Content-Range",
                ),
            ]

            for header, value in expected_calls:
                handler.send_header.assert_any_call(header, value)

            # Verify parent end_headers was called
            mock_parent.assert_called_once()


def test_cors_request_handler_end_headers_no_origin():
    """Test that no CORS headers are added when allow_origin is None"""
    # Mock the required parameters for HTTP request handler
    mock_request = Mock()
    mock_client_address = ("127.0.0.1", 12345)
    mock_server = Mock()

    with patch("figpack.core._show_view.SimpleHTTPRequestHandler.__init__"):
        handler = CORSRequestHandler(
            mock_request, mock_client_address, mock_server, allow_origin=None
        )

        # Mock the parent class methods
        handler.send_header = Mock()

        # Mock the parent end_headers method
        with patch(
            "figpack.core._show_view.SimpleHTTPRequestHandler.end_headers"
        ) as mock_parent:
            handler.end_headers()

            # Verify no CORS headers were sent
            handler.send_header.assert_not_called()

            # Verify parent end_headers was called
            mock_parent.assert_called_once()


def test_cors_request_handler_do_options():
    """Test OPTIONS request handling"""
    # Mock the required parameters for HTTP request handler
    mock_request = Mock()
    mock_client_address = ("127.0.0.1", 12345)
    mock_server = Mock()

    with patch("figpack.core._show_view.SimpleHTTPRequestHandler.__init__"):
        handler = CORSRequestHandler(mock_request, mock_client_address, mock_server)

        # Mock the response methods
        handler.send_response = Mock()
        handler.end_headers = Mock()

        handler.do_OPTIONS()

        # Verify correct response was sent
        handler.send_response.assert_called_once_with(204, "No Content")
        handler.end_headers.assert_called_once()


def test_cors_request_handler_log_message():
    """Test that log_message is silenced"""
    # Mock the required parameters for HTTP request handler
    mock_request = Mock()
    mock_client_address = ("127.0.0.1", 12345)
    mock_server = Mock()

    with patch("figpack.core._show_view.SimpleHTTPRequestHandler.__init__"):
        handler = CORSRequestHandler(mock_request, mock_client_address, mock_server)

        # This should not raise any exceptions and should do nothing
        handler.log_message("test format", "arg1", "arg2")


@patch("socket.socket")
def test_serve_files_auto_port(mock_socket):
    """Test serve_files with automatic port selection"""
    # Mock socket for port selection
    mock_sock = Mock()
    mock_sock.getsockname.return_value = ("127.0.0.1", 8080)
    mock_socket.return_value.__enter__.return_value = mock_sock

    with tempfile.TemporaryDirectory() as tmpdir:
        with patch("figpack.core._show_view.ThreadingHTTPServer") as mock_server_class:
            with patch("threading.Thread") as mock_thread_class:
                with patch("builtins.input"):  # Mock input to avoid blocking
                    mock_server = Mock()
                    mock_server_class.return_value = mock_server

                    mock_thread = Mock()
                    mock_thread_class.return_value = mock_thread

                    serve_files(tmpdir, port=None)

                    # Verify server was created with auto-selected port
                    mock_server_class.assert_called_once()
                    args = mock_server_class.call_args[0]
                    assert args[0] == ("0.0.0.0", 8080)


def test_serve_files_specific_port():
    """Test serve_files with specific port"""
    with tempfile.TemporaryDirectory() as tmpdir:
        with patch("figpack.core._show_view.ThreadingHTTPServer") as mock_server_class:
            with patch("threading.Thread") as mock_thread_class:
                with patch("builtins.input"):  # Mock input to avoid blocking
                    mock_server = Mock()
                    mock_server_class.return_value = mock_server

                    mock_thread = Mock()
                    mock_thread_class.return_value = mock_thread

                    serve_files(tmpdir, port=9000)

                    # Verify server was created with specified port
                    mock_server_class.assert_called_once()
                    args = mock_server_class.call_args[0]
                    assert args[0] == ("0.0.0.0", 9000)


def test_serve_files_nonexistent_directory():
    """Test serve_files with nonexistent directory"""
    with pytest.raises(SystemExit) as exc_info:
        serve_files("/nonexistent/directory", port=8080)

    assert "Directory not found" in str(exc_info.value)


def test_serve_files_file_instead_of_directory():
    """Test serve_files with file path instead of directory"""
    with tempfile.NamedTemporaryFile() as tmp_file:
        with pytest.raises(SystemExit) as exc_info:
            serve_files(tmp_file.name, port=8080)

        assert "Directory not found" in str(exc_info.value)


@patch("webbrowser.open")
def test_serve_files_with_browser(mock_browser):
    """Test serve_files with browser opening"""
    with tempfile.TemporaryDirectory() as tmpdir:
        with patch("figpack.core._show_view.ThreadingHTTPServer") as mock_server_class:
            with patch("threading.Thread") as mock_thread_class:
                with patch("builtins.input"):  # Mock input to avoid blocking
                    mock_server = Mock()
                    mock_server_class.return_value = mock_server

                    mock_thread = Mock()
                    mock_thread_class.return_value = mock_thread

                    serve_files(tmpdir, port=8080, open_in_browser=True)

                    # Verify browser was opened
                    mock_browser.assert_called_once_with("http://localhost:8080")


def test_serve_files_with_allow_origin():
    """Test serve_files with CORS allow_origin"""
    with tempfile.TemporaryDirectory() as tmpdir:
        with patch("figpack.core._show_view.ThreadingHTTPServer") as mock_server_class:
            with patch("threading.Thread") as mock_thread_class:
                with patch("builtins.input"):  # Mock input to avoid blocking
                    mock_server = Mock()
                    mock_server_class.return_value = mock_server

                    mock_thread = Mock()
                    mock_thread_class.return_value = mock_thread

                    serve_files(tmpdir, port=8080, allow_origin="https://example.com")

                    # Verify server was created with handler factory
                    mock_server_class.assert_called_once()
                    handler_factory = mock_server_class.call_args[0][1]

                    # Test that the handler factory creates handlers with correct allow_origin
                    # This is a bit tricky to test directly, but we can verify the factory exists
                    assert callable(handler_factory)


def test_serve_files_keyboard_interrupt():
    """Test serve_files handles KeyboardInterrupt gracefully"""
    with tempfile.TemporaryDirectory() as tmpdir:
        with patch("figpack.core._show_view.ThreadingHTTPServer") as mock_server_class:
            with patch("threading.Thread") as mock_thread_class:
                mock_server = Mock()
                mock_server_class.return_value = mock_server

                mock_thread = Mock()
                mock_thread_class.return_value = mock_thread

                # Mock input to raise KeyboardInterrupt
                with patch("builtins.input", side_effect=KeyboardInterrupt):
                    serve_files(tmpdir, port=8080)

                # Verify server was shut down properly
                mock_server.shutdown.assert_called_once()
                mock_server.server_close.assert_called_once()
                mock_thread.join.assert_called_once()


def test_serve_files_eof_error():
    """Test serve_files handles EOFError gracefully"""
    with tempfile.TemporaryDirectory() as tmpdir:
        with patch("figpack.core._show_view.ThreadingHTTPServer") as mock_server_class:
            with patch("threading.Thread") as mock_thread_class:
                mock_server = Mock()
                mock_server_class.return_value = mock_server

                mock_thread = Mock()
                mock_thread_class.return_value = mock_thread

                # Mock input to raise EOFError
                with patch("builtins.input", side_effect=EOFError):
                    serve_files(tmpdir, port=8080)

                # Verify server was shut down properly
                mock_server.shutdown.assert_called_once()
                mock_server.server_close.assert_called_once()
                mock_thread.join.assert_called_once()


def test_serve_files_normal_exit():
    """Test serve_files normal exit flow"""
    with tempfile.TemporaryDirectory() as tmpdir:
        with patch("figpack.core._show_view.ThreadingHTTPServer") as mock_server_class:
            with patch("threading.Thread") as mock_thread_class:
                mock_server = Mock()
                mock_server_class.return_value = mock_server

                mock_thread = Mock()
                mock_thread_class.return_value = mock_thread

                # Mock normal input (user presses Enter)
                with patch("builtins.input", return_value=""):
                    serve_files(tmpdir, port=8080)

                # Verify server was shut down properly
                mock_server.shutdown.assert_called_once()
                mock_server.server_close.assert_called_once()
                mock_thread.join.assert_called_once()


@patch("figpack.core._show_view.prepare_figure_bundle")
def test_show_view_all_parameters(mock_prepare):
    """Test _show_view with all parameters"""
    view = MockView()

    with patch("figpack.core._show_view.serve_files") as mock_serve:
        _show_view(
            view,
            open_in_browser=True,
            port=9000,
            allow_origin="https://test.com",
            upload=False,
            title="Test Title",
            description="Test Description",
        )

        # Verify prepare_figure_bundle was called with title and description
        mock_prepare.assert_called_once()
        call_args = mock_prepare.call_args
        assert call_args[1]["title"] == "Test Title"
        assert call_args[1]["description"] == "Test Description"

        # Verify serve_files was called with correct parameters
        mock_serve.assert_called_once()
        call_kwargs = mock_serve.call_args[1]
        assert call_kwargs["port"] == 9000
        assert call_kwargs["open_in_browser"] == True
        assert call_kwargs["allow_origin"] == "https://test.com"


def test_cors_request_handler_inheritance():
    """Test that CORSRequestHandler properly inherits from SimpleHTTPRequestHandler"""
    from http.server import SimpleHTTPRequestHandler

    # Verify inheritance
    assert issubclass(CORSRequestHandler, SimpleHTTPRequestHandler)

    # Test that we can create an instance with proper mocking
    mock_request = Mock()
    mock_client_address = ("127.0.0.1", 12345)
    mock_server = Mock()

    with patch("figpack.core._show_view.SimpleHTTPRequestHandler.__init__"):
        handler = CORSRequestHandler(mock_request, mock_client_address, mock_server)
        assert isinstance(handler, SimpleHTTPRequestHandler)
