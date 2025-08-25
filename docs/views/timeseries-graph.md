# TimeseriesGraph

A timeseries graph visualization component for displaying time-based data with multiple series types.

## Overview

The `TimeseriesGraph` class allows you to create interactive timeseries visualizations with support for:

- Line series (continuous data)
- Marker series (discrete points)
- Interval series (time ranges)

## Basic Usage

```python
import numpy as np
import figpack.views as vv

# Create a timeseries graph
graph = vv.TimeseriesGraph(
    legend_opts={"location": "northwest"},
    y_range=[-10, 10],
    y_label="Value"
)

# Add a line series
t = np.linspace(0, 10, 100)
y = np.sin(t)
graph.add_line_series(name="sine wave", t=t, y=y, color="blue")

# Add marker series
t_markers = np.linspace(0, 10, 20)
y_markers = np.cos(t_markers)
graph.add_marker_series(name="cosine points", t=t_markers, y=y_markers, color="red")

# Add interval series
t_start = np.array([2, 6])
t_end = np.array([3, 7])
graph.add_interval_series(name="intervals", t_start=t_start, t_end=t_end, color="lightblue")

# Display the graph
graph.show(open_in_browser=True, title="Timeseries Graph Example")
```

## Constructor Parameters

- `legend_opts` (dict, optional): Legend configuration (e.g., `{"location": "northwest"}`)
- `y_range` (list, optional): Y-axis range as `[min, max]`
- `hide_x_gridlines` (bool): Whether to hide x-axis gridlines (default: False)
- `hide_y_gridlines` (bool): Whether to hide y-axis gridlines (default: False)
- `y_label` (str): Label for the y-axis (default: "")

## Series Types

### Line Series

Add continuous line plots:

```python
graph.add_line_series(
    name="line name",
    t=time_array,
    y=value_array,
    color="blue",
    width=1.0,
    dash=[5, 3]  # Optional dash pattern [dash_length, gap_length]
)
```

### Marker Series

Add discrete point markers:

```python
graph.add_marker_series(
    name="marker name",
    t=time_array,
    y=value_array,
    color="red",
    radius=3.0,
    shape="circle"  # "circle", "square", etc.
)
```

### Interval Series

Add time interval highlights:

```python
graph.add_interval_series(
    name="interval name",
    t_start=start_times,
    t_end=end_times,
    color="lightblue",
    alpha=0.5
)
```

## Complete Example

```python
import numpy as np
import figpack.views as vv

def create_example_graph():
    # Create the graph with configuration
    graph = vv.TimeseriesGraph(
        legend_opts={"location": "northwest"},
        y_range=[-16, 16],
        hide_y_gridlines=True,
        y_label="Value"
    )

    # Time offset for demonstration
    t0 = 25

    # Add interval series
    t = np.arange(0, 5) * 2
    graph.add_interval_series(
        name="blue interval",
        t_start=t0 + t,
        t_end=t0 + t + 0.5,
        color="lightblue"
    )

    # Add smooth line series
    n1 = 5000
    t = np.arange(0, n1) / n1 * 10
    v = t * np.cos((2 * t) ** 2)
    graph.add_line_series(
        name="blue line",
        t=t0 + t,
        y=v.astype(np.float32),
        color="blue"
    )

    # Add marker series
    n2 = 400
    t = np.arange(0, n2) / n2 * 10
    v = t * np.cos((2 * t) ** 2)
    graph.add_marker_series(
        name="red marker",
        t=t0 + t,
        y=v.astype(np.float32),
        color="red",
        radius=4
    )

    # Add dashed line
    v = t + 1
    graph.add_line_series(
        name="green dash",
        t=t0 + t,
        y=v.astype(np.float32),
        color="green",
        width=5,
        dash=[12, 8]
    )

    # Add square markers
    t = np.arange(0, 12) / 12 * 10
    v = -t - 1
    graph.add_marker_series(
        name="black marker",
        t=t0 + t,
        y=v.astype(np.float32),
        color="black",
        radius=8,
        shape="square"
    )

    return graph

# Create and display the graph
graph = create_example_graph()
graph.show(open_in_browser=True, title="Example Timeseries Graph")
```
