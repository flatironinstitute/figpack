import pytest
import numpy as np
import zarr

from figpack.spike_sorting.views import RasterPlot, RasterPlotItem


def test_raster_plot_init():
    """Test RasterPlot initialization with valid parameters"""
    # Create test data
    plots = [
        RasterPlotItem(unit_id=1, spike_times_sec=np.array([0.1, 0.2, 0.3])),
        RasterPlotItem(unit_id=2, spike_times_sec=np.array([0.15, 0.25, 0.35])),
    ]

    # Initialize RasterPlot
    plot = RasterPlot(start_time_sec=0.0, end_time_sec=1.0, plots=plots, height=500)

    # Verify attributes
    assert plot.start_time_sec == 0.0
    assert plot.end_time_sec == 1.0
    assert len(plot.plots) == 2
    assert plot.height == 500


def test_raster_plot_validation():
    """Test RasterPlot initialization with invalid parameters"""
    plots = [RasterPlotItem(unit_id=1, spike_times_sec=np.array([0.1, 0.2, 0.3]))]

    # Test invalid start_time_sec type
    with pytest.raises(ValueError):
        RasterPlot(start_time_sec="invalid", end_time_sec=1.0, plots=plots)

    # Test invalid end_time_sec type
    with pytest.raises(ValueError):
        RasterPlot(start_time_sec=0.0, end_time_sec="invalid", plots=plots)


def test_write_to_zarr_group():
    """Test writing RasterPlot data to zarr group"""
    # Create test data
    plots = [
        RasterPlotItem(unit_id=1, spike_times_sec=np.array([0.1, 0.2, 0.3])),
        RasterPlotItem(unit_id=2, spike_times_sec=np.array([0.15, 0.25, 0.35])),
    ]

    plot = RasterPlot(start_time_sec=0.0, end_time_sec=1.0, plots=plots, height=500)

    # Create temporary zarr group
    store = zarr.MemoryStore()
    root = zarr.group(store=store)

    # Write data to zarr group
    plot._write_to_zarr_group(root)

    # Verify stored data
    assert root.attrs["view_type"] == "RasterPlot"
    assert root.attrs["start_time_sec"] == 0.0
    assert root.attrs["end_time_sec"] == 1.0
    assert root.attrs["height"] == 500
    assert root.attrs["num_plots"] == 2

    # Verify plot metadata
    plot_metadata = root.attrs["plots"]
    assert len(plot_metadata) == 2
    assert plot_metadata[0]["unit_id"] == "1"
    assert plot_metadata[0]["num_spikes"] == 3

    # Verify spike times data
    np.testing.assert_array_almost_equal(
        root["plot_0/spike_times_sec"][:], np.array([0.1, 0.2, 0.3])
    )
    np.testing.assert_array_almost_equal(
        root["plot_1/spike_times_sec"][:], np.array([0.15, 0.25, 0.35])
    )
