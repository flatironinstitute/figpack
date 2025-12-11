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
        spike_channel_indices: np.ndarray | None = None,
        spike_frame_indices: np.ndarray | None = None,
    ):
        """
        Initialize an MEA Movie view

        Args:
            raw_data: Raw signal data with shape (num_timepoints, num_channels), dtype int16
            electrode_coords: Electrode coordinates with shape (num_channels, 2)
            start_time_sec: Start time in seconds
            sampling_frequency_hz: Sampling frequency in Hz
            spike_channel_indices: Optional array of channel indices for spikes (dtype uint16)
            spike_frame_indices: Optional array of frame indices for spikes (dtype uint32)
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

        # Validate spike data if provided
        if spike_channel_indices is not None or spike_frame_indices is not None:
            if spike_channel_indices is None or spike_frame_indices is None:
                raise ValueError(
                    "Both spike_channel_indices and spike_frame_indices must be provided together"
                )

            spike_channel_indices_array = np.array(
                spike_channel_indices, dtype=np.uint16
            )
            spike_frame_indices_array = np.array(spike_frame_indices, dtype=np.uint32)

            if (
                spike_channel_indices_array.ndim != 1
                or spike_frame_indices_array.ndim != 1
            ):
                raise ValueError("Spike arrays must be 1-dimensional")

            if len(spike_channel_indices_array) != len(spike_frame_indices_array):
                raise ValueError(
                    f"spike_channel_indices length ({len(spike_channel_indices_array)}) "
                    f"must match spike_frame_indices length ({len(spike_frame_indices_array)})"
                )

            # Validate channel indices are within range
            if len(spike_channel_indices_array) > 0:
                if np.max(spike_channel_indices_array) >= num_channels:
                    raise ValueError(
                        f"spike_channel_indices contains values >= num_channels ({num_channels})"
                    )
                if np.max(spike_frame_indices_array) >= num_timepoints:
                    raise ValueError(
                        f"spike_frame_indices contains values >= num_timepoints ({num_timepoints})"
                    )

            self.spike_channel_indices = spike_channel_indices_array
            self.spike_frame_indices = spike_frame_indices_array
        else:
            self.spike_channel_indices = None
            self.spike_frame_indices = None

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

        # Store spike data if provided
        if (
            self.spike_channel_indices is not None
            and self.spike_frame_indices is not None
        ):
            num_spikes = len(self.spike_channel_indices)
            group.attrs["num_spikes"] = num_spikes

            # Store spike data with reasonable chunking (1000 spikes per chunk)
            spike_chunk_size = min(1000, max(1, num_spikes))

            group.create_dataset(
                "spike_channel_indices",
                data=self.spike_channel_indices,
                chunks=(spike_chunk_size,),
            )
            group.create_dataset(
                "spike_frame_indices",
                data=self.spike_frame_indices,
                chunks=(spike_chunk_size,),
            )
        else:
            group.attrs["num_spikes"] = 0
