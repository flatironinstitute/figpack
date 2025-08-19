# Splitter

Resizable split panes for dividing the view into adjustable sections.

## Overview

`Splitter` creates resizable panes that users can adjust by dragging the divider between sections.

## Basic Usage

```python
import numpy as np
import figpack.views as vv

# Create sample data for timeseries graphs
t = np.linspace(0, 10, 1000)

# Create left pane with exponential decay signal
left_view = vv.TimeseriesGraph(
    legend_opts={"location": "northeast"},
    y_range=[-1.5, 1.5],
    y_label="Signal"
)
left_view.add_line_series(
    name="Exponential Decay",
    t=t.astype(np.float32),
    y=(np.exp(-t/3) * np.sin(4 * np.pi * t)).astype(np.float32),
    color="green",
    width=2.0
)

# Create right pane with noisy signal
right_view = vv.TimeseriesGraph(
    legend_opts={"location": "northwest"},
    y_range=[-3, 3],
    y_label="Amplitude"
)
signal = np.sin(2 * np.pi * t) + 0.3 * np.random.randn(len(t))
right_view.add_line_series(
    name="Noisy Signal",
    t=t.astype(np.float32),
    y=signal.astype(np.float32),
    color="purple",
    width=1.5
)

# Create splitter
splitter = vv.Splitter(
    direction="horizontal",
    item1=vv.LayoutItem(left_view, title="Left Pane"),
    item2=vv.LayoutItem(right_view, title="Right Pane"),
    split_pos=0.3  # 30% for left pane
)

splitter.show(open_in_browser=True)
```

## Constructor Parameters

- `direction` (str): Split direction - `"horizontal"` or `"vertical"`
- `item1`: LayoutItem for the first pane (left/top)
- `item2`: LayoutItem for the second pane (right/bottom)
- `split_pos` (float): Initial split position as fraction (0.0 to 1.0)

## Nested Splitters

```python
# Create a complex layout with nested splitters
top_splitter = vv.Splitter(
    direction="horizontal",
    item1=vv.LayoutItem(view1, title="Left"),
    item2=vv.LayoutItem(view2, title="Right"),
    split_pos=0.5
)

main_splitter = vv.Splitter(
    direction="vertical",
    item1=vv.LayoutItem(top_splitter, title="Top Section"),
    item2=vv.LayoutItem(view3, title="Bottom Section"),
    split_pos=0.7
)
```

## Example

See [example_splitter.py](../examples/example_splitter.py) for a complete demonstration.
