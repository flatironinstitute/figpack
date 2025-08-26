import os
import numpy as np
import figpack.views as vv


def main():
    view = example_timeseries_graph()
    title = "Example Timeseries Graph"
    description_md = """
# Example Timeseries Graph

This is an example of a timeseries graph created using figpack.

- Blue line: A smooth curve defined by the function \(y = t \cos((2t)^2)\).
- Red markers: Discrete points along the same curve.
- Green dashed line: The function \(y = t + 1\).
- Black square markers: Discrete points along the function \(y = -t - 1\).
- Light blue intervals: Highlighted time intervals.

You can zoom and pan the graph to explore the data in more detail.
"""

    view.show(
        open_in_browser=True,
        title=title,
        description=description_md,
    )


def example_timeseries_graph(*, height=500):
    # rng = np.random.default_rng(2022)
    G = vv.TimeseriesGraph(
        legend_opts={"location": "northwest"},
        y_range=[-16, 16],
        hide_x_gridlines=False,
        hide_y_gridlines=True,
        y_label="Value",
    )

    # this is for testing the time offset feature
    t0 = 25
    t = np.arange(0, 5).astype(np.float32) * 2
    G.add_interval_series(
        name="blue interval", t_start=t0 + t, t_end=t0 + t + 0.5, color="lightblue"
    )

    n1 = 5000
    t = np.arange(0, n1) / n1 * 10
    v = t * np.cos((2 * t) ** 2)
    G.add_line_series(name="blue line", t=t0 + t, y=v.astype(np.float32), color="blue")

    n2 = 400
    t = np.arange(0, n2) / n2 * 10
    v = t * np.cos((2 * t) ** 2)
    G.add_marker_series(
        name="red marker", t=t0 + t, y=v.astype(np.float32), color="red", radius=4
    )

    v = t + 1
    G.add_line_series(
        name="green dash",
        t=t0 + t,
        y=v.astype(np.float32),
        color="green",
        width=5,
        dash=[12, 8],
    )

    t = np.arange(0, 12) / 12 * 10
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
