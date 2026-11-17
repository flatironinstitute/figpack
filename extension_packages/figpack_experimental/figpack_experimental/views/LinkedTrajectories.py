"""
Several 2D panels showing the same set of items as trajectories over a shared time axis
"""

from typing import List, Optional, Sequence

import numpy as np

import figpack
from figpack.core._figure_spec import SpecProp, SpecSchema
from .experimental_extension import experimental_extension


class TrajectoryPanel:
    """One 2D panel of a LinkedTrajectories view."""

    def __init__(
        self,
        *,
        data: np.ndarray,
        title: str = "",
        x_label: str = "",
        y_label: str = "",
        equal_aspect: bool = True,
    ):
        """
        Args:
            data: Array of shape (num_items, num_times, 2) with the x and y
                coordinates of every item at every time. NaN marks a missing
                sample.
            title: Panel title
            x_label: Label of the horizontal axis
            y_label: Label of the vertical axis
            equal_aspect: Whether one unit spans the same length on both axes
        """
        data = np.asarray(data, dtype=np.float32)
        if data.ndim != 3 or data.shape[2] != 2:
            raise ValueError(
                f"data must have shape (num_items, num_times, 2), got {data.shape}"
            )
        self.data = data
        self.title = title
        self.x_label = x_label
        self.y_label = y_label
        self.equal_aspect = equal_aspect


class LinkedTrajectories(figpack.ExtensionView):
    """
    The same items (for example experimental conditions) drawn as 2D trajectories
    in several panels that share a time axis. A time slider, with playback, moves
    a marker along every trajectory, and hovering or clicking an item highlights
    it in all panels.
    """

    spec_schema = SpecSchema(
        view_type="experimental.LinkedTrajectories",
        description="Items drawn as 2D trajectories in linked panels over a shared time axis, with a time slider and highlighting across panels.",
        props=[
            SpecProp("time_label", "string", "Label of the time axis, e.g. 'ms'."),
            SpecProp(
                "tail_length",
                "number",
                "Initial length of the drawn tail behind the marker, in time units; 0 draws from the start.",
            ),
            SpecProp(
                "num_columns",
                "number",
                "Number of panel columns; panels fill rows left to right (default: all in one row).",
            ),
            SpecProp(
                "show_ghost",
                "boolean",
                "Initially draw each full trajectory faintly behind the tail.",
            ),
        ],
    )

    def __init__(
        self,
        *,
        times: np.ndarray,
        panels: Sequence[TrajectoryPanel],
        item_labels: Optional[List[str]] = None,
        item_colors: Optional[List[str]] = None,
        time_label: str = "",
        tail_length: float = 0,
        show_ghost: bool = True,
        initial_time: Optional[float] = None,
        highlight_interval: Optional[Sequence[float]] = None,
        num_columns: Optional[int] = None,
    ):
        """
        Args:
            times: Shared time axis, shape (num_times,), increasing
            panels: The panels, each holding (num_items, num_times, 2) data
            item_labels: Optional name of each item (shown on hover)
            item_colors: Optional CSS color of each item
            time_label: Label of the time axis, e.g. "ms from movement onset"
            tail_length: Length of the tail drawn behind the marker, in the
                units of `times`; 0 draws each trajectory from its start
            show_ghost: Whether to draw each full trajectory faintly
            initial_time: Time shown when the view opens (default: the last)
            highlight_interval: Optional (start, end) marked on the time
                slider, e.g. the window an analysis was fitted on
            num_columns: Number of panel columns; panels fill rows left to
                right. Default: all panels in one row
        """
        super().__init__(
            extension=experimental_extension,
            view_type="experimental.LinkedTrajectories",
        )
        times = np.asarray(times, dtype=np.float64)
        if times.ndim != 1 or len(times) < 2:
            raise ValueError("times must be 1D with at least two samples")
        if np.any(np.diff(times) <= 0):
            raise ValueError("times must be strictly increasing")
        if len(panels) == 0:
            raise ValueError("at least one panel is required")
        num_items = panels[0].data.shape[0]
        for i, p in enumerate(panels):
            if p.data.shape[:2] != (num_items, len(times)):
                raise ValueError(
                    f"panel {i} has shape {p.data.shape}; expected ({num_items}, {len(times)}, 2)"
                )
        if item_labels is not None and len(item_labels) != num_items:
            raise ValueError(f"item_labels must have {num_items} entries")
        if item_colors is not None and len(item_colors) != num_items:
            raise ValueError(f"item_colors must have {num_items} entries")
        if num_columns is not None and num_columns < 1:
            raise ValueError("num_columns must be at least 1")
        if tail_length < 0:
            raise ValueError("tail_length must be non-negative")
        if highlight_interval is not None:
            if (
                len(highlight_interval) != 2
                or highlight_interval[0] >= highlight_interval[1]
            ):
                raise ValueError(
                    "highlight_interval must be (start, end) with start < end"
                )

        self.times = times
        self.panels = list(panels)
        self.num_items = num_items
        self.item_labels = (
            [str(x) for x in item_labels]
            if item_labels is not None
            else [str(i) for i in range(num_items)]
        )
        self.item_colors = (
            [str(c) for c in item_colors] if item_colors is not None else None
        )
        self.time_label = time_label
        self.tail_length = float(tail_length)
        self.show_ghost = bool(show_ghost)
        self.initial_time = (
            float(initial_time) if initial_time is not None else float(times[-1])
        )
        self.num_columns = int(num_columns) if num_columns is not None else len(panels)
        self.highlight_interval = (
            [float(highlight_interval[0]), float(highlight_interval[1])]
            if highlight_interval is not None
            else None
        )

    def write_to_zarr_group(self, group: figpack.Group) -> None:
        super().write_to_zarr_group(group)
        group.attrs["num_items"] = self.num_items
        group.attrs["num_times"] = len(self.times)
        group.attrs["item_labels"] = self.item_labels
        if self.item_colors is not None:
            group.attrs["item_colors"] = self.item_colors
        group.attrs["time_label"] = self.time_label
        group.attrs["tail_length"] = self.tail_length
        group.attrs["show_ghost"] = self.show_ghost
        group.attrs["initial_time"] = self.initial_time
        group.attrs["num_columns"] = self.num_columns
        if self.highlight_interval is not None:
            group.attrs["highlight_interval"] = self.highlight_interval
        group.attrs["panels"] = [
            {
                "dataset": f"panel_{i}",
                "title": p.title,
                "x_label": p.x_label,
                "y_label": p.y_label,
                "equal_aspect": p.equal_aspect,
            }
            for i, p in enumerate(self.panels)
        ]
        group.create_dataset("times", data=self.times)
        for i, p in enumerate(self.panels):
            group.create_dataset(f"panel_{i}", data=p.data)
