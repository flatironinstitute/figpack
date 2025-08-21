import os
import pathlib
import pytest
from unittest.mock import patch, MagicMock

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
