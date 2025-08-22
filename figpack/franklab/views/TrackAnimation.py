"""
TrackAnimation view for figpack - displays animated tracking data
"""

from typing import Optional

import numpy as np
import zarr

from ...core.figpack_view import FigpackView


class TrackAnimation(FigpackView):
    """
    A track animation visualization component for displaying animal tracking data
    """

    def __init__(
        self,
        *,
        bin_height: float,
        bin_width: float,
        frame_bounds: np.ndarray,
        locations: np.ndarray,
        values: np.ndarray,
        xcount: int,
        ycount: int,
        xmin: float,
        ymin: float,
        head_direction: np.ndarray,
        positions: np.ndarray,
        timestamps: np.ndarray,
        track_bin_corners: np.ndarray,
        sampling_frequency_hz: float,
        timestamp_start: float,
        total_recording_frame_length: int,
        track_bin_height: float,
        track_bin_width: float,
        xmax: float,
        ymax: float,
    ):
        """
        Initialize a TrackAnimation view

        Args:
            bin_height: Height of spatial bins
            bin_width: Width of spatial bins
            frame_bounds: Array of frame boundaries
            locations: Array of spatial locations
            values: Array of values at each location
            xcount: Number of bins in x direction
            ycount: Number of bins in y direction
            xmin: Minimum x coordinate
            ymin: Minimum y coordinate
            head_direction: Array of head direction angles
            positions: Array of position coordinates (2D)
            timestamps: Array of timestamps
            track_bin_corners: Array of track bin corner coordinates
            sampling_frequency_hz: Sampling frequency in Hz
            timestamp_start: Start timestamp
            total_recording_frame_length: Total number of frames
            track_bin_height: Height of track bins
            track_bin_width: Width of track bins
            xmax: Maximum x coordinate
            ymax: Maximum y coordinate
        """
        # Validate input arrays
        assert isinstance(
            frame_bounds, np.ndarray
        ), "frame_bounds must be a numpy array"
        assert isinstance(locations, np.ndarray), "locations must be a numpy array"
        assert isinstance(values, np.ndarray), "values must be a numpy array"
        assert isinstance(
            head_direction, np.ndarray
        ), "head_direction must be a numpy array"
        assert isinstance(positions, np.ndarray), "positions must be a numpy array"
        assert isinstance(timestamps, np.ndarray), "timestamps must be a numpy array"
        assert isinstance(
            track_bin_corners, np.ndarray
        ), "track_bin_corners must be a numpy array"

        assert len(locations) == len(
            values
        ), "locations and values must have same length"
        assert len(head_direction) == len(
            timestamps
        ), "head_direction and timestamps must have same length"
        assert positions.shape[1] == len(
            timestamps
        ), "positions second dimension must match timestamps length"
        assert positions.shape[0] == 2, "positions must have shape (2, N)"

        # Store spatial binning parameters
        self.bin_height = bin_height
        self.bin_width = bin_width
        self.xcount = xcount
        self.ycount = ycount
        self.xmin = xmin
        self.ymin = ymin
        self.xmax = xmax
        self.ymax = ymax

        # Store arrays
        self.frame_bounds = frame_bounds
        self.locations = locations
        self.values = values
        self.head_direction = head_direction
        self.positions = positions
        self.timestamps = timestamps
        self.track_bin_corners = track_bin_corners

        # Store metadata
        self.sampling_frequency_hz = sampling_frequency_hz
        self.timestamp_start = timestamp_start
        self.total_recording_frame_length = total_recording_frame_length
        self.track_bin_height = track_bin_height
        self.track_bin_width = track_bin_width

    def _write_to_zarr_group(self, group: zarr.Group) -> None:
        """
        Write the track animation data to a Zarr group

        Args:
            group: Zarr group to write data into
        """
        # Set view type
        group.attrs["view_type"] = "TrackAnimation"

        # Store spatial binning parameters
        group.attrs["bin_height"] = self.bin_height
        group.attrs["bin_width"] = self.bin_width
        group.attrs["xcount"] = self.xcount
        group.attrs["ycount"] = self.ycount
        group.attrs["xmin"] = self.xmin
        group.attrs["ymin"] = self.ymin
        group.attrs["xmax"] = self.xmax
        group.attrs["ymax"] = self.ymax

        # Store metadata
        group.attrs["sampling_frequency_hz"] = self.sampling_frequency_hz
        group.attrs["timestamp_start"] = self.timestamp_start
        group.attrs["total_recording_frame_length"] = self.total_recording_frame_length
        group.attrs["track_bin_height"] = self.track_bin_height
        group.attrs["track_bin_width"] = self.track_bin_width

        # Store arrays as datasets
        group.create_dataset("frame_bounds", data=self.frame_bounds)
        group.create_dataset("locations", data=self.locations)
        group.create_dataset("values", data=self.values)
        group.create_dataset("head_direction", data=self.head_direction)
        group.create_dataset("positions", data=self.positions)
        group.create_dataset("timestamps", data=self.timestamps)
        group.create_dataset("track_bin_corners", data=self.track_bin_corners)
