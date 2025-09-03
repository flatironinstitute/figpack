"""
Tests for the Spectrogram view
"""

import numpy as np
import pytest
import tempfile
import os
from figpack.views import Spectrogram


def test_spectrogram_creation():
    """Test basic Spectrogram creation"""
    # Create test data
    n_timepoints = 1000
    n_frequencies = 50
    data = np.random.random((n_timepoints, n_frequencies)).astype(np.float32)

    # Create spectrogram
    view = Spectrogram(
        start_time_sec=0.0,
        sampling_frequency_hz=100.0,
        frequency_min_hz=10.0,
        frequency_delta_hz=2.0,
        data=data,
    )

    # Check basic properties
    assert view.start_time_sec == 0.0
    assert view.sampling_frequency_hz == 100.0
    assert view.frequency_min_hz == 10.0
    assert view.frequency_delta_hz == 2.0
    assert view.n_timepoints == n_timepoints
    assert view.n_frequencies == n_frequencies
    assert view.data.shape == (n_timepoints, n_frequencies)
    assert view.data.dtype == np.float32


def test_spectrogram_frequency_bins():
    """Test frequency bin calculation"""
    n_timepoints = 100
    n_frequencies = 10
    data = np.random.random((n_timepoints, n_frequencies)).astype(np.float32)

    view = Spectrogram(
        start_time_sec=0.0,
        sampling_frequency_hz=100.0,
        frequency_min_hz=10.0,
        frequency_delta_hz=5.0,
        data=data,
    )

    expected_bins = np.array(
        [10.0, 15.0, 20.0, 25.0, 30.0, 35.0, 40.0, 45.0, 50.0, 55.0]
    )
    np.testing.assert_array_almost_equal(view.frequency_bins, expected_bins)


def test_spectrogram_downsampling():
    """Test downsampling computation"""
    # Create larger dataset to trigger downsampling
    n_timepoints = 5000
    n_frequencies = 20
    data = np.random.random((n_timepoints, n_frequencies)).astype(np.float32)

    view = Spectrogram(
        start_time_sec=0.0,
        sampling_frequency_hz=1000.0,
        frequency_min_hz=10.0,
        frequency_delta_hz=5.0,
        data=data,
    )

    # Should have downsampled data
    assert len(view.downsampled_data) > 0

    # Check that downsampled arrays have correct shape
    for factor, downsampled_array in view.downsampled_data.items():
        expected_length = np.ceil(n_timepoints / factor)
        assert downsampled_array.shape == (expected_length, n_frequencies)
        assert downsampled_array.dtype == np.float32


def test_spectrogram_data_range():
    """Test data range calculation"""
    n_timepoints = 100
    n_frequencies = 10

    # Create data with known min/max
    data = np.full((n_timepoints, n_frequencies), 0.5, dtype=np.float32)
    data[0, 0] = 0.1  # min
    data[-1, -1] = 0.9  # max

    view = Spectrogram(
        start_time_sec=0.0,
        sampling_frequency_hz=100.0,
        frequency_min_hz=10.0,
        frequency_delta_hz=5.0,
        data=data,
    )

    assert abs(view.data_min - 0.1) < 1e-6
    assert abs(view.data_max - 0.9) < 1e-6


def test_spectrogram_invalid_inputs():
    """Test error handling for invalid inputs"""
    # Test 1D data (should fail)
    with pytest.raises(AssertionError, match="Data must be a 2D array"):
        Spectrogram(
            start_time_sec=0.0,
            sampling_frequency_hz=100.0,
            frequency_min_hz=10.0,
            frequency_delta_hz=5.0,
            data=np.array([1, 2, 3]),
        )

    # Test negative sampling frequency (should fail)
    with pytest.raises(AssertionError, match="Sampling frequency must be positive"):
        Spectrogram(
            start_time_sec=0.0,
            sampling_frequency_hz=-100.0,
            frequency_min_hz=10.0,
            frequency_delta_hz=5.0,
            data=np.random.random((100, 10)),
        )

    # Test negative frequency delta (should fail)
    with pytest.raises(AssertionError, match="Frequency delta must be positive"):
        Spectrogram(
            start_time_sec=0.0,
            sampling_frequency_hz=100.0,
            frequency_min_hz=10.0,
            frequency_delta_hz=-5.0,
            data=np.random.random((100, 10)),
        )


def test_spectrogram_zarr_serialization():
    """Test Zarr serialization"""
    n_timepoints = 200
    n_frequencies = 15
    data = np.random.random((n_timepoints, n_frequencies)).astype(np.float32)

    view = Spectrogram(
        start_time_sec=1.0,
        sampling_frequency_hz=50.0,
        frequency_min_hz=5.0,
        frequency_delta_hz=3.0,
        data=data,
    )

    # Test serialization to temporary directory
    with tempfile.TemporaryDirectory() as temp_dir:
        zarr_path = os.path.join(temp_dir, "test.zarr")

        # This would normally be called by the show() method
        import zarr

        store = zarr.DirectoryStore(zarr_path)
        root = zarr.group(store=store)
        view._write_to_zarr_group(root)

        # Check that the zarr group was created with correct attributes
        assert root.attrs["view_type"] == "Spectrogram"
        assert root.attrs["start_time_sec"] == 1.0
        assert root.attrs["sampling_frequency_hz"] == 50.0
        assert root.attrs["frequency_min_hz"] == 5.0
        assert root.attrs["frequency_delta_hz"] == 3.0
        assert root.attrs["n_timepoints"] == n_timepoints
        assert root.attrs["n_frequencies"] == n_frequencies

        # Check that datasets were created
        assert "data" in root
        assert "frequency_bins" in root

        # Check data integrity
        stored_data = root["data"][:]
        np.testing.assert_array_equal(stored_data, data)

        stored_freq_bins = root["frequency_bins"][:]
        np.testing.assert_array_equal(stored_freq_bins, view.frequency_bins)


if __name__ == "__main__":
    pytest.main([__file__])
