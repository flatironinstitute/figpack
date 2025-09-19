"""
Multi-channel timeseries visualization component
"""

import math
from typing import List, Optional, Union

import numpy as np

from ..core.figpack_view import FigpackView
from ..core.zarr import Group


class MultiChannelTimeseries(FigpackView):
    """
    A multi-channel timeseries visualization component
    """

    def __init__(
        self,
        *,
        start_time_sec: float,
        sampling_frequency_hz: float,
        data: np.ndarray,
        channel_ids: Optional[List[Union[str, int]]] = None,
    ):
        """
        Initialize a MultiChannelTimeseries view

        Args:
            start_time_sec: Starting time in seconds
            sampling_frequency_hz: Sampling rate in Hz
            data: N×M numpy array where N is timepoints and M is channels
            channel_ids: Optional list of channel identifiers
        """
        assert data.ndim == 2, "Data must be a 2D array (timepoints × channels)"
        assert sampling_frequency_hz > 0, "Sampling frequency must be positive"

        self.start_time_sec = start_time_sec
        self.sampling_frequency_hz = sampling_frequency_hz
        self.data = data.astype(np.float32)  # Ensure float32 for efficiency

        n_timepoints, n_channels = data.shape

        # Set channel IDs
        if channel_ids is None:
            self.channel_ids = [f"ch_{i}" for i in range(n_channels)]
        else:
            assert len(channel_ids) == n_channels, (
                f"Number of channel_ids ({len(channel_ids)}) must match "
                f"number of channels ({n_channels})"
            )
            self.channel_ids = [str(ch_id) for ch_id in channel_ids]

        # Prepare downsampled arrays for efficient rendering
        self.downsampled_data = self._compute_downsampled_data()

    def _compute_downsampled_data(self) -> dict:
        """
        Compute downsampled arrays at power-of-4 factors using a vectorized
        min/max pyramid with NaN padding for partial bins.

        Returns:
            dict: {factor: (ceil(N/factor), 2, M) float32 array}, where the second
                axis stores [min, max] per bin per channel.
        """
        data = self.data  # (N, M), float32
        n_timepoints, n_channels = data.shape
        downsampled = {}

        if n_timepoints < 4:
            # No level with factor >= 4 fits the stop condition (factor < N)
            return downsampled

        def _first_level_from_raw(x: np.ndarray) -> np.ndarray:
            """Build the factor=4 level directly from the raw data."""
            N, M = x.shape
            n_bins = math.ceil(N / 4)
            pad = n_bins * 4 - N
            # Pad time axis with NaNs so min/max ignore the padded tail
            x_pad = np.pad(
                x, ((0, pad), (0, 0)), mode="constant", constant_values=np.nan
            )
            blk = x_pad.reshape(n_bins, 4, M)  # (B, 4, M)
            mins = np.nanmin(blk, axis=1)  # (B, M)
            maxs = np.nanmax(blk, axis=1)  # (B, M)
            out = np.empty((n_bins, 2, M), dtype=np.float32)
            out[:, 0, :] = mins
            out[:, 1, :] = maxs
            return out

        def _downsample4_bins(level_minmax: np.ndarray) -> np.ndarray:
            """
            Build the next pyramid level from the previous one by grouping every 4
            bins. Input is (B, 2, M) -> Output is (ceil(B/4), 2, M).
            """
            B, two, M = level_minmax.shape
            assert two == 2
            n_bins_next = math.ceil(B / 4)
            pad = n_bins_next * 4 - B
            lvl_pad = np.pad(
                level_minmax,
                ((0, pad), (0, 0), (0, 0)),
                mode="constant",
                constant_values=np.nan,
            )
            blk = lvl_pad.reshape(n_bins_next, 4, 2, M)  # (B', 4, 2, M)

            # Next mins from mins; next maxs from maxs
            mins = np.nanmin(blk[:, :, 0, :], axis=1)  # (B', M)
            maxs = np.nanmax(blk[:, :, 1, :], axis=1)  # (B', M)

            out = np.empty((n_bins_next, 2, M), dtype=np.float32)
            out[:, 0, :] = mins
            out[:, 1, :] = maxs
            return out

        # Level 1: factor = 4 from raw data
        factor = 4
        level = _first_level_from_raw(data)
        downsampled[factor] = level

        # Higher levels: factor *= 4 each time, built from previous level
        factor *= 4  # -> 16
        while factor < n_timepoints / 1000:
            level = _downsample4_bins(level)
            downsampled[factor] = level
            factor *= 4

        return downsampled

    def _calculate_optimal_chunk_size(
        self, shape: tuple, target_size_mb: float = 5.0
    ) -> tuple:
        """
        Calculate optimal chunk size for Zarr storage targeting ~5MB per chunk

        Args:
            shape: Array shape (n_timepoints, ..., n_channels)
            target_size_mb: Target chunk size in MB

        Returns:
            Tuple of chunk dimensions
        """
        # Calculate bytes per element (float32 = 4 bytes)
        bytes_per_element = 4
        target_size_bytes = target_size_mb * 1024 * 1024

        if len(shape) == 2:  # Original data: (n_timepoints, n_channels)
            n_timepoints, n_channels = shape
            elements_per_timepoint = n_channels
        elif len(shape) == 3:  # Downsampled data: (n_timepoints, 2, n_channels)
            n_timepoints, _, n_channels = shape
            elements_per_timepoint = 2 * n_channels
        else:
            raise ValueError(f"Unsupported shape: {shape}")

        # Calculate chunk size in timepoints
        max_timepoints_per_chunk = target_size_bytes // (
            elements_per_timepoint * bytes_per_element
        )

        # Find next lower power of 2
        chunk_timepoints = 2 ** math.floor(math.log2(max_timepoints_per_chunk))
        chunk_timepoints = max(chunk_timepoints, 1)  # At least 1
        chunk_timepoints = min(chunk_timepoints, n_timepoints)  # At most n_timepoints

        # If n_timepoints is less than our calculated size, round down to next power of 2
        if chunk_timepoints > n_timepoints:
            chunk_timepoints = 2 ** math.floor(math.log2(n_timepoints))

        if len(shape) == 2:
            return (chunk_timepoints, n_channels)
        else:  # len(shape) == 3
            return (chunk_timepoints, 2, n_channels)

    def write_to_zarr_group(self, group: Group) -> None:
        """
        Write the multi-channel timeseries data to a Zarr group

        Args:
            group: Zarr group to write data into
        """
        group.attrs["view_type"] = "MultiChannelTimeseries"

        # Store metadata
        group.attrs["start_time_sec"] = self.start_time_sec
        group.attrs["sampling_frequency_hz"] = self.sampling_frequency_hz
        group.attrs["channel_ids"] = self.channel_ids

        n_timepoints, n_channels = self.data.shape
        group.attrs["n_timepoints"] = n_timepoints
        group.attrs["n_channels"] = n_channels

        # Store original data with optimal chunking
        original_chunks = self._calculate_optimal_chunk_size(self.data.shape)
        group.create_dataset(
            "data",
            data=self.data,
            chunks=original_chunks,
        )

        # Store downsampled data arrays
        downsample_factors = list(self.downsampled_data.keys())
        group.attrs["downsample_factors"] = downsample_factors

        for factor, downsampled_array in self.downsampled_data.items():
            dataset_name = f"data_ds_{factor}"

            # Calculate optimal chunks for this downsampled array
            ds_chunks = self._calculate_optimal_chunk_size(downsampled_array.shape)

            group.create_dataset(
                dataset_name,
                data=downsampled_array,
                chunks=ds_chunks,
            )

        print(
            f"Stored MultiChannelTimeseries with {len(downsample_factors)} downsampled levels:"
        )
        print(f"  Original: {self.data.shape} (chunks: {original_chunks})")
        for factor in downsample_factors:
            ds_shape = self.downsampled_data[factor].shape
            ds_chunks = self._calculate_optimal_chunk_size(ds_shape)
            print(f"  Factor {factor}: {ds_shape} (chunks: {ds_chunks})")
