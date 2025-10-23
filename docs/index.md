# figpack Documentation

A Python package for creating shareable, interactive visualizations in the browser.

[Star this project on GitHub](https://github.com/flatironinstitute/figpack)

<iframe src="./example_rotator.html" width="100%" height="400" frameborder="0"></iframe>

## Overview

[Figpack Overview Presentation](https://magland.github.io/figpack-overview-presentation/)

**figpack** is a Python package for creating interactive scientific visualizations that can be displayed directly in web browsers and easily shared. Unlike traditional plotting libraries, figpack produces **self-contained HTML bundles** that include both the rendering logic and the underlying data. This makes figures portable, reproducible, and suitable for long-term archiving (for example, uploading to Zenodo).

At its core, figpack provides a flexible system of **views** (such as time series graphs, images, and domain-specific displays), organized into **layouts** that can compose complex dashboards. Different views within a layout are **synchronized**, sharing state such as the current timepoint, visible time range, or selected units, which enables coordinated exploration across multiple visualizations.

Figures can be stored either locally or in the cloud. Local figures are stored on your machine and are great for development and testing. By setting `upload=True` when showing a figure (or using the `FIGPACK_UPLOAD=1` environment variable), you can upload the figure to the figpack cloud service, making it shareable and accessible from anywhere. Cloud storage is particularly useful for sharing results with collaborators, using figures on headless systems, or ensuring long-term archival access.

Data are stored in the efficient **Zarr** format, enabling interactive exploration of very large datasets through techniques like hierarchical downsampling.

Although primarily motivated by applications in **neurophysiology** (e.g., spike sorting), figpack is designed as a **general framework** for scientific applications.

```{raw} html
<div class="assistant-container">
  <iframe
    class="assistant-iframe"
    src="https://figpack-assistant.vercel.app/chat"
    allow="clipboard-read; clipboard-write"
  ></iframe>
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
        iframe.src = 'https://figpack-assistant.vercel.app/chat';
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
- **Extensions**: A system for creating custom views with specialized JavaScript visualizations, enabling integration of external libraries and custom rendering logic.

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

# Display the visualization locally
graph.show(open_in_browser=True, title="Quick Start Example")

# Or upload to cloud to share with others
# graph.show(upload=True, title="Quick Start Example")
```

## Documentation Structure

- **[Installation](installation.md)**: Requirements and setup instructions
- **[Creating figures](creating_figures.md)**: Getting started with building visualizations
- **[Basic Views Tutorial](basic_views_tutorial.md)**: Step-by-step guide to creating various types of figures
- **[Spike Sorting Tutorial](spike_sorting_tutorial.md)**: Getting started with spike sorting visualizations
- **[Miscellaneous Tutorial](misc_tutorial.md)**: Tutorial covering various figpack extensions
- **[NWB Tutorial](nwb_tutorial.md)**: Guide to creating NWB visualizations using figpack's NWB extension
- **[Show Function Reference](show_function.md)**: Detailed guide to the core display function
- **[Slides Tutorial](slides_tutorial.md)**: Creating interactive slide presentations with Figpack Slides
- **[Figpack vs Figurl Comparison](figpack_vs_figurl_comparison.md)**: Comparison of approaches between figpack and figurl
- **[API Reference](api/index.md)**: Complete documentation of all components
- **[Contributing](contributing.md)**: How to contribute to figpack
- **[Developer Guide](developer_guide/index.md)**: In-depth information for extending figpack
- **[Creating a New View](developer_guide/creating_a_new_view.md)**: Step-by-step guide to implementing custom views

## Citation

If you use figpack in your research, please cite it:

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.17419621.svg)](https://doi.org/10.5281/zenodo.17419621)

**BibTeX:**

```bibtex
@software{magland_figpack_2025,
  author       = {Magland, Jeremy},
  title        = {figpack},
  year         = 2025,
  publisher    = {Zenodo},
  doi          = {10.5281/zenodo.17419621},
  url          = {https://doi.org/10.5281/zenodo.17419621}
}
```

**APA Format:**

> Magland, J. (2025). figpack (Version 0.2.35) [Computer software]. Zenodo. https://doi.org/10.5281/zenodo.17419621

For more citation formats, see the [CITATION.cff](https://github.com/flatironinstitute/figpack/blob/main/CITATION.cff) file in the repository.

## Development and Support

- **[GitHub Repository](https://github.com/flatironinstitute/figpack)**: Source code, issues, and contributions
- **License**: Apache-2.0

## Indices and tables

- {ref}`genindex`
- {ref}`modindex`

## Getting Started

```{toctree}
:maxdepth: 2
:caption: Contents:

installation
creating_figures
basic_views_tutorial
spike_sorting_tutorial
misc_tutorial
nwb_tutorial
show_function
slides_tutorial
figpack_vs_figurl_comparison
api/index
contributing
developer_guide/index
```
