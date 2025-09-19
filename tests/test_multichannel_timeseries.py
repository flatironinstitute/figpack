import math
from unittest.mock import MagicMock, patch

import numpy as np
import pytest
import zarr
import zarr.storage

import figpack
from figpack.views.MultiChannelTimeseries import MultiChannelTimeseries


def test_init_basic():
    """Test basic initialization"""
    data = np.random.randn(1000, 4).astype(np.float32)
    view = MultiChannelTimeseries(
        start_time_sec=0.0,
        sampling_frequency_hz=1000.0,
        data=data,
    )

    assert view.start_time_sec == 0.0
    assert view.sampling_frequency_hz == 1000.0
    assert np.array_equal(view.data, data)
    assert view.channel_ids == ["ch_0", "ch_1", "ch_2", "ch_3"]


def test_init_with_channel_ids():
    """Test initialization with custom channel IDs"""
    data = np.random.randn(1000, 3).astype(np.float32)
    channel_ids = ["A1", "B2", "C3"]
    view = MultiChannelTimeseries(
        start_time_sec=1.5,
        sampling_frequency_hz=500.0,
        data=data,
        channel_ids=channel_ids,
    )

    assert view.channel_ids == channel_ids
    assert np.array_equal(view.data, data)


def test_init_validation():
    """Test input validation"""
    # Test 1D data (invalid)
    data_1d = np.random.randn(1000)
    with pytest.raises(AssertionError, match="Data must be a 2D array"):
        MultiChannelTimeseries(
            start_time_sec=0.0,
            sampling_frequency_hz=1000.0,
            data=data_1d,
        )

    # Test invalid sampling frequency
    data_2d = np.random.randn(1000, 4)
    with pytest.raises(AssertionError, match="Sampling frequency must be positive"):
        MultiChannelTimeseries(
            start_time_sec=0.0,
            sampling_frequency_hz=-1.0,
            data=data_2d,
        )

    # Test mismatched channel IDs
    with pytest.raises(AssertionError, match="Number of channel_ids .* must match"):
        MultiChannelTimeseries(
            start_time_sec=0.0,
            sampling_frequency_hz=1000.0,
            data=data_2d,
            channel_ids=["A", "B"],  # Wrong length
        )


def test_downsampling_small_data():
    """Test downsampling with data smaller than minimum size"""
    data = np.random.randn(3, 2).astype(np.float32)  # Too small for downsampling
    view = MultiChannelTimeseries(
        start_time_sec=0.0,
        sampling_frequency_hz=1000.0,
        data=data,
    )
    assert len(view.downsampled_data) == 0  # No downsampling possible


def test_downsampling_basic():
    """Test basic downsampling functionality"""
    # Create test data with known min/max values
    data = np.zeros((16, 2), dtype=np.float32)
    data[0:4, 0] = [1, 2, -2, 1]  # First bin of channel 0
    data[4:8, 0] = [0, 3, -1, 0]  # Second bin of channel 0
    data[0:4, 1] = [-1, 1, -1, 0]  # First bin of channel 1
    data[4:8, 1] = [0, 2, -2, 1]  # Second bin of channel 1

    view = MultiChannelTimeseries(
        start_time_sec=0.0,
        sampling_frequency_hz=1000.0,
        data=data,
    )

    # Check level with factor=4
    level_4 = view.downsampled_data[4]
    assert level_4.shape == (4, 2, 2)  # (bins, min/max, channels)

    # Check first two bins of channel 0
    np.testing.assert_array_almost_equal(level_4[0, 0, 0], -2)  # min
    np.testing.assert_array_almost_equal(level_4[0, 1, 0], 2)  # max
    np.testing.assert_array_almost_equal(level_4[1, 0, 0], -1)  # min
    np.testing.assert_array_almost_equal(level_4[1, 1, 0], 3)  # max

    # Check first two bins of channel 1
    np.testing.assert_array_almost_equal(level_4[0, 0, 1], -1)  # min
    np.testing.assert_array_almost_equal(level_4[0, 1, 1], 1)  # max
    np.testing.assert_array_almost_equal(level_4[1, 0, 1], -2)  # min
    np.testing.assert_array_almost_equal(level_4[1, 1, 1], 2)  # max


