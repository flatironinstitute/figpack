"""
Tests for the FigpackView base class
"""

import pytest
import zarr
from unittest.mock import patch
from figpack.core.figpack_view import FigpackView


class TestFigpackView:
    """Test cases for FigpackView class"""

    def testwrite_to_zarr_group_abstract(self):
        """Test that write_to_zarr_group raises NotImplementedError"""
        view = FigpackView()
        group = zarr.group()

        with pytest.raises(NotImplementedError) as exc_info:
            view.write_to_zarr_group(group)

        assert "Subclasses must implement write_to_zarr_group" in str(exc_info.value)

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
