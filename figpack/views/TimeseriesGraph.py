"""
Views module for figpack - contains visualization components
"""

from typing import Any, Dict, List, Optional

import numpy as np
import zarr

from ..core.figpack_view import FigpackView


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
        y_label: str = "",
    ):
        """
        Initialize a TimeseriesGraph

        Args:
            legend_opts: Dictionary of legend options (e.g., {"location": "northwest"})
            y_range: Y-axis range as [min, max]
            hide_x_gridlines: Whether to hide x-axis gridlines
            hide_y_gridlines: Whether to hide y-axis gridlines
            y_label: Label for the y-axis
        """
        self.legend_opts = legend_opts or {}
        self.y_range = y_range
        self.hide_x_gridlines = hide_x_gridlines
        self.hide_y_gridlines = hide_y_gridlines
        self.y_label = y_label

        # Internal storage for series data
        self._series = []

    def add_line_series(
        self,
        *,
        name: str,
        t: np.ndarray,
        y: np.ndarray,
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
        self._series.append(
            TGIntervalSeries(
                name=name, t_start=t_start, t_end=t_end, color=color, alpha=alpha
            )
        )

    def _write_to_zarr_group(self, group: zarr.Group) -> None:
        """
        Write the graph data to a Zarr group

        Args:
            group: Zarr group to write data into
        """
        for series in self._series:
            series_group = group.create_group(series.name)
            if isinstance(series, TGLineSeries):
                series._write_to_zarr_group(series_group)
            elif isinstance(series, TGMarkerSeries):
                series._write_to_zarr_group(series_group)
            elif isinstance(series, TGIntervalSeries):
                series._write_to_zarr_group(series_group)
            else:
                raise ValueError(f"Unknown series type: {type(series)}")

        group.attrs["view_type"] = "TimeseriesGraph"

        group.attrs["legend_opts"] = self.legend_opts
        group.attrs["y_range"] = self.y_range
        group.attrs["hide_x_gridlines"] = self.hide_x_gridlines
        group.attrs["hide_y_gridlines"] = self.hide_y_gridlines
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
    ):
        assert t.ndim == 1, "Time array must be 1-dimensional"
        assert y.ndim == 1, "Y array must be 1-dimensional"
        assert len(t) == len(y), "Time and Y arrays must have the same length"
        self.name = name
        self.t = t
        self.y = y
        self.color = color
        self.width = width
        self.dash = dash

    def _write_to_zarr_group(
        self,
        group: zarr.Group,
    ) -> None:
        group.attrs["series_type"] = "line"
        group.attrs["color"] = self.color
        group.attrs["width"] = self.width
        group.attrs["dash"] = self.dash if self.dash is not None else []
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
    ):
        assert t.ndim == 1, "Time array must be 1-dimensional"
        assert y.ndim == 1, "Y array must be 1-dimensional"
        assert len(t) == len(y), "Time and Y arrays must have the same length"
        self.name = name
        self.t = t
        self.y = y
        self.color = color
        self.radius = radius
        self.shape = shape

    def _write_to_zarr_group(self, group: zarr.Group) -> None:
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


class TGIntervalSeries:
    def __init__(
        self,
        *,
        name: str,
        t_start: np.ndarray,
        t_end: np.ndarray,
        color: str,
        alpha: float,
    ):
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

    def _write_to_zarr_group(self, group: zarr.Group) -> None:
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
