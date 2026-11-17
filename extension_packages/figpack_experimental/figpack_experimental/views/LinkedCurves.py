"""
Several panels of curves where each curve belongs to an item, linked by item across panels
"""

from typing import Dict, List, Optional, Sequence

import numpy as np

import figpack
from figpack.core._figure_spec import SpecProp, SpecSchema
from .experimental_extension import experimental_extension

# Default group colors, in order (validated categorical palette, light surface)
DEFAULT_GROUP_COLORS = [
    "#2a78d6",
    "#eb6834",
    "#1baf7a",
    "#eda100",
    "#e87ba4",
    "#008300",
    "#6250d6",
    "#e34948",
]

STYLES = ("line", "markers", "line+markers")
LEGEND_POSITIONS = ("upper left", "upper right", "lower left", "lower right")


class LinkedCurves(figpack.ExtensionView):
    """
    Items (for example animals) drawn as curves in several panels, each panel with its own
    axes. An item can have several curves in a panel (for example a fit and the data it was
    fitted to). Hovering over a curve highlights that item in every panel; items can be grouped
    (for example by laboratory), and groups can be shown and hidden from a legend.

    Usage:
        view = LinkedCurves(item_labels=names, item_groups=labs)
        p = view.add_panel(title="Learning", x_label="day", y_label="% correct")
        view.add_curve(p, item=0, x=days, y=perf)
    """

    spec_schema = SpecSchema(
        view_type="experimental.LinkedCurves",
        description="Curves of many items in several panels with their own axes, linked by item, with groups that can be shown and hidden.",
        props=[
            SpecProp(
                "num_columns",
                "number",
                "Number of panel columns; panels fill rows left to right (default: all in one row).",
            ),
        ],
    )

    def __init__(
        self,
        *,
        item_labels: Sequence[str],
        item_groups: Optional[Sequence[str]] = None,
        group_colors: Optional[Dict[str, str]] = None,
        item_colors: Optional[Sequence[str]] = None,
        num_columns: Optional[int] = None,
    ):
        """
        Args:
            item_labels: Name of each item, shown on hover
            item_groups: Optional group of each item; groups get a legend in which they can be
                shown, hidden and highlighted
            group_colors: Optional CSS color per group (default: a categorical palette in the
                order the groups first appear)
            item_colors: Optional CSS color per item, overriding the group colors
            num_columns: Number of panel columns (default: all panels in one row)
        """
        super().__init__(
            extension=experimental_extension, view_type="experimental.LinkedCurves"
        )
        self.item_labels = [str(x) for x in item_labels]
        n = len(self.item_labels)
        if n == 0:
            raise ValueError("at least one item is required")
        self.item_groups = (
            [str(g) for g in item_groups] if item_groups is not None else None
        )
        if self.item_groups is not None and len(self.item_groups) != n:
            raise ValueError(f"item_groups must have {n} entries")
        if item_colors is not None and len(item_colors) != n:
            raise ValueError(f"item_colors must have {n} entries")
        self.groups: List[str] = []
        if self.item_groups is not None:
            for g in self.item_groups:
                if g not in self.groups:
                    self.groups.append(g)
        group_colors = dict(group_colors or {})
        for i, g in enumerate(self.groups):
            group_colors.setdefault(
                g, DEFAULT_GROUP_COLORS[i % len(DEFAULT_GROUP_COLORS)]
            )
        self.group_colors = group_colors
        if item_colors is not None:
            self.item_colors = [str(c) for c in item_colors]
        elif self.item_groups is not None:
            self.item_colors = [group_colors[g] for g in self.item_groups]
        else:
            self.item_colors = [DEFAULT_GROUP_COLORS[0]] * n
        if num_columns is not None and num_columns < 1:
            raise ValueError("num_columns must be at least 1")
        self.num_columns = num_columns
        self.panels: List[dict] = []
        self.curves: List[List[dict]] = []

    def add_panel(
        self,
        *,
        title: str = "",
        x_label: str = "",
        y_label: str = "",
        x_range: Optional[Sequence[float]] = None,
        y_range: Optional[Sequence[float]] = None,
        x_ticks: Optional[Sequence[float]] = None,
        x_tick_labels: Optional[Sequence[str]] = None,
        x_scale: str = "linear",
        symlog_constant: float = 1.0,
        legend_position: str = "upper left",
    ) -> int:
        """
        Add a panel and return its index.

        Args:
            title: Panel title
            x_label, y_label: Axis labels
            x_range, y_range: Optional (min, max) of the axes (default: fitted to the data)
            x_ticks: Optional tick positions on the x axis
            x_tick_labels: Optional labels of the x ticks
            x_scale: "linear" or "symlog"; symlog spreads values near zero, with
                x mapped to sign(x) * log10(1 + |x| / symlog_constant)
            symlog_constant: The constant of the symlog scale
            legend_position: Corner for the legend of named series: "upper left",
                "upper right", "lower left" or "lower right"
        """
        if x_scale not in ("linear", "symlog"):
            raise ValueError("x_scale must be 'linear' or 'symlog'")
        if legend_position not in LEGEND_POSITIONS:
            raise ValueError(f"legend_position must be one of {LEGEND_POSITIONS}")
        if symlog_constant <= 0:
            raise ValueError("symlog_constant must be positive")
        if x_tick_labels is not None and (
            x_ticks is None or len(x_ticks) != len(x_tick_labels)
        ):
            raise ValueError("x_tick_labels needs x_ticks of the same length")
        for r in (x_range, y_range):
            if r is not None and (len(r) != 2 or r[0] >= r[1]):
                raise ValueError("ranges must be (min, max) with min < max")
        panel = {
            "title": title,
            "x_label": x_label,
            "y_label": y_label,
            "x_scale": x_scale,
            "symlog_constant": float(symlog_constant),
            "legend_position": legend_position,
        }
        if x_range is not None:
            panel["x_range"] = [float(v) for v in x_range]
        if y_range is not None:
            panel["y_range"] = [float(v) for v in y_range]
        if x_ticks is not None:
            panel["x_ticks"] = [float(v) for v in x_ticks]
        if x_tick_labels is not None:
            panel["x_tick_labels"] = [str(v) for v in x_tick_labels]
        self.panels.append(panel)
        self.curves.append([])
        return len(self.panels) - 1

    def add_curve(
        self,
        panel: int,
        *,
        item: int,
        x: np.ndarray,
        y: np.ndarray,
        style: str = "line",
        dashed: bool = False,
        marker_size: float = 3.0,
        series: str = "",
    ) -> None:
        """
        Add a curve of one item to a panel.

        Args:
            panel: Panel index (from add_panel)
            item: Index of the item the curve belongs to
            x, y: Coordinates (same length); NaN breaks the line
            style: "line", "markers" or "line+markers"
            dashed: Draw the line dashed
            marker_size: Marker radius in pixels
            series: Optional name of the kind of curve (for example "fit" or "data");
                a panel with several named series lists them under its title
        """
        if not 0 <= panel < len(self.panels):
            raise ValueError(f"no panel {panel}")
        if not 0 <= item < len(self.item_labels):
            raise ValueError(f"no item {item}")
        if style not in STYLES:
            raise ValueError(f"style must be one of {STYLES}")
        x = np.asarray(x, dtype=np.float32).ravel()
        y = np.asarray(y, dtype=np.float32).ravel()
        if len(x) != len(y) or len(x) == 0:
            raise ValueError("x and y must have the same, non-zero length")
        self.curves[panel].append(
            {
                "item": int(item),
                "x": x,
                "y": y,
                "style": style,
                "dashed": bool(dashed),
                "marker_size": float(marker_size),
                "series": str(series),
            }
        )

    def write_to_zarr_group(self, group: figpack.Group) -> None:
        if not self.panels:
            raise ValueError("add at least one panel")
        super().write_to_zarr_group(group)
        group.attrs["item_labels"] = self.item_labels
        group.attrs["item_colors"] = self.item_colors
        if self.item_groups is not None:
            group.attrs["item_groups"] = self.item_groups
            group.attrs["groups"] = self.groups
            group.attrs["group_colors"] = [self.group_colors[g] for g in self.groups]
        group.attrs["num_columns"] = (
            self.num_columns if self.num_columns is not None else len(self.panels)
        )
        panels_meta = []
        for i, (panel, curves) in enumerate(zip(self.panels, self.curves)):
            series_names = []
            for c in curves:
                if c["series"] not in series_names:
                    series_names.append(c["series"])
            lengths = np.array([len(c["x"]) for c in curves], dtype=np.int64)
            offsets = np.concatenate([[0], np.cumsum(lengths)]).astype(np.int32)
            xy = (
                np.stack(
                    [
                        np.concatenate([c["x"] for c in curves]),
                        np.concatenate([c["y"] for c in curves]),
                    ],
                    axis=1,
                )
                if curves
                else np.zeros((0, 2), dtype=np.float32)
            )
            # per curve: item, style code, dashed, series index
            info = np.array(
                [
                    [
                        c["item"],
                        STYLES.index(c["style"]),
                        int(c["dashed"]),
                        series_names.index(c["series"]),
                    ]
                    for c in curves
                ],
                dtype=np.int32,
            ).reshape(-1, 4)
            sizes = np.array([c["marker_size"] for c in curves], dtype=np.float32)
            group.create_dataset(f"panel_{i}_xy", data=xy.astype(np.float32))
            group.create_dataset(f"panel_{i}_offsets", data=offsets)
            group.create_dataset(f"panel_{i}_info", data=info)
            group.create_dataset(f"panel_{i}_marker_sizes", data=sizes)
            panels_meta.append(
                dict(panel, prefix=f"panel_{i}", series_names=series_names)
            )
        group.attrs["panels"] = panels_meta
