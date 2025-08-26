# figpack Documentation

A Python package for creating shareable, interactive visualizations in the browser.

## Overview

figpack enables you to create interactive data visualizations that can be displayed in a web browser and optionally shared online. The package focuses on timeseries data visualization with support for complex, nested layouts.

### Key Features

- **Interactive timeseries graphs** with line series, markers, and interval plots
- **Flexible layout system** with boxes, splitters, and tab layouts
- **Web-based rendering** that works in any modern browser
- **Shareable visualizations** that can be uploaded and shared via URLs
- **Zarr-based data storage** for efficient handling of large datasets

## Getting Started

```{toctree}
:maxdepth: 2
:caption: Contents:

installation
quickstart
examples/index
api/index
```

## Quick Example

```python
import numpy as np
import figpack.views as vv

# Create a timeseries graph
graph = vv.TimeseriesGraph(y_label="Signal")

# Add some data
t = np.linspace(0, 10, 1000)
y = np.sin(2 * np.pi * t)
graph.add_line_series(name="sine wave", t=t, y=y, color="blue")

# Display the visualization
graph.show(open_in_browser=True, title="Quick Start Example")
```

## Indices and tables

- {ref}`genindex`
- {ref}`modindex`
- {ref}`search`
