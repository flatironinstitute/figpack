"""
Views module for figpack - contains visualization components
"""

import math
from typing import Any, Dict, List, Optional, Tuple, Union

import numpy as np

from ..core.figpack_view import FigpackView
from ..core.zarr import Group


class TimeseriesGraph(FigpackView):
    """
    A timeseries graph visualization component
    """

    def __init__(
        self,
        *,
        legend_opts: Optional[Dict[str, Any]] = None,
        y_range: Optional[List[float]] = None,
        hide_x_gridlines: bool = False,
        hide_y_gridlines: bool = False,
        hide_nav_toolbar: bool = False,
        hide_time_axis_labels: bool = False,
        y_label: str = "",
    ) -> None:
        """
        Initialize a TimeseriesGraph

        Args:
            legend_opts: Dictionary of legend options (e.g., {"location": "northwest"})
            y_range: Y-axis range as [min, max]
            hide_x_gridlines: Whether to hide x-axis gridlines
            hide_y_gridlines: Whether to hide y-axis gridlines
            hide_nav_toolbar: Whether to hide the navigation toolbar
            hide_time_axis_labels: Whether to hide time axis labels
            y_label: Label for the y-axis
        """
        self.legend_opts = legend_opts or {}
        self.y_range = y_range
        self.hide_x_gridlines = hide_x_gridlines
        self.hide_y_gridlines = hide_y_gridlines
        self.hide_nav_toolbar = hide_nav_toolbar
        self.hide_time_axis_labels = hide_time_axis_labels
        self.y_label = y_label

        # Internal storage for series data
        self._series = []

    def add_line_series(
        self,
        *,
        name: str,
        t: Union[np.ndarray, List[float]],
        y: Union[np.ndarray, List[float]],
        color: str = "blue",
        width: float = 1.0,
        dash: Optional[List[float]] = None,
    ) -> None:
        """
        Add a line series to the graph

        Args:
            name: Name of the series for legend
            t: Time values (x-axis)
            y: Y values
            color: Line color
            width: Line width
            dash: Dash pattern as [dash_length, gap_length]
        """
        if isinstance(t, list):
            t = np.array(t)
        if isinstance(y, list):
            y = np.array(y)
        assert t.ndim == 1, "Time array must be 1-dimensional"
        assert y.ndim == 1, "Y array must be 1-dimensional"
        assert len(t) == len(y), "Time and Y arrays must have the same length"
        self._series.append(
            TGLineSeries(name=name, t=t, y=y, color=color, width=width, dash=dash)
        )

    def add_marker_series(
        self,
        *,
        name: str,
        t: np.ndarray,
        y: np.ndarray,
        color: str = "blue",
        radius: float = 3.0,
        shape: str = "circle",
    ) -> None:
        """
        Add a marker series to the graph

        Args:
            name: Name of the series for legend
            t: Time values (x-axis)
            y: Y values
            color: Marker color
            radius: Marker radius
            shape: Marker shape ("circle", "square", etc.)
        """
        if isinstance(t, list):
            t = np.array(t)
        if isinstance(y, list):
            y = np.array(y)
        assert t.ndim == 1, "Time array must be 1-dimensional"
        assert y.ndim == 1, "Y array must be 1-dimensional"
        assert len(t) == len(y), "Time and Y arrays must have the same length"
        self._series.append(
            TGMarkerSeries(name=name, t=t, y=y, color=color, radius=radius, shape=shape)
        )

    def add_interval_series(
        self,
        *,
        name: str,
        t_start: np.ndarray,
        t_end: np.ndarray,
        color: str = "lightblue",
        alpha: float = 0.5,
    ) -> None:
        """
        Add an interval series to the graph

        Args:
            name: Name of the series for legend
            t_start: Start times of intervals
            t_end: End times of intervals
            color: Fill color
            alpha: Transparency (0-1)
        """
        if isinstance(t_start, list):
            t_start = np.array(t_start)
        if isinstance(t_end, list):
            t_end = np.array(t_end)
        assert t_start.ndim == 1, "Start time array must be 1-dimensional"
        assert t_end.ndim == 1, "End time array must be 1-dimensional"
        assert len(t_start) == len(
            t_end
        ), "Start and end time arrays must have the same length"
        assert np.all(
            t_start <= t_end
        ), "Start times must be less than or equal to end times"
        self._series.append(
            TGIntervalSeries(
                name=name, t_start=t_start, t_end=t_end, color=color, alpha=alpha
            )
        )

    def add_uniform_series(
        self,
        *,
        name: str,
        start_time_sec: float,
        sampling_frequency_hz: float,
        data: np.ndarray,
        channel_names: Optional[List[str]] = None,
        colors: Optional[List[str]] = None,
        width: float = 1.0,
        channel_spacing: Optional[float] = None,
        auto_channel_spacing: Optional[float] = None,
        timestamps_for_inserting_nans: Optional[np.ndarray] = None,
    ) -> None:
        """
        Add a uniform timeseries to the graph with optional multi-channel support

        Args:
            name: Base name of the series for legend
            start_time_sec: Starting time in seconds
            sampling_frequency_hz: Sampling rate in Hz
            data: 1D array (single channel) or 2D array (timepoints × channels)
            channel_names: Optional list of channel names
            colors: Optional list of colors for each channel
            width: Line width
            channel_spacing: Vertical spacing between channels
            auto_channel_spacing: sets channel spacing to this multiple of the estimated RMS noise level
            timestamps_for_inserting_nans: Optional array of timestamps used to determine where to insert NaNs in the data
        """
        if isinstance(data, list):
            data = np.array(data)
        self._series.append(
            TGUniformSeries(
                name=name,
                start_time_sec=start_time_sec,
                sampling_frequency_hz=sampling_frequency_hz,
                data=data,
                channel_names=channel_names,
                colors=colors,
                width=width,
                channel_spacing=channel_spacing,
                auto_channel_spacing=auto_channel_spacing,
                timestamps_for_inserting_nans=timestamps_for_inserting_nans,
            )
        )

    def write_to_zarr_group(self, group: Group) -> None:
        """
        Write the graph data to a Zarr group

        Args:
            group: Zarr group to write data into
        """
        for series in self._series:
            series_group = group.create_group(series.name)
            if isinstance(series, TGLineSeries):
                series.write_to_zarr_group(series_group)
            elif isinstance(series, TGMarkerSeries):
                series.write_to_zarr_group(series_group)
            elif isinstance(series, TGIntervalSeries):
                series.write_to_zarr_group(series_group)
            elif isinstance(series, TGUniformSeries):
                series.write_to_zarr_group(series_group)
            else:
                raise ValueError(f"Unknown series type: {type(series)}")

        group.attrs["view_type"] = "TimeseriesGraph"

        group.attrs["legend_opts"] = self.legend_opts
        group.attrs["y_range"] = self.y_range
        group.attrs["hide_x_gridlines"] = self.hide_x_gridlines
        group.attrs["hide_y_gridlines"] = self.hide_y_gridlines
        group.attrs["hide_nav_toolbar"] = self.hide_nav_toolbar
        group.attrs["hide_time_axis_labels"] = self.hide_time_axis_labels
        group.attrs["y_label"] = self.y_label

        # series names
        group.attrs["series_names"] = [series.name for series in self._series]


