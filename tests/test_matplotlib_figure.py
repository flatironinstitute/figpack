import io
import pytest
import matplotlib.pyplot as plt
import numpy as np
import zarr
from unittest.mock import MagicMock, patch

from figpack.views.MatplotlibFigure import MatplotlibFigure


@pytest.fixture
def sample_figure():
    """Create a sample matplotlib figure for testing"""
    fig, ax = plt.subplots()
    ax.plot([1, 2, 3], [1, 2, 3])
    return fig


def test_matplotlib_figure_init(sample_figure):
    """Test MatplotlibFigure initialization"""
    view = MatplotlibFigure(sample_figure)
    assert view.fig == sample_figure


def test_write_to_zarr_basic(sample_figure):
    """Test basic writing to zarr group"""
    view = MatplotlibFigure(sample_figure)
    store = zarr.storage.TempStore()
    root = zarr.group(store=store)
    group = root.create_group("test")

    view._write_to_zarr_group(group)

    # Check basic attributes
    assert group.attrs["view_type"] == "MatplotlibFigure"
    assert isinstance(group.attrs["svg_data"], str)
    assert len(group.attrs["svg_data"]) > 0
    assert group.attrs["svg_data"].startswith("<?xml")

    # Check figure dimensions
    assert isinstance(group.attrs["figure_width_inches"], float)
    assert isinstance(group.attrs["figure_height_inches"], float)
    assert isinstance(group.attrs["figure_dpi"], float)

    # Verify dimensions match the original figure
    fig_width, fig_height = sample_figure.get_size_inches()
    assert group.attrs["figure_width_inches"] == float(fig_width)
    assert group.attrs["figure_height_inches"] == float(fig_height)
    assert group.attrs["figure_dpi"] == float(sample_figure.dpi)


def test_write_to_zarr_error_handling():
    """Test error handling during SVG export"""
    # Create a mock figure that raises an exception on savefig
    mock_fig = MagicMock()
    mock_fig.savefig.side_effect = ValueError("Test error")
    mock_fig.get_size_inches.return_value = (6.0, 4.0)
    mock_fig.dpi = 100.0

    view = MatplotlibFigure(mock_fig)
    store = zarr.storage.TempStore()
    root = zarr.group(store=store)
    group = root.create_group("test")

    view._write_to_zarr_group(group)

    # Check error handling
    assert group.attrs["svg_data"] == ""
    assert "Failed to export matplotlib figure" in group.attrs["error"]
    assert group.attrs["figure_width_inches"] == 6.0
    assert group.attrs["figure_height_inches"] == 4.0
    assert group.attrs["figure_dpi"] == 100.0


def test_write_to_zarr_custom_size(sample_figure):
    """Test writing figure with custom size"""
    # Set custom size
    sample_figure.set_size_inches(10, 8)
    sample_figure.set_dpi(150)

    view = MatplotlibFigure(sample_figure)
    store = zarr.storage.TempStore()
    root = zarr.group(store=store)
    group = root.create_group("test")

    view._write_to_zarr_group(group)

    # Verify custom dimensions were stored correctly
    assert group.attrs["figure_width_inches"] == 10.0
    assert group.attrs["figure_height_inches"] == 8.0
    assert group.attrs["figure_dpi"] == 150.0


def test_write_to_zarr_svg_options(sample_figure):
    """Test SVG export options are set correctly"""
    view = MatplotlibFigure(sample_figure)

    with patch.object(sample_figure, "savefig") as mock_savefig:
        store = zarr.storage.TempStore()
        root = zarr.group(store=store)
        group = root.create_group("test")

        view._write_to_zarr_group(group)

        # Verify savefig was called with correct options
        mock_savefig.assert_called_once()
        _, kwargs = mock_savefig.call_args
        assert kwargs["format"] == "svg"
        assert kwargs["bbox_inches"] == "tight"
        assert kwargs["facecolor"] == "white"
        assert kwargs["edgecolor"] == "none"
