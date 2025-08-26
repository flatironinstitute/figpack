# figpack Documentation

A Python package for creating shareable, interactive visualizations in the browser.

## Overview

figpack enables you to create interactive scientific data visualizations that can be displayed in web browsers and easily shared with colleagues. It provides a powerful combination of Python APIs and web-based rendering.

### Core Concepts

- **Views**: The fundamental building blocks in figpack. Each view (like TimeseriesGraph, Image, or Markdown) represents a specific type of visualization or content.
- **Layouts**: Composite views that organize and arrange other views (Box, Splitter, TabLayout) to create complex visualization dashboards.
- **Display System**: The `show()` function intelligently handles visualization display across different environments (scripts, notebooks, cloud platforms).
- **Storage Format**: Uses Zarr for efficient handling of numerical arrays, ensuring smooth performance even with large datasets.

## Getting Started

```{toctree}
:maxdepth: 2
:caption: Contents:

installation
quickstart
tutorial
show_function
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

## Documentation Structure

- **[Installation](installation.md)**: Requirements and setup instructions
- **[Quick Start Guide](quickstart.md)**: Get up and running with basic examples
- **[Tutorial](tutorial.md)**: Step-by-step guide to creating various types of figures
- **[Show Function Reference](show_function.md)**: Detailed guide to the core display function
- **[API Reference](api/index.md)**: Complete documentation of all components

## Development and Support

- **[GitHub Repository](https://github.com/flatironinstitute/figpack)**: Source code, issues, and contributions
- **License**: Apache-2.0

## Indices and tables

- {ref}`genindex`
- {ref}`modindex`