def test_optimal_chunk_size():
    """Test chunk size calculation"""
    data = np.random.randn(8192, 4).astype(np.float32)  # Power of 2 size
    view = MultiChannelTimeseries(
        start_time_sec=0.0,
        sampling_frequency_hz=1000.0,
        data=data,
    )

    # Test original data shape
    chunks = view._calculate_optimal_chunk_size(data.shape)
    assert len(chunks) == 2
    assert chunks[1] == 4  # n_channels
    # Verify chunk_timepoints is a power of 2
    chunk_timepoints = chunks[0]
    assert chunk_timepoints > 0
    assert chunk_timepoints & (chunk_timepoints - 1) == 0  # Power of 2 check

    # Test downsampled shape (power of 2)
    ds_shape = (2048, 2, 4)  # Power of 2 size
    chunks = view._calculate_optimal_chunk_size(ds_shape)
    assert len(chunks) == 3
    assert chunks[1:] == (2, 4)  # (2, n_channels)
    # Verify chunk_timepoints is a power of 2
    chunk_timepoints = chunks[0]
    assert chunk_timepoints > 0
    assert chunk_timepoints & (chunk_timepoints - 1) == 0  # Power of 2 check

    # Test with custom target size
    small_chunks = view._calculate_optimal_chunk_size(data.shape, target_size_mb=0.1)
    large_chunks = view._calculate_optimal_chunk_size(data.shape, target_size_mb=10.0)
    assert small_chunks[0] < large_chunks[0]  # Bigger target = bigger chunks
    # Both should still be powers of 2
    assert small_chunks[0] & (small_chunks[0] - 1) == 0
    assert large_chunks[0] & (large_chunks[0] - 1) == 0

    # Test with data size smaller than target chunk size
    small_data = np.random.randn(256, 4).astype(np.float32)
    small_chunks = view._calculate_optimal_chunk_size(
        small_data.shape, target_size_mb=10.0
    )
    assert small_chunks[0] <= 256  # Should not exceed data size
    assert small_chunks[0] & (small_chunks[0] - 1) == 0  # Still power of 2


def test_zarr_storage(tmp_path):
    """Test writing to Zarr storage"""
    data = np.random.randn(1000, 4).astype(np.float32)
    channel_ids = ["A", "B", "C", "D"]
    view = MultiChannelTimeseries(
        start_time_sec=1.5,
        sampling_frequency_hz=500.0,
        data=data,
        channel_ids=channel_ids,
    )

    # Create Zarr group
    store = zarr.storage.MemoryStore()
    root = zarr.group(store=store)
    group = figpack.Group(root.create_group("test"))

    # Write data
    view.write_to_zarr_group(group)

    # Verify metadata
    assert group.attrs["view_type"] == "MultiChannelTimeseries"
    assert group.attrs["start_time_sec"] == 1.5
    assert group.attrs["sampling_frequency_hz"] == 500.0
    assert group.attrs["channel_ids"] == channel_ids
    assert group.attrs["n_timepoints"] == 1000
    assert group.attrs["n_channels"] == 4

    # Verify data
    np.testing.assert_array_equal(group["data"][:], data)

    # Verify downsampled data
    for factor in group.attrs["downsample_factors"]:
        ds_data = group[f"data_ds_{factor}"][:]
        assert ds_data.shape[1] == 2  # min/max dimension
        assert ds_data.shape[2] == 4  # n_channels


def test_zarr_chunking(tmp_path):
    """Test Zarr chunking configuration"""
    # Create large enough data to force multiple chunks, use power of 2
    data = np.random.randn(65536, 4).astype(np.float32)  # 2^16
    view = MultiChannelTimeseries(
        start_time_sec=0.0,
        sampling_frequency_hz=1000.0,
        data=data,
    )

    store = zarr.storage.MemoryStore()
    root = zarr.group(store=store)
    group = figpack.Group(root.create_group("test"))

    # Write data
    view.write_to_zarr_group(group)

    # Check original data chunking
    assert group["data"].chunks[1] == 4  # Channel dimension
    assert math.log2(group["data"].chunks[0]).is_integer()  # Power of 2

    # Check downsampled data chunking
    for factor in group.attrs["downsample_factors"]:
        ds = group[f"data_ds_{factor}"]
        assert ds.chunks[1:] == (2, 4)  # (min/max, channels)
        assert math.log2(ds.chunks[0]).is_integer()  # Power of 2
