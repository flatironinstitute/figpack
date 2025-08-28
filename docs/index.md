# figpack Documentation

A Python package for creating shareable, interactive visualizations in the browser.

[Star this project on GitHub](https://github.com/flatironinstitute/figpack)

## Overview

**figpack** is a Python package for creating interactive scientific visualizations that can be displayed directly in web browsers and easily shared. Unlike traditional plotting libraries, figpack produces **self-contained HTML bundles** that include both the rendering logic and the underlying data. This makes figures portable, reproducible, and suitable for long-term archiving (for example, uploading to Zenodo).

At its core, figpack provides a flexible system of **views** (such as time series graphs, images, and domain-specific displays), organized into **layouts** that can compose complex dashboards. Different views within a layout are **synchronized**, sharing state such as the current timepoint, visible time range, or selected units, which enables coordinated exploration across multiple visualizations.

Data are stored in the efficient **Zarr** format, enabling interactive exploration of very large datasets through techniques like hierarchical downsampling. Rendering is handled by **React-based web applications**, allowing custom and highly interactive views that go beyond conventional charting.

Although primarily motivated by applications in **neurophysiology** (e.g., spike sorting), figpack is designed as a **general framework**. General-purpose components such as time series graphs are immediately useful in many scientific domains, and its plugin-oriented design encourages contributions of specialized views from other fields.

```{raw} html
<div class="assistant-container">
  <iframe class="assistant-iframe"></iframe>
</div>
<button class="assistant-toggle">Open Assistant</button>
<script>
  document.addEventListener('DOMContentLoaded', function() {
    const toggle = document.querySelector('.assistant-toggle');
    const container = document.querySelector('.assistant-container');
    const iframe = document.querySelector('.assistant-iframe');
    let iframeLoaded = false;

    toggle.addEventListener('click', function() {
      const isShowing = container.classList.toggle('show');

      // Load iframe content only when first opened
      if (isShowing && !iframeLoaded) {
        iframe.src = 'https://magland.github.io/figpack-assistant/chat';
        iframeLoaded = true;
      }
    });
  });
</script>
```

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
contributing
developer_guide/index
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
