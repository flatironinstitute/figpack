import numpy as np
import plotly.graph_objects as go
import pytest
import zarr
import zarr.storage
from datetime import datetime
from unittest.mock import MagicMock

import figpack
from figpack.views import PlotlyFigure


@pytest.fixture
def sample_plotly_figure():
    """Create a sample plotly figure for testing"""
    fig = go.Figure()
    fig.add_trace(go.Scatter(x=[1, 2, 3], y=[4, 5, 6]))
    fig.update_layout(title="Test Figure")
    return fig


def test_plotly_figure_init(sample_plotly_figure):
    """Test PlotlyFigure initialization"""
    view = PlotlyFigure(sample_plotly_figure)
    assert view.fig == sample_plotly_figure


def test_write_to_zarr_basic(sample_plotly_figure):
    """Test basic writing to zarr group"""
    view = PlotlyFigure(sample_plotly_figure)
    store = zarr.storage.MemoryStore()
    root = zarr.group(store=store)
    group = figpack.Group(root.create_group("test"))

    view.write_to_zarr_group(group)

    # Check basic attributes and data array
    assert group.attrs["view_type"] == "plotly.PlotlyFigure"
    assert "figure_data" in group
    assert "data_size" in group.attrs

    # Verify array properties
    figure_data_array = group["figure_data"]
    assert figure_data_array.dtype == np.uint8

    # Convert array back to string for content verification
    figure_data = figure_data_array[:].tobytes().decode("utf-8")
    assert "Test Figure" in figure_data  # Title should be in the JSON
    assert "scatter" in figure_data.lower()  # Trace type should be in the JSON

    # Verify data size
    assert group.attrs["data_size"] == len(figure_data.encode("utf-8"))


def test_write_to_zarr_complex_data():
    """Test writing figure with complex data types"""
    # Create figure with various data types
    fig = go.Figure()

    # Add trace with numpy arrays and datetime
    x = np.array([1, 2, 3], dtype=np.float32)
    y = np.array([4, 5, 6], dtype=np.int32)
    dates = [datetime(2023, 1, i) for i in range(1, 4)]

    fig.add_trace(go.Scatter(x=x, y=y))
    fig.add_trace(go.Scatter(x=dates, y=[7, 8, 9]))

    view = PlotlyFigure(fig)
    store = zarr.storage.MemoryStore()
    root = zarr.group(store=store)
    group = figpack.Group(root.create_group("test"))

    # Should not raise any exceptions
    view.write_to_zarr_group(group)

    # Verify data was stored
    assert "figure_data" in group
    assert "data_size" in group.attrs

    # Get figure data from array
    figure_data_array = group["figure_data"]
    figure_data = figure_data_array[:].tobytes().decode("utf-8")

    # Basic validation of stored JSON
    assert isinstance(figure_data, str)
    # Check numpy arrays are stored with dtype and bdata
    assert '"dtype": "f4"' in figure_data  # float32 array
    assert '"dtype": "i4"' in figure_data  # int32 array
    # Check datetime values
    assert "2023-01-01T00:00:00" in figure_data  # Date from second trace

    # Verify array properties
    assert figure_data_array.dtype == np.uint8

    # Verify data size
    assert group.attrs["data_size"] == len(figure_data.encode("utf-8"))


def test_write_to_zarr_figure_methods():
    """Test that figure methods are properly called"""
    mock_fig = MagicMock()
    mock_fig.to_dict.return_value = {"data": [], "layout": {}}

    view = PlotlyFigure(mock_fig)
    store = zarr.storage.MemoryStore()
    root = zarr.group(store=store)
    group = figpack.Group(root.create_group("test"))

    view.write_to_zarr_group(group)

    # Verify to_dict was called
    mock_fig.to_dict.assert_called_once()
