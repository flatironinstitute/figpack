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
    )

    # Test initialization values
    assert view.start_time_sec == 0.0
    assert view.end_time_sec == 4.0
    assert len(view.plots) == 2


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
    )

    # Create zarr group and write data
    store = zarr.MemoryStore()
    root = zarr.group(store=store)
    view._write_to_zarr_group(root)

    # Verify zarr group contents
    assert root.attrs["view_type"] == "SpikeAmplitudes"
    assert root.attrs["start_time_sec"] == 0.0
    assert root.attrs["end_time_sec"] == 4.0
    assert root.attrs["total_spikes"] == 3

    # Verify unit ID mapping
    unit_ids = root.attrs["unit_ids"]
    assert len(unit_ids) == 1
    assert unit_ids[0] == "test_unit"

    # Verify unified data arrays
    np.testing.assert_array_equal(root["timestamps"], spike_times)
    np.testing.assert_array_equal(
        root["unit_indices"], np.array([0, 0, 0], dtype=np.uint16)
    )
    np.testing.assert_array_equal(root["amplitudes"], spike_amplitudes)

    # Verify reference arrays exist
    assert "reference_times" in root
    assert "reference_indices" in root
    assert len(root["reference_times"]) >= 1
    assert len(root["reference_indices"]) >= 1

    # Verify reference arrays are properly formed
    ref_times = root["reference_times"][:]
    ref_indices = root["reference_indices"][:]
    assert len(ref_times) == len(ref_indices)

    # First reference should be the first timestamp
    assert ref_times[0] == spike_times[0]
    assert ref_indices[0] == 0


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
    store = zarr.MemoryStore()
    root = zarr.group(store=store)
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


def test_spike_amplitudes_empty_data():
    # Create SpikeAmplitudes view with no plots
    view = SpikeAmplitudes(
        start_time_sec=0.0,
        end_time_sec=4.0,
        plots=[],
    )

    # Create zarr group and write data
    store = zarr.MemoryStore()
    root = zarr.group(store=store)
    view._write_to_zarr_group(root)

    # Verify empty data handling
    assert root.attrs["total_spikes"] == 0
    assert len(root.attrs["unit_ids"]) == 0
    assert len(root["timestamps"]) == 0
    assert len(root["unit_indices"]) == 0
    assert len(root["amplitudes"]) == 0
    assert len(root["reference_times"]) == 0
    assert len(root["reference_indices"]) == 0


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
