# Creating Figures

This guide will help you get started with figpack quickly. For detailed documentation of the `show()` function and all its configuration options, see the [show() function reference](show_function.md).

## Basic Usage

### Creating Your First Visualization

```python
import numpy as np
import figpack.views as vv

# Create a timeseries graph
graph = vv.TimeseriesGraph(y_label="Signal")

# Add some data
t = np.linspace(0, 10, 1000)
y = np.sin(2 * np.pi * t) * np.exp(-t/3)
graph.add_line_series(name="tapered sine wave", t=t, y=y, color="blue")

# Display the visualization
graph.show(open_in_browser=True, title="My First Graph")
```

Behind the scenes, when you run this code:

1. The TimeseriesGraph object stores your data (time points and sine wave values) in memory
2. When `.show()` is called, figpack:

   - Creates a temporary directory for your visualization
   - Copies the necessary web viewer files (HTML, JavaScript, CSS) into this directory
   - Saves your data into a [Zarr](https://zarr.readthedocs.io/) group format, which efficiently handles numerical arrays. figpack is compatible with both Zarr v2 and v3, working seamlessly with whichever version you have installed. However, note that figure data is always stored in v2 format for compatibility with the frontend visualization components.
   - Launches a local web server to serve these files
   - Opens your default web browser to display the visualization

3. In your browser:

   - The web viewer loads and reads the Zarr data
   - Your timeseries is rendered as an interactive plot
   - You can zoom, pan, and interact with the visualization

The code above produces a visualization like this:

<iframe src="https://figures.figpack.org/figures/default/3e392eb03d3ee8ebdad76bd6afc414e03f9e242e/index.html?embedded=1" width="100%" height="400" frameborder="0"></iframe>

### Stopping the Server

When running examples outside of a notebook environment, the server will wait for user input. Simply press Enter in the terminal to stop the server and continue execution.

## Sharing Online

You can share your visualizations by uploading them to figpack servers. For regular uploads, you'll need to set the `FIGPACK_API_KEY` environment variable:

```python
view.show(
    title="Shared Visualization",
    upload=True,
    description="A visualization to share with colleagues"
)
```

## Using in Jupyter Notebooks

In Jupyter notebooks, figpack automatically displays visualizations inline within your notebook cells:

```python
view.show(
    title="Notebook Visualization",
    inline_height=800  # Adjust the height as needed
)
```

You can customize the display height using the `inline_height` parameter (default is 600 pixels).

## Working with Saved Figures

You can save figures to folders or archive files directly from your Python code:

```python
# Save to a folder
graph.save("my_figure_folder", title="My Figure Title")

# Save to a .tar.gz file
graph.save("my_figure.tar.gz", title="My Figure Title")
```

You can then view these saved figures using the command line interface:

```bash
# View a saved figure (from folder or .tar.gz)
figpack view my_figure.tar.gz
```

Saved figures include all necessary data and viewer files, so they are future-proof and can be shared easily.

For online figures, you can download them using the CLI:

```bash
# Download a figure from a URL
figpack download https://figures.figpack.org/figures/default/3e392eb03d3ee8ebdad76bd6afc414e03f9e242e/index.html downloaded_figure.tar.gz
```

Then view it:

```bash
figpack view downloaded_figure.tar.gz
```

You can also view figures from within your Python scripts:

```python
# View any figure (from folder or .tar.gz)
from figpack import view_figure
view_figure("path/to/figure.tar.gz")
```

When viewing figures, a local server will start and open your browser. Press Enter in the terminal to stop the server.

## Archiving on Zenodo

For long-term preservation and citability, you can archive your figures on Zenodo and view them through figpack's web interface. See the [Zenodo Archival Guide](zenodo_archival.md) for details.
