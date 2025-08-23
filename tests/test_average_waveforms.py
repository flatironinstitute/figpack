import numpy as np
import pytest
import spikeinterface as si
import spikeinterface.extractors as se
import spikeinterface.preprocessing as spre
import zarr

from figpack.spike_sorting.views.AverageWaveforms import (
    AverageWaveforms,
    AverageWaveformItem,
)


def test_average_waveforms_with_si():
    """Test AverageWaveforms with real spikeinterface data"""
    # Create toy example data
    recording, sorting = se.toy_example(
        num_units=4,  # Use fewer units for faster tests
        duration=10,  # Shorter duration for faster tests
        seed=0,
        num_segments=1,
    )

    # Create sorting analyzer
    sorting_analyzer = si.create_sorting_analyzer(
        sorting=sorting, recording=recording, format="memory"
    )

    # Create view from sorting analyzer
    view = AverageWaveforms.from_sorting_analyzer(sorting_analyzer)

    # Basic validation
    assert len(view.average_waveforms) == 4  # One for each unit

    # Check attributes of each average waveform
    for item in view.average_waveforms:
        assert isinstance(item.unit_id, str)
        assert isinstance(item.channel_ids, list)
        assert all(isinstance(ch, (str, int)) for ch in item.channel_ids)
        assert isinstance(item.waveform, np.ndarray)
        assert item.waveform.dtype == np.float32
        if item.waveform_std_dev is not None:
            assert isinstance(item.waveform_std_dev, np.ndarray)
            assert item.waveform_std_dev.dtype == np.float32
        if item.waveform_percentiles is not None:
            assert isinstance(item.waveform_percentiles, list)
            assert all(isinstance(p, np.ndarray) for p in item.waveform_percentiles)
            assert all(p.dtype == np.float32 for p in item.waveform_percentiles)

    # Test Zarr storage
    store = zarr.storage.TempStore()
    root = zarr.group(store=store)
    group = root.create_group("test")
    view._write_to_zarr_group(group)

    # Verify stored data
    assert group.attrs["view_type"] == "AverageWaveforms"
    assert group.attrs["num_average_waveforms"] == 4

    # Check each stored average waveform
    metadata = group.attrs["average_waveforms"]
    assert len(metadata) == 4

    for i, meta in enumerate(metadata):
        name = meta["name"]
        # Verify data arrays exist and have correct types
        assert group[f"{name}/waveform"].dtype == np.float32
        if f"{name}/waveform_std_dev" in group:
            assert group[f"{name}/waveform_std_dev"].dtype == np.float32


def test_average_waveform_item_creation():
    """Test creating an AverageWaveformItem directly"""
    # Create test data
    unit_id = "test_unit"
    channel_ids = ["ch1", "ch2", "ch3"]
    waveform = np.random.randn(100, 3).astype(np.float32)
    waveform_std_dev = np.random.randn(100, 3).astype(np.float32)
    waveform_percentiles = [
        np.random.randn(100, 3).astype(np.float32),
        np.random.randn(100, 3).astype(np.float32),
    ]

    # Create item
    item = AverageWaveformItem(
        unit_id=unit_id,
        channel_ids=channel_ids,
        waveform=waveform,
        waveform_std_dev=waveform_std_dev,
        waveform_percentiles=waveform_percentiles,
    )

    # Verify attributes
    assert item.unit_id == unit_id
    assert item.channel_ids == channel_ids
    assert np.array_equal(item.waveform, waveform)
    assert np.array_equal(item.waveform_std_dev, waveform_std_dev)
    assert len(item.waveform_percentiles) == 2
    assert all(
        np.array_equal(a, b)
        for a, b in zip(item.waveform_percentiles, waveform_percentiles)
    )
