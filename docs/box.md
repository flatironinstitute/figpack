# Box

Flexible container for arranging views in horizontal or vertical layouts with customizable sizing and collapsible sections.

## Overview

`Box` provides a flexible layout system for organizing multiple views with precise control over sizing, stretching, and collapsibility.

## Basic Usage

```python
import numpy as np
import figpack.views as vv

# Create sample data for timeseries graphs
t = np.linspace(0, 10, 1000)

# Create first timeseries graph with sine wave
view1 = vv.TimeseriesGraph(
    legend_opts={"location": "northwest"},
    y_range=[-2, 2],
    y_label="Amplitude"
)
view1.add_line_series(
    name="Sine Wave",
    t=t.astype(np.float32),
    y=(np.sin(2 * np.pi * t)).astype(np.float32),
    color="blue",
    width=2.0
)

# Create second timeseries graph with cosine wave
view2 = vv.TimeseriesGraph(
    legend_opts={"location": "northwest"},
    y_range=[-2, 2],
    y_label="Amplitude"
)
view2.add_line_series(
    name="Cosine Wave",
    t=t.astype(np.float32),
    y=(np.cos(2 * np.pi * t)).astype(np.float32),
    color="red",
    width=2.0
)

# Create horizontal box layout
box = vv.Box(
    direction="horizontal",
    show_titles=True,
    items=[
        vv.LayoutItem(view1, title="Left Panel"),
        vv.LayoutItem(view2, title="Right Panel")
    ]
)

box.show(open_in_browser=True, title="Box Layout Example")
```

## Constructor Parameters

- `direction` (str): Layout direction - `"horizontal"` or `"vertical"`
- `show_titles` (bool): Whether to display item titles
- `items` (list): List of `LayoutItem` objects

## LayoutItem Parameters

- `view`: The view to display
- `title` (str): Optional title for the item
- `stretch` (int): Relative stretch factor (default: 0)
- `min_size` (int): Minimum size in pixels
- `max_size` (int): Maximum size in pixels
- `collapsible` (bool): Whether the item can be collapsed

## Sizing Control

### Fixed Size

```python
vv.LayoutItem(view, min_size=250, max_size=250, title="Fixed Size")
```

### Proportional Stretching

```python
vv.LayoutItem(view1, stretch=1, title="1x stretch")
vv.LayoutItem(view2, stretch=2, title="2x stretch")  # Takes twice the space
```

### Size Constraints

```python
vv.LayoutItem(view, min_size=200, max_size=400, title="Constrained")
```

## Nested Layouts

```python
# Create nested box layouts
inner_box = vv.Box(
    direction="horizontal",
    items=[
        vv.LayoutItem(view1, stretch=1),
        vv.LayoutItem(view2, stretch=1)
    ]
)

outer_box = vv.Box(
    direction="vertical",
    items=[
        vv.LayoutItem(inner_box, title="Top Row"),
        vv.LayoutItem(view3, title="Bottom Row")
    ]
)
```

## Collapsible Sections

```python
vv.LayoutItem(
    view,
    title="Collapsible Panel",
    collapsible=True
)
```

## Example

See [example_box.py](../examples/example_box.py) for a complete demonstration with nested layouts and various sizing options.
