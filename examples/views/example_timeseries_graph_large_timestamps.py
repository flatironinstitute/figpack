import numpy as np
import figpack.views as vv


def main():
    view = example_timeseries_graph_large_timestamps()
    title = "Example Timeseries Graph with Large Timestamps"
    description_md = """
# Example Timeseries Graph with Large Timestamps

This example demonstrates using float64 timestamps with very large values that would overflow float32.

- Blue line: A smooth curve with large timestamp values
- Red markers: Discrete points along the curve
- Green dashed line: A linear function
- Black square markers: Discrete points along a decreasing line
- Light blue intervals: Highlighted time intervals

The timestamps are in the range that would cause float32 overflow (> 2^24),
specifically around 10^8 to test float64 handling.
"""

    view.show(
        open_in_browser=True,
        title=title,
        description=description_md,
    )


def example_timeseries_graph_large_timestamps(*, height=500):
    G = vv.TimeseriesGraph(
        legend_opts={"location": "northwest"},
        y_range=[-16, 16],
        hide_x_gridlines=False,
        hide_y_gridlines=True,
        y_label="Value",
    )

    # Using large timestamp base that would overflow float32
    t0 = 1e8  # This is beyond float32's precision limit of 2^24

    # Create intervals with large timestamps
    t = np.arange(0, 5).astype(np.float64) * 2
    G.add_interval_series(
        name="blue interval", t_start=t0 + t, t_end=t0 + t + 0.5, color="lightblue"
    )

    # Create continuous line with large timestamps
    n1 = 5000
    t = np.arange(0, n1).astype(np.float64) / n1 * 10
    v = t * np.cos((2 * t) ** 2)
    G.add_line_series(name="blue line", t=t0 + t, y=v.astype(np.float32), color="blue")

    # Add markers with large timestamps
    n2 = 400
    t = np.arange(0, n2).astype(np.float64) / n2 * 10
    v = t * np.cos((2 * t) ** 2)
    G.add_marker_series(
        name="red marker", t=t0 + t, y=v.astype(np.float32), color="red", radius=4
    )

    # Add dashed line with large timestamps
    v = t + 1
    G.add_line_series(
        name="green dash",
        t=t0 + t,
        y=v.astype(np.float32),
        color="green",
        width=5,
        dash=[12, 8],
    )

    # Add square markers with large timestamps
    t = np.arange(0, 12).astype(np.float64) / 12 * 10
    v = -t - 1
    G.add_marker_series(
        name="black marker",
        t=t0 + t,
        y=v.astype(np.float32),
        color="black",
        radius=8,
        shape="square",
    )

    return G


if __name__ == "__main__":
    main()
