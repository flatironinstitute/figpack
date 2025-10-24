"""
Spectrogram visualization component
"""

import math

from .experimental_extension import experimental_extension
import numpy as np
from typing import Optional

from figpack import Group, ExtensionView


class LinearDecode(ExtensionView):
    """
    A linear decode visualization component for time-position data
    """

    def __init__(
        self,
        *,
        start_time_sec: float,
        sampling_frequency_hz: float,
        data: np.ndarray,
        observed_positions: Optional[np.ndarray],
        position_grid: np.ndarray,
    ):
        """
        Initialize a LinearDecode view

        Args:
            start_time_sec: Starting time in seconds
            sampling_frequency_hz: Sampling rate in Hz
            data: N×M numpy array where N is timepoints and M is the number of spatial positions
            observed_positions: Vector of length N specifying the observed position at each timepoint in units corresponding to the position_grid, or None if not available
            position_grid: 1D numpy array specifying the spatial positions corresponding to the columns of the data array. For now we assume this is uniform.
        """
        super().__init__(
            extension=experimental_extension, view_type="experimental.LinearDecode"
        )

        assert data.ndim == 2, "Data must be a 2D array (timepoints × frequencies)"
        assert sampling_frequency_hz > 0, "Sampling frequency must be positive"

        self.start_time_sec = start_time_sec
        self.sampling_frequency_hz = sampling_frequency_hz
        self.data = data.astype(np.float32)  # Ensure float32 for efficiency

        n_timepoints, n_positions = data.shape
        self.n_timepoints = n_timepoints
        self.n_positions = n_positions

        # Calculate data range for color scaling
        self.data_min = float(np.nanmin(data))
        self.data_max = float(np.nanmax(data))

        # Prepare downsampled arrays for efficient rendering
        self.downsampled_data = self._compute_downsampled_data()

        self.observed_positions = observed_positions.astype(np.float32)
        self.position_grid = position_grid.astype(np.float32)

    def _compute_downsampled_data(self) -> dict:
        """
        Compute downsampled arrays at power-of-4 factors using max values only.

        Returns:
            dict: {factor: (ceil(N/factor), M) float32 array}, where each bin
                contains the maximum value across the time dimension.
        """
        data = self.data  # (N, M), float32
        n_timepoints, n_frequencies = data.shape
        downsampled = {}

        if n_timepoints < 4:
            # No level with factor >= 4 fits the stop condition (factor < N)
            return downsampled

        def _first_level_from_raw(x: np.ndarray) -> np.ndarray:
            """Build the factor=4 level directly from the raw data."""
            N, M = x.shape
            n_bins = math.ceil(N / 4)
            pad = n_bins * 4 - N
            # Pad time axis with NaNs so max ignores the padded tail
            x_pad = np.pad(
                x, ((0, pad), (0, 0)), mode="constant", constant_values=np.nan
            )
            blk = x_pad.reshape(n_bins, 4, M)  # (B, 4, M)
            maxs = np.nanmax(blk, axis=1)  # (B, M)
            return maxs.astype(np.float32)

        def _downsample4_bins(level_max: np.ndarray) -> np.ndarray:
            """
            Build the next pyramid level from the previous one by grouping every 4
            bins. Input is (B, M) -> Output is (ceil(B/4), M).
            """
            B, M = level_max.shape
            n_bins_next = math.ceil(B / 4)
            pad = n_bins_next * 4 - B
            lvl_pad = np.pad(
                level_max,
                ((0, pad), (0, 0)),
                mode="constant",
                constant_values=np.nan,
            )
            blk = lvl_pad.reshape(n_bins_next, 4, M)  # (B', 4, M)

            # Next maxs from maxs
            maxs = np.nanmax(blk, axis=1)  # (B', M)
            return maxs.astype(np.float32)

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
            shape: Array shape (n_timepoints, n_frequencies)
            target_size_mb: Target chunk size in MB

        Returns:
            Tuple of chunk dimensions
        """
        # Calculate bytes per element (float32 = 4 bytes)
        bytes_per_element = 4
        target_size_bytes = target_size_mb * 1024 * 1024

        n_timepoints, n_frequencies = shape
        elements_per_timepoint = n_frequencies

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

        return (chunk_timepoints, n_frequencies)

    def write_to_zarr_group(self, group: Group) -> None:
        """
        Write the linear decode data to a Zarr group

        Args:
            group: Zarr group to write data into
        """
        super().write_to_zarr_group(group)

        # Store metadata
        group.attrs["start_time_sec"] = self.start_time_sec
        group.attrs["sampling_frequency_hz"] = self.sampling_frequency_hz
        group.attrs["n_timepoints"] = self.n_timepoints
        group.attrs["n_positions"] = self.n_positions
        group.attrs["data_min"] = self.data_min
        group.attrs["data_max"] = self.data_max

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

        print(f"Stored data with {len(downsample_factors)} downsampled levels:")
        print(f"  Original: {self.data.shape} (chunks: {original_chunks})")
        for factor in downsample_factors:
            ds_shape = self.downsampled_data[factor].shape
            ds_chunks = self._calculate_optimal_chunk_size(ds_shape)
            print(f"  Factor {factor}: {ds_shape} (chunks: {ds_chunks})")

        # Store observed positions
        if self.observed_positions is not None:
            group.create_dataset(
                "observed_positions",
                data=self.observed_positions,
                chunks=(min(1024 * 1024, len(self.observed_positions)),),
            )

        # Store position grid
        group.create_dataset(
            "position_grid",
            data=self.position_grid,
            chunks=(min(1024 * 1024, len(self.position_grid)),),
        )