class TGLineSeries:
    def __init__(
        self,
        *,
        name: str,
        t: np.ndarray,
        y: np.ndarray,
        color: str,
        width: float,
        dash: Optional[List[float]],
    ) -> None:
        assert t.ndim == 1, "Time array must be 1-dimensional"
        assert y.ndim == 1, "Y array must be 1-dimensional"
        assert len(t) == len(y), "Time and Y arrays must have the same length"
        self.name = name
        self.t = t
        self.y = y
        self.color = color
        self.width = width
        self.dash = dash

    def write_to_zarr_group(
        self,
        group: Group,
    ) -> None:
        group.attrs["series_type"] = "line"
        group.attrs["color"] = self.color
        group.attrs["width"] = self.width
        group.attrs["dash"] = self.dash if self.dash is not None else []
        group.attrs["y_min"] = float(np.nanmin(self.y))
        group.attrs["y_max"] = float(np.nanmax(self.y))
        group.create_dataset("t", data=self.t)
        group.create_dataset("y", data=self.y)


class TGMarkerSeries:
    def __init__(
        self,
        *,
        name: str,
        t: np.ndarray,
        y: np.ndarray,
        color: str,
        radius: float,
        shape: str,
    ) -> None:
        assert t.ndim == 1, "Time array must be 1-dimensional"
        assert y.ndim == 1, "Y array must be 1-dimensional"
        assert len(t) == len(y), "Time and Y arrays must have the same length"
        self.name = name
        self.t = t
        self.y = y
        self.color = color
        self.radius = radius
        self.shape = shape

    def write_to_zarr_group(self, group: Group) -> None:
        """
        Write the marker series data to a Zarr dataset

        Args:
            group: Zarr group to write data into
        """
        group.create_dataset("t", data=self.t)
        group.create_dataset("y", data=self.y)
        group.attrs["series_type"] = "marker"
        group.attrs["color"] = self.color
        group.attrs["radius"] = self.radius
        group.attrs["shape"] = self.shape
        group.attrs["y_min"] = float(np.nanmin(self.y))
        group.attrs["y_max"] = float(np.nanmax(self.y))


