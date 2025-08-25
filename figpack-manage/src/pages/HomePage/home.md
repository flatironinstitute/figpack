# Welcome to Figpack

A tool for creating and managing browser-based scientific figures and sharing them with collaborators.

## Getting Started

First, install the required packages:

```bash
pip install figpack numpy "zarr<3"
```

Then you can create and display a simple visualization:

```python
import numpy as np
import figpack.views as vv

# Create a timeseries graph
graph = vv.TimeseriesGraph(y_label="Signal")

# Add some data
t = np.linspace(0, 10, 1000)
# Create a tapered sine wave using exponential decay
y = np.sin(2 * np.pi * t) * np.exp(-0.3 * t)
graph.add_line_series(name="tapered sine wave", t=t, y=y, color="blue")

# Display the visualization
graph.show(open_in_browser=True, title="Quick Start Example")
```

This will host the figure locally and open it in your browser.

## Sharing Figures

To share figures with others, you'll need to:

1. Obtain a Figpack API key
2. Set the `FIGPACK_API_KEY` environment variable
3. Upload your figure using:

```python
url = graph.show(open_in_browser=True, upload=True, title="Quick Start Example")
```

You can then share the [generated URL](https://figures.figpack.org/figures/default/6836e1029d9b8b62738cf1dc0c3949676953d712/index.html) with others.

**Note**: By default, figures expire after 24 hours, but you can use this web interface to manage, renew, and pin figures.

## Resources

- [Figpack Source Code](https://github.com/magland/figpack)
- [Example Gallery](https://github.com/magland/figpack/tree/main/examples)
