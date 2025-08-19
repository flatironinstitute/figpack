# figpack

A Python package for creating shareable, interactive visualizations in the browser.

## Overview

figpack enables you to create interactive data visualizations that can be displayed in a web browser and optionally shared online. The package focuses on timeseries data visualization with support for complex, nested layouts.

### Key Features

- **Interactive timeseries graphs** with line series, markers, and interval plots
- **Flexible layout system** with boxes, splitters, and tab layouts
- **Web-based rendering** that works in any modern browser
- **Shareable visualizations** that can be uploaded and shared via URLs
- **Zarr-based data storage** for efficient handling of large datasets

## Installation

Install figpack using pip:

```bash
pip install figpack
```

## Quick Start

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

## Available Views

figpack provides a comprehensive set of view components for creating interactive visualizations:

### Core Views

- **[TimeseriesGraph](docs/timeseries-graph.md)** - Interactive line plots, markers, and intervals ([example](examples/example_timeseries_graph.py))
- **[MultiChannelTimeseries](docs/multichannel-timeseries.md)** - Multi-channel timeseries visualization ([example](examples/example_multichannel_timeseries.py))
- **[Image](docs/image.md)** - Display images with optional annotations ([example](examples/example_image.py))
- **[Markdown](docs/markdown.md)** - Render markdown content ([example](examples/example_markdown.py))

### Layout Views

- **[Box](docs/box.md)** - Flexible container with horizontal/vertical layouts ([example](examples/example_box.py))
- **[Splitter](docs/splitter.md)** - Resizable split panes ([example](examples/example_splitter.py))
- **[TabLayout](docs/tab-layout.md)** - Tabbed interface for multiple views ([example](examples/example_tablayout.py))

### External Figure Support

- **[MatplotlibFigure](docs/matplotlib-figure.md)** - Embed matplotlib plots ([example](examples/example_matplotlib.py))
- **[PlotlyFigure](docs/plotly-figure.md)** - Embed plotly visualizations ([example](examples/example_plotly.py))

### Spike Sorting Views

- **[Autocorrelograms](docs/autocorrelograms.md)** - Auto-correlation analysis ([example](examples/example_autocorrelograms.py))
- **[CrossCorrelograms](docs/cross-correlograms.md)** - Cross-correlation analysis ([example](examples/example_cross_correlograms.py))
- **[UnitsTable](docs/units-table.md)** - Sortable table for spike sorting units ([example](examples/example_units_table.py))

## Examples

See the `examples/` directory for working examples of each view type.

## Usage Modes

### Local-only Mode

```python
view.show(open_in_browser=True, title="Local Visualization")
```

### Sharing Online

Set the `FIGPACK_API_KEY` environment variable and use:

```python
view.show(upload=True, open_in_browser=True, title="Shared Visualization")
```

### Development Mode

Set `_dev=True` in the call to show() to enable development mode, which allows for live updates and development of figpack-gui.

## Command Line Interface

figpack includes a command-line interface for working with figures:

### Download a Figure

```bash
figpack download <figure-url> <dest.tar.gz>
```

Download a figure from any figpack URL and save it as a local archive.

### View a Figure Archive

```bash
figpack view <figure.tar.gz>
```

Extract and view a figure archive in your browser. The server will run locally until you press Enter.

Use `--port <number>` to specify a custom port.

## License

Apache-2.0

## Contributing

Visit the [GitHub repository](https://github.com/magland/figpack) for issues, contributions, and the latest updates.