class TGIntervalSeries:
    def __init__(
        self,
        *,
        name: str,
        t_start: np.ndarray,
        t_end: np.ndarray,
        color: str,
        alpha: float,
    ) -> None:
        assert t_start.ndim == 1, "Start time array must be 1-dimensional"
        assert t_end.ndim == 1, "End time array must be 1-dimensional"
        assert len(t_start) == len(
            t_end
        ), "Start and end time arrays must have the same length"
        assert np.all(
            t_start <= t_end
        ), "Start times must be less than or equal to end times"
        self.name = name
        self.t_start = t_start
        self.t_end = t_end
        self.color = color
        self.alpha = alpha

    def write_to_zarr_group(self, group: Group) -> None:
        """
        Write the interval series data to a Zarr dataset

        Args:
            group: Zarr group to write data into
        """
        group.create_dataset("t_start", data=self.t_start)
        group.create_dataset("t_end", data=self.t_end)
        group.attrs["series_type"] = "interval"
        group.attrs["color"] = self.color
        group.attrs["alpha"] = self.alpha


class TGUniformSeries:
    def __init__(
        self,
        *,
        name: str,
        start_time_sec: float,
        sampling_frequency_hz: float,
        data: np.ndarray,
        channel_names: Optional[List[str]] = None,
        colors: Optional[List[str]] = None,
        width: float = 1.0,
        channel_spacing: Optional[float] = None,
        auto_channel_spacing: Optional[float] = None,
        timestamps_for_inserting_nans: Optional[np.ndarray] = None,
    ) -> None:
        assert sampling_frequency_hz > 0, "Sampling frequency must be positive"

        # Handle both 1D and 2D data
        if data.ndim == 1:
            # Convert 1D to 2D with single channel
            data = data.reshape(-1, 1)
        elif data.ndim == 2:
            # Already 2D, use as-is
            pass
        else:
            raise ValueError("Data must be 1D or 2D array")

        n_timepoints, n_channels = data.shape

        self.name = name
        self.start_time_sec = start_time_sec
        self.sampling_frequency_hz = sampling_frequency_hz
        self.data = data.astype(np.float32)  # Ensure float32 for efficiency

        if timestamps_for_inserting_nans is not None:
            self.data = insert_nans_based_on_timestamps(
                self.data,
                start_time_sec=start_time_sec,
                sampling_frequency_hz=sampling_frequency_hz,
                timestamps=timestamps_for_inserting_nans,
            )

        if auto_channel_spacing is not None:
            if channel_spacing is not None:
                raise ValueError(
                    "Specify either channel_spacing or auto_channel_spacing, not both."
                )
            # Estimate RMS noise level across all channels using median absolute deviation
            # Use nanmedian to handle NaN values properly
            mad = np.nanmedian(
                np.abs(self.data - np.nanmedian(self.data, axis=0)), axis=0
            )
            rms_estimate = mad / 0.6745  # Convert MAD to RMS estimate
            channel_spacing = auto_channel_spacing * np.nanmedian(rms_estimate)
            if (
                channel_spacing is None
                or (channel_spacing <= 0)
                or np.isnan(channel_spacing)
            ):
                channel_spacing = 1.0  # Fallback to default spacing if estimate fails
        self.channel_spacing = channel_spacing

        # Set channel names
        if channel_names is None:
            if n_channels == 1:
                self.channel_names = [name]
            else:
                self.channel_names = [f"{name}_ch_{i}" for i in range(n_channels)]
        else:
            assert len(channel_names) == n_channels, (
                f"Number of channel_names ({len(channel_names)}) must match "
                f"number of channels ({n_channels})"
            )
            self.channel_names = [str(ch_name) for ch_name in channel_names]

        # Set colors
        if colors is None:
            # Default colors for multiple channels
            default_colors = [
                "blue",
                "red",
                "green",
                "orange",
                "purple",
                "brown",
                "pink",
                "gray",
            ]
            self.colors = [
                default_colors[i % len(default_colors)] for i in range(n_channels)
            ]
        else:
            assert len(colors) == n_channels, (
                f"Number of colors ({len(colors)}) must match "
                f"number of channels ({n_channels})"
            )
            self.colors = colors

        self.width = width

        # Prepare downsampled arrays for efficient rendering
        self.downsampled_data = self._compute_downsampled_data()

    def _compute_downsampled_data(self) -> Dict[int, np.ndarray]:
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
        self, shape: Tuple[int, ...], target_size_mb: float = 5.0
    ) -> Tuple[int, ...]:
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
        Write the uniform series data to a Zarr group

        Args:
            group: Zarr group to write data into
        """
        group.attrs["series_type"] = "uniform"

        # Store metadata
        group.attrs["start_time_sec"] = self.start_time_sec
        group.attrs["sampling_frequency_hz"] = self.sampling_frequency_hz
        group.attrs["channel_names"] = self.channel_names
        group.attrs["colors"] = self.colors
        group.attrs["width"] = self.width

        n_timepoints, n_channels = self.data.shape
        group.attrs["n_timepoints"] = n_timepoints
        group.attrs["n_channels"] = n_channels

        if self.channel_spacing is not None:
            group.attrs["channel_spacing"] = float(self.channel_spacing)

        y_min = np.nanmin(self.data)
        y_max = np.nanmax(self.data)
        if not np.isnan(y_min) and not np.isnan(y_max):
            group.attrs["y_min"] = float(y_min)
            group.attrs["y_max"] = float(y_max)

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


def insert_nans_based_on_timestamps(
    x: np.ndarray,
    *,
    start_time_sec: float,
    sampling_frequency_hz: float,
    timestamps: np.ndarray,
) -> np.ndarray:
    end_timestamps = timestamps[-1]
    ret_length = int((end_timestamps - start_time_sec) * sampling_frequency_hz) + 1

    # Handle both 1D and 2D (multi-channel) data
    if x.ndim == 1:
        ret = np.nan * np.ones((ret_length,), dtype=x.dtype)
    else:  # x.ndim == 2
        n_channels = x.shape[1]
        ret = np.nan * np.ones((ret_length, n_channels), dtype=x.dtype)

    indices = ((timestamps - start_time_sec) * sampling_frequency_hz).astype(int)
    ret[indices] = x
    return ret
