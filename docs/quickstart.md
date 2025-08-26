# Quick Start Guide

This guide will help you get started with figpack quickly.

## Basic Usage

### Creating Your First Visualization

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
graph.show(open_in_browser=True, title="My First Graph")
```

### Stopping the Server

When running examples outside of a notebook environment, the server will wait for user input. Simply press Enter in the terminal to stop the server and continue execution.

## Usage Modes

### Local-only Mode

Display visualizations locally in your browser:

```python
view.show(open_in_browser=True, title="Local Visualization")
```

### Sharing Online

To share visualizations online, set the `FIGPACK_API_KEY` environment variable and use:

```python
view.show(upload=True, open_in_browser=True, title="Shared Visualization")
```

## Available Views

figpack provides several types of views:

- **TimeseriesGraph** - Interactive line plots, markers, and intervals
- **MultiChannelTimeseries** - Multi-channel timeseries visualization
- **Image** - Display images with optional annotations
- **Markdown** - Render markdown content
- **Box** - Flexible container with horizontal/vertical layouts
- **Splitter** - Resizable split panes
- **TabLayout** - Tabbed interface for multiple views

## Next Steps

- Explore the [examples](examples/index.md) to see more complex visualizations
- Check the [API documentation](api/index.md) for detailed reference
- Visit the [GitHub repository](https://github.com/flatironinstitute/figpack) for more information
