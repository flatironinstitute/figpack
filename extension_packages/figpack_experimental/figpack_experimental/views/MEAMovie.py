import numpy as np

import figpack
from .experimental_extension import experimental_extension


class MEAMovie(figpack.ExtensionView):
    def __init__(
        self,
        raw_data: np.ndarray,
        electrode_coords: list | np.ndarray,
        start_time_sec: float,
        sampling_frequency_hz: float,
    ):
        """
        Initialize an MEA Movie view

        Args:
            raw_data: Raw signal data with shape (num_timepoints, num_channels), dtype int16
            electrode_coords: Electrode coordinates with shape (num_channels, 2)
            start_time_sec: Start time in seconds
            sampling_frequency_hz: Sampling frequency in Hz
        """
        super().__init__(
            extension=experimental_extension, view_type="experimental.MEAMovie"
        )

        # Validate inputs
        if raw_data.ndim != 2:
            raise ValueError(f"raw_data must be 2D array, got shape {raw_data.shape}")

        # Convert electrode_coords to numpy array if needed
        electrode_coords_array = np.array(electrode_coords, dtype=np.float32)
        if electrode_coords_array.ndim != 2 or electrode_coords_array.shape[1] != 2:
            raise ValueError(
                f"electrode_coords must have shape (num_channels, 2), got {electrode_coords_array.shape}"
            )

        num_timepoints, num_channels = raw_data.shape
        if electrode_coords_array.shape[0] != num_channels:
            raise ValueError(
                f"Number of electrode coordinates ({electrode_coords_array.shape[0]}) "
                f"must match number of channels ({num_channels})"
            )

        self.raw_data = raw_data.astype(np.int16)
        self.electrode_coords = electrode_coords_array
        self.start_time_sec = start_time_sec
        self.sampling_frequency_hz = sampling_frequency_hz
        self.num_timepoints = num_timepoints
        self.num_channels = num_channels

        # Calculate global min/max/median for normalization
        self.data_min = float(np.min(self.raw_data))
        self.data_max = float(np.max(self.raw_data))
        self.data_median = float(np.median(self.raw_data))

    def write_to_zarr_group(self, group: figpack.Group) -> None:
        """
        Write the data to a Zarr group

        Args:
            group: Zarr group to write data into
        """
        super().write_to_zarr_group(group)

        # Store metadata
        group.attrs["start_time_sec"] = self.start_time_sec
        group.attrs["sampling_frequency_hz"] = self.sampling_frequency_hz
        group.attrs["num_timepoints"] = self.num_timepoints
        group.attrs["num_channels"] = self.num_channels
        group.attrs["data_min"] = self.data_min
        group.attrs["data_max"] = self.data_max
        group.attrs["data_median"] = self.data_median

        # Store electrode coordinates
        group.create_dataset("electrode_coords", data=self.electrode_coords)

        # Store raw data with chunking optimized for time-based access
        # Chunk by a reasonable number of timepoints (100-200)
        num_timepoints_per_chunk = min(200, self.num_timepoints)
        chunks = (num_timepoints_per_chunk, self.num_channels)

        group.create_dataset("raw_data", data=self.raw_data, chunks=chunks)
