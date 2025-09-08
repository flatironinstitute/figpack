"""
Tests for SpikeAmplitudes view
"""

import numpy as np
import pytest
import zarr
import zarr.storage

import figpack
from figpack.spike_sorting.views.SpikeAmplitudes import SpikeAmplitudes
from figpack.spike_sorting.views.SpikeAmplitudesItem import SpikeAmplitudesItem


@pytest.mark.spikeinterface
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
    )

    # Test initialization values
    assert view.start_time_sec == 0.0
    assert view.end_time_sec == 4.0
    assert len(view.plots) == 2


@pytest.mark.spikeinterface
def test_spike_amplitudes_multiple_units():
    # Create sample data for multiple units
    spike_times1 = np.array([1.0, 3.0, 5.0], dtype=np.float32)
    spike_amplitudes1 = np.array([0.5, 0.7, 0.6], dtype=np.float32)
    spike_times2 = np.array([2.0, 4.0, 6.0], dtype=np.float32)
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
        end_time_sec=7.0,
        plots=[item1, item2],
    )

    # Create zarr group and write data
    store = zarr.storage.MemoryStore()
    root = figpack.Group(zarr.group(store=store))
    view._write_to_zarr_group(root)

    # Verify total spikes
    assert root.attrs["total_spikes"] == 6

    # Verify unit ID mapping
    unit_ids = root.attrs["unit_ids"]
    assert len(unit_ids) == 2
    assert "unit1" in unit_ids
    assert "unit2" in unit_ids

    # Verify data is sorted by timestamp
    timestamps = root["timestamps"][:]
    expected_timestamps = np.array([1.0, 2.0, 3.0, 4.0, 5.0, 6.0], dtype=np.float32)
    np.testing.assert_array_equal(timestamps, expected_timestamps)

    # Verify unit indices correspond to correct units
    unit_indices = root["unit_indices"][:]
    unit1_idx = unit_ids.index("unit1")
    unit2_idx = unit_ids.index("unit2")
    expected_unit_indices = np.array(
        [unit1_idx, unit2_idx, unit1_idx, unit2_idx, unit1_idx, unit2_idx],
        dtype=np.uint16,
    )
    np.testing.assert_array_equal(unit_indices, expected_unit_indices)

    # Verify amplitudes are correctly ordered
    amplitudes = root["amplitudes"][:]
    expected_amplitudes = np.array([0.5, 0.4, 0.7, 0.8, 0.6, 0.5], dtype=np.float32)
    np.testing.assert_array_equal(amplitudes, expected_amplitudes)


@pytest.mark.spikeinterface
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
