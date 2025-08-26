"""
Tests for SpikeAmplitudes view
"""

import numpy as np
import pytest
import zarr

from figpack.spike_sorting.views.SpikeAmplitudes import SpikeAmplitudes
from figpack.spike_sorting.views.SpikeAmplitudesItem import SpikeAmplitudesItem


def test_spike_amplitudes_initialization():
    # Create sample data
    spike_times1 = np.array([1.0, 2.0, 3.0], dtype=np.float32)
    spike_amplitudes1 = np.array([0.5, 0.7, 0.6], dtype=np.float32)
    spike_times2 = np.array([1.5, 2.5, 3.5], dtype=np.float32)
    spike_amplitudes2 = np.array([0.4, 0.8, 0.5], dtype=np.float32)

    # Create SpikeAmplitudesItems
    item1 = SpikeAmplitudesItem(
        unit_id="unit1",
        spike_times_sec=spike_times1,
        spike_amplitudes=spike_amplitudes1,
    )
    item2 = SpikeAmplitudesItem(
        unit_id="unit2",
        spike_times_sec=spike_times2,
        spike_amplitudes=spike_amplitudes2,
    )

    # Create SpikeAmplitudes view
    view = SpikeAmplitudes(
        start_time_sec=0.0,
        end_time_sec=4.0,
        plots=[item1, item2],
        hide_unit_selector=False,
        height=500,
    )

    # Test initialization values
    assert view.start_time_sec == 0.0
    assert view.end_time_sec == 4.0
    assert len(view.plots) == 2
    assert view.hide_unit_selector is False
    assert view.height == 500


def test_spike_amplitudes_write_to_zarr():
    # Create sample data
    spike_times = np.array([1.0, 2.0, 3.0], dtype=np.float32)
    spike_amplitudes = np.array([0.5, 0.7, 0.6], dtype=np.float32)

    # Create SpikeAmplitudesItem
    item = SpikeAmplitudesItem(
        unit_id="test_unit",
        spike_times_sec=spike_times,
        spike_amplitudes=spike_amplitudes,
    )

    # Create SpikeAmplitudes view
    view = SpikeAmplitudes(
        start_time_sec=0.0,
        end_time_sec=4.0,
        plots=[item],
        hide_unit_selector=True,
        height=600,
    )

    # Create zarr group and write data
    store = zarr.MemoryStore()
    root = zarr.group(store=store)
    view._write_to_zarr_group(root)

    # Verify zarr group contents
    assert root.attrs["view_type"] == "SpikeAmplitudes"
    assert root.attrs["start_time_sec"] == 0.0
    assert root.attrs["end_time_sec"] == 4.0
    assert root.attrs["hide_unit_selector"] is True
    assert root.attrs["height"] == 600
    assert root.attrs["num_plots"] == 1

    # Verify plot data
    plot_metadata = root.attrs["plots"]
    assert len(plot_metadata) == 1
    assert plot_metadata[0]["unit_id"] == "test_unit"
    assert plot_metadata[0]["num_spikes"] == 3

    # Verify spike data
    plot_data = root["plot_0"]
    np.testing.assert_array_equal(plot_data["spike_times_sec"], spike_times)
    np.testing.assert_array_equal(plot_data["spike_amplitudes"], spike_amplitudes)


def test_spike_amplitudes_validation():
    # Test invalid spike times/amplitudes lengths
    with pytest.raises(AssertionError):
        SpikeAmplitudesItem(
            unit_id="test",
            spike_times_sec=np.array([1.0, 2.0]),
            spike_amplitudes=np.array([0.5]),
        )

    # Test invalid dimensionality
    with pytest.raises(AssertionError):
        SpikeAmplitudesItem(
            unit_id="test",
            spike_times_sec=np.array([[1.0], [2.0]]),  # 2D array
            spike_amplitudes=np.array([0.5, 0.6]),
        )
