# PlotlyFigure

Display interactive plotly figures in figpack visualizations.

## Overview

`PlotlyFigure` renders plotly figure objects as interactive visualizations, preserving zoom, pan, and hover capabilities.

## Basic Usage

```python
import plotly.graph_objects as go
import numpy as np
import figpack.views as vv

# Create a plotly figure
x = np.linspace(0, 2 * np.pi, 100)
y = np.sin(x)

fig = go.Figure()
fig.add_trace(go.Scatter(x=x, y=y, mode='lines', name='sin(x)'))
fig.update_layout(title="Sine Wave", xaxis_title="x", yaxis_title="sin(x)")

# Create figpack view
view = vv.PlotlyFigure(fig=fig)
view.show(open_in_browser=True)
```

## Constructor Parameters

- `fig`: The plotly figure object to display

## Multiple Subplots Example

```python
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import numpy as np
import figpack.views as vv

# Create subplots
fig = make_subplots(rows=2, cols=2, subplot_titles=("Plot 1", "Plot 2", "Plot 3", "Plot 4"))

# Add traces to different subplots
x = np.linspace(0, 10, 100)
fig.add_trace(go.Scatter(x=x, y=np.sin(x), name="sin"), row=1, col=1)
fig.add_trace(go.Scatter(x=x, y=np.cos(x), name="cos"), row=1, col=2)

# Histogram
data = np.random.normal(0, 1, 1000)
fig.add_trace(go.Histogram(x=data, name="histogram"), row=2, col=1)

# Scatter plot
fig.add_trace(go.Scatter(x=np.random.randn(100), y=np.random.randn(100),
                        mode='markers', name="scatter"), row=2, col=2)

fig.update_layout(height=600, title_text="Multiple Subplots")

view = vv.PlotlyFigure(fig=fig)
view.show(open_in_browser=True)
```

## Example

See [example_plotly.py](../examples/example_plotly.py) for a complete demonstration with various plot types.
