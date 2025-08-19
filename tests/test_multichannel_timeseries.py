"""
Tests for MultiChannelTimeseries view
"""

import pytest
import numpy as np
import zarr
import tempfile

from figpack.views.MultiChannelTimeseries import MultiChannelTimeseries


class TestMultiChannelTimeseries:
    """Test MultiChannelTimeseries view functionality"""

    def test_basic_creation(self):
        """Test basic MultiChannelTimeseries creation"""
        # Create simple test data
        data = np.random.randn(1000, 3).astype(np.float32)

        view = MultiChannelTimeseries(
            start_time_sec=0.0,
            sampling_frequency_hz=1000.0,
            data=data,
        )

        assert view.start_time_sec == 0.0
        assert view.sampling_frequency_hz == 1000.0
        assert view.data.shape == (1000, 3)
        assert view.channel_ids == ["ch_0", "ch_1", "ch_2"]

    def test_with_custom_channel_ids(self):
        """Test with custom channel IDs"""
        data = np.random.randn(500, 2).astype(np.float32)
        channel_ids = ["EEG1", "EEG2"]

        view = MultiChannelTimeseries(
            start_time_sec=1.0,
            sampling_frequency_hz=500.0,
            data=data,
            channel_ids=channel_ids,
        )

        assert view.channel_ids == channel_ids

    def test_data_validation(self):
        """Test input validation"""
        # Test 1D data (should fail)
        with pytest.raises(AssertionError):
            MultiChannelTimeseries(
                start_time_sec=0.0,
                sampling_frequency_hz=1000.0,
                data=np.array([1, 2, 3, 4]),
            )

        # Test negative sampling frequency (should fail)
        with pytest.raises(AssertionError):
            MultiChannelTimeseries(
                start_time_sec=0.0,
                sampling_frequency_hz=-1000.0,
                data=np.random.randn(100, 2),
            )

    def test_write_to_zarr(self):
        """Test writing to zarr group"""
        with tempfile.TemporaryDirectory() as temp_dir:
            # Create test data similar to example
            sampling_freq = 1000
            duration = 1
            n_timepoints = sampling_freq * duration

            t = np.linspace(0, duration, n_timepoints)
            data = np.zeros((n_timepoints, 2), dtype=np.float32)
            data[:, 0] = np.sin(2 * np.pi * 2 * t)  # 2 Hz sine
            data[:, 1] = np.sin(2 * np.pi * 5 * t)  # 5 Hz sine

            view = MultiChannelTimeseries(
                start_time_sec=0.0,
                sampling_frequency_hz=sampling_freq,
                data=data,
                channel_ids=["Sine_2Hz", "Sine_5Hz"],
            )

            # Write to zarr
            store = zarr.DirectoryStore(temp_dir)
            root = zarr.group(store=store)
            view._write_to_zarr_group(root)

            # Verify basic attributes
            assert root.attrs["view_type"] == "MultiChannelTimeseries"
            assert root.attrs["sampling_frequency_hz"] == sampling_freq
            assert root.attrs["channel_ids"] == ["Sine_2Hz", "Sine_5Hz"]
            assert "data" in root

    def test_example_pattern(self):
        """Test using pattern from example file"""
        # Simple version of the example
        sampling_freq = 1000
        duration = 0.5  # Short duration for test
        n_timepoints = int(sampling_freq * duration)

        t = np.linspace(0, duration, n_timepoints)
        data = np.zeros((n_timepoints, 2), dtype=np.float32)

        # Two simple sine waves
        data[:, 0] = np.sin(2 * np.pi * 2 * t)
        data[:, 1] = np.sin(2 * np.pi * 5 * t)

        view = MultiChannelTimeseries(
            start_time_sec=0.0,
            sampling_frequency_hz=sampling_freq,
            data=data,
            channel_ids=["Sine_2Hz", "Sine_5Hz"],
        )

        assert view.data.shape == (n_timepoints, 2)
        assert view.channel_ids == ["Sine_2Hz", "Sine_5Hz"]
