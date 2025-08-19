# TabLayout

Tabbed interface for organizing multiple views in a space-efficient manner.

## Overview

`TabLayout` creates a tabbed interface where users can switch between different views using tab headers.

## Basic Usage

```python
import numpy as np
import figpack.views as vv

# Create sample data for timeseries graphs
t = np.linspace(0, 10, 1000)

# Create first tab with sine wave
graph1 = vv.TimeseriesGraph(
    legend_opts={"location": "northwest"},
    y_range=[-2, 2],
    y_label="Amplitude"
)
graph1.add_line_series(
    name="Sine Wave",
    t=t.astype(np.float32),
    y=(np.sin(2 * np.pi * t)).astype(np.float32),
    color="blue",
    width=2.0
)

# Create second tab with multiple signals
graph2 = vv.TimeseriesGraph(
    legend_opts={"location": "northeast"},
    y_range=[-3, 3],
    y_label="Signal"
)
# Add cosine wave
graph2.add_line_series(
    name="Cosine",
    t=t.astype(np.float32),
    y=(2 * np.cos(3 * np.pi * t)).astype(np.float32),
    color="red",
    width=2.0
)
# Add damped oscillation
graph2.add_line_series(
    name="Damped",
    t=t.astype(np.float32),
    y=(np.exp(-t/4) * np.sin(6 * np.pi * t)).astype(np.float32),
    color="green",
    width=1.5
)

# Create info tab with markdown content
table = vv.Markdown("""
# Signal Analysis

This tab layout demonstrates:

- **Tab 1**: Simple sine wave signal
- **Tab 2**: Multiple overlapping signals
- **Tab 3**: This information panel

Click the tabs above to switch between different views.
""")

# Create tab layout
tabs = vv.TabLayout(
    items=[
        vv.TabLayoutItem(graph1, label="Sine Wave"),
        vv.TabLayoutItem(graph2, label="Multiple Signals"),
        vv.TabLayoutItem(table, label="Info")
    ]
)

tabs.show(open_in_browser=True)
```

## Constructor Parameters

- `items` (list): List of `TabLayoutItem` objects

## TabLayoutItem Parameters

- `view`: The view to display in the tab
- `label` (str): Text label for the tab header

## Features

- **Multiple Views**: Organize many views in limited space
- **Tab Navigation**: Click tab headers to switch views
- **Custom Labels**: Descriptive names for each tab
- **Nested Layouts**: Tabs can contain other layout views

## Nested with Other Layouts

```python
# Combine tabs with other layouts
box_layout = vv.Box(
    direction="horizontal",
    items=[
        vv.LayoutItem(left_view, stretch=1),
        vv.LayoutItem(right_view, stretch=1)
    ]
)

tabs = vv.TabLayout(
    items=[
        vv.TabLayoutItem(box_layout, label="Split View"),
        vv.TabLayoutItem(single_view, label="Single View")
    ]
)
```

## Example

See [example_tablayout.py](../examples/example_tablayout.py) for a complete demonstration.
