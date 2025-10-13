"""
Multi-channel timeseries visualization component
"""

from typing import List, Optional, Union

import numpy as np

import figpack
from .experimental_extension import experimental_extension


class MultiChannelIntervals(figpack.ExtensionView):
    """
    A multi-channel intervals visualization component
    """

    def __init__(
        self,
        *,
        sampling_frequency_hz: float,
        data: np.ndarray,  # 3D (interval, timepoints, channels)
        channel_ids: Optional[List[Union[str, int]]] = None,
        window_start_times_sec: np.ndarray,
        interval_start_times_sec: np.ndarray,
        interval_end_times_sec: np.ndarray,
    ):
        """
        Initialize a MultiChannelIntervals view

        Args:
            sampling_frequency_hz: Sampling rate in Hz
            data: 3D numpy array where dimensions are (interval, timepoints, channels)
            channel_ids: Optional list of channel identifiers
            window_start_times_sec: 1D array of window start times in seconds
            interval_start_times_sec: 1D array of interval start times in seconds
            interval_end_times_sec: 1D array of interval end times in seconds
        """
        super().__init__(
            extension=experimental_extension,
            view_type="experimental.MultiChannelIntervals",
        )

        assert (
            data.ndim == 3
        ), "Data must be a 3D array (interval, timepoints, channels)"
        assert sampling_frequency_hz > 0, "Sampling frequency must be positive"

        self.sampling_frequency_hz = sampling_frequency_hz
        self.window_start_times_sec = window_start_times_sec
        self.interval_start_times_sec = interval_start_times_sec
        self.interval_end_times_sec = interval_end_times_sec
        self.data = data.astype(np.float32)  # Ensure float32 for efficiency

        n_intervals, n_timepoints, n_channels = data.shape

        # Set channel IDs
        if channel_ids is None:
            self.channel_ids = [f"ch_{i}" for i in range(n_channels)]
        else:
            assert len(channel_ids) == n_channels, (
                f"Number of channel_ids ({len(channel_ids)}) must match "
                f"number of channels ({n_channels})"
            )
            self.channel_ids = [str(ch_id) for ch_id in channel_ids]

    def write_to_zarr_group(self, group: figpack.Group) -> None:
        """
        Write the view data to a Zarr group

        Args:
            group: Zarr group to write data into
        """
        super().write_to_zarr_group(group)

        # Store metadata
        group.attrs["sampling_frequency_hz"] = self.sampling_frequency_hz
        group.attrs["channel_ids"] = self.channel_ids

        n_intervals, n_timepoints, n_channels = self.data.shape
        group.attrs["n_intervals"] = n_intervals
        group.attrs["n_timepoints"] = n_timepoints
        group.attrs["n_channels"] = n_channels

        chunk_size = _calculate_optimal_chunk_size(
            n_intervals, n_timepoints, n_channels
        )
        group.create_dataset(
            "data",
            data=self.data,
            chunks=chunk_size,
        )

        group.create_dataset(
            "window_start_times_sec",
            data=self.window_start_times_sec,
            chunks=True,
        )
        group.create_dataset(
            "interval_start_times_sec",
            data=self.interval_start_times_sec,
            chunks=True,
        )
        group.create_dataset(
            "interval_end_times_sec",
            data=self.interval_end_times_sec,
            chunks=True,
        )


def _calculate_optimal_chunk_size(n_intervals: int, n_timepoints: int, n_channels: int):
    # We want around 5 MB per chunk
    # And we want to use full chunks in second and third dimensions
    target_chunk_size_bytes = 5 * 1024 * 1024
    bytes_per_element = 4  # float32
    elements_per_interval = n_timepoints * n_channels
    max_intervals_per_chunk = target_chunk_size_bytes // (
        elements_per_interval * bytes_per_element
    )
    max_intervals_per_chunk = max(max_intervals_per_chunk, 1)  # At least 1
    max_intervals_per_chunk = min(
        max_intervals_per_chunk, n_intervals
    )  # At most n_intervals
    return (max_intervals_per_chunk, n_timepoints, n_channels)
