"""
Tests for the FigpackView base class
"""

import pytest
import zarr
from unittest.mock import patch
from figpack.core.figpack_view import FigpackView


class TestFigpackView:
    """Test cases for FigpackView class"""

    def test_write_to_zarr_group_abstract(self):
        """Test that _write_to_zarr_group raises NotImplementedError"""
        view = FigpackView()
        group = zarr.group()

        with pytest.raises(NotImplementedError) as exc_info:
            view._write_to_zarr_group(group)

        assert "Subclasses must implement _write_to_zarr_group" in str(exc_info.value)

    def test_show_dev_mode_constraints(self):
        """Test development mode constraints in show method"""
        view = FigpackView()

        # Test that allow_origin cannot be set with _dev=True
        with pytest.raises(ValueError) as exc_info:
            view.show(_dev=True, allow_origin="http://example.com")
        assert "Cannot set allow_origin when _dev is True" in str(exc_info.value)

        # Test that upload cannot be used with _dev=True
        with pytest.raises(ValueError) as exc_info:
            view.show(_dev=True, upload=True)
        assert "Cannot upload when _dev is True" in str(exc_info.value)

    def test_show_dev_mode_default_values(self, capfd):
        """Test that development mode sets correct default values"""
        view = FigpackView()

        # Mock _show_view to avoid actual server startup
        with patch("figpack.core._show_view._show_view") as mock_show:
            view.show(_dev=True)

            # Verify _show_view was called with correct parameters
            mock_show.assert_called_once()
            args = mock_show.call_args

            assert args[1]["port"] == 3004
            assert args[1]["allow_origin"] == "http://localhost:5173"
            assert args[1]["upload"] is False
            assert args[1]["open_in_browser"] is False

            # Verify correct message was printed
            captured = capfd.readouterr()
            assert "For development, run figpack-gui in dev mode" in captured.out

    def test_show_regular_usage(self):
        """Test show method with standard parameters"""
        view = FigpackView()
        port = 8080

        with patch("figpack.core._show_view._show_view") as mock_show:
            # Test with various combinations of parameters
            view.show(port=port, open_in_browser=True, allow_origin="http://test.com")

            mock_show.assert_called_once()
            args = mock_show.call_args

            assert args[1]["port"] == port
            assert args[1]["open_in_browser"] is True
            assert args[1]["allow_origin"] == "http://test.com"
            assert args[1]["upload"] is False

    def test_show_with_title_and_description(self):
        """Test show method with title and description"""
        view = FigpackView()
        title = "Test Figure"
        description = "A test description"

        with patch("figpack.core._show_view._show_view") as mock_show:
            view.show(title=title, description=description)

            mock_show.assert_called_once()
            args = mock_show.call_args

            assert args[1]["title"] == title
            assert args[1]["description"] == description

    def test_show_with_default_values(self):
        """Test show method uses correct default values"""
        view = FigpackView()

        with patch("figpack.core._show_view._show_view") as mock_show:
            view.show()

            mock_show.assert_called_once()
            args = mock_show.call_args

            assert args[1]["port"] is None
            assert args[1]["open_in_browser"] is False
            assert args[1]["allow_origin"] is None
            assert args[1]["upload"] is False
            assert args[1]["title"] is None
            assert args[1]["description"] is None
