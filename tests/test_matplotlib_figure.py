import pytest
import matplotlib.pyplot as plt
import numpy as np
import zarr
import zarr.storage
from unittest.mock import MagicMock, patch

import figpack
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
    store = zarr.storage.MemoryStore()
    root = zarr.group(store=store)
    group = figpack.Group(root.create_group("test"))

    view.write_to_zarr_group(group)

    # Check basic attributes
    assert group.attrs["view_type"] == "MatplotlibFigure"

    # Check SVG data is stored in array
    svg_data = group["svg_data"][:]
    svg_string = bytes(svg_data).decode("utf-8")
    assert len(svg_string) > 0
    assert svg_string.startswith("<?xml")

    # Check figure dimensions
    assert isinstance(group.attrs["figure_width_inches"], float)
    assert isinstance(group.attrs["figure_height_inches"], float)
    assert isinstance(group.attrs["figure_dpi"], float)

    # Verify dimensions match the original figure
    fig_width, fig_height = sample_figure.get_size_inches()
    assert group.attrs["figure_width_inches"] == float(fig_width)
    assert group.attrs["figure_height_inches"] == float(fig_height)
    assert group.attrs["figure_dpi"] == float(sample_figure.dpi)

    # Verify array properties
    assert group["svg_data"].dtype == np.uint8


def test_write_to_zarr_error_handling():
    """Test error handling during SVG export"""
    # Create a mock figure that raises an exception on savefig
    mock_fig = MagicMock()
    mock_fig.savefig.side_effect = ValueError("Test error")
    mock_fig.get_size_inches.return_value = (6.0, 4.0)
    mock_fig.dpi = 100.0

    view = MatplotlibFigure(mock_fig)
    store = zarr.storage.MemoryStore()
    root = zarr.group(store=store)
    group = figpack.Group(root.create_group("test"))

    view.write_to_zarr_group(group)

    # Check error handling
    assert len(group["svg_data"][:]) == 0
    assert "Failed to export matplotlib figure" in group.attrs["error"]
    assert group.attrs["figure_width_inches"] == 6.0
    assert group.attrs["figure_height_inches"] == 4.0
    assert group.attrs["figure_dpi"] == 100.0
    assert group.attrs["data_size"] == 0


def test_write_to_zarr_custom_size(sample_figure):
    """Test writing figure with custom size"""
    # Set custom size
    sample_figure.set_size_inches(10, 8)
    sample_figure.set_dpi(150)

    view = MatplotlibFigure(sample_figure)
    store = zarr.storage.MemoryStore()
    root = zarr.group(store=store)
    group = figpack.Group(root.create_group("test"))

    view.write_to_zarr_group(group)

    # Verify custom dimensions were stored correctly
    assert group.attrs["figure_width_inches"] == 10.0
    assert group.attrs["figure_height_inches"] == 8.0
    assert group.attrs["figure_dpi"] == 150.0

    # Verify SVG data
    svg_data = group["svg_data"][:]
    assert len(svg_data) > 0


def test_write_to_zarr_svg_options(sample_figure):
    """Test SVG export options are set correctly"""
    view = MatplotlibFigure(sample_figure)

    with patch.object(sample_figure, "savefig") as mock_savefig:
        store = zarr.storage.MemoryStore()
        root = zarr.group(store=store)
        group = figpack.Group(root.create_group("test"))

        view.write_to_zarr_group(group)

        # Verify savefig was called with correct options
        mock_savefig.assert_called_once()
        _, kwargs = mock_savefig.call_args
        assert kwargs["format"] == "svg"
        assert kwargs["bbox_inches"] == "tight"
        assert kwargs["facecolor"] == "white"
        assert kwargs["edgecolor"] == "none"


def test_write_to_zarr_compression(sample_figure):
    """Test SVG data compression settings"""
    view = MatplotlibFigure(sample_figure)
    store = zarr.storage.MemoryStore()
    root = zarr.group(store=store)
    group = figpack.Group(root.create_group("test"))

    view.write_to_zarr_group(group)
