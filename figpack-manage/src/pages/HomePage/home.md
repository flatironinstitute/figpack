# Welcome to Figpack

A Python package for creating shareable, interactive visualizations in the browser.

- [Documentation](https://flatironinstitute.github.io/figpack)
- [Source Code](https://github.com/flatironinstitute/figpack)

## Quick Getting Started

### Installation

Install figpack using pip:

```bash
pip install figpack
```

### Create Your First Figure

Here's a simple example to create an interactive plot:

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
graph.show(open_in_browser=True, title="My First Figure")
```

This will create a figure stored locally on your machine and open it in your browser.

### Sharing Figures (Optional)

If you want to **upload and share** your figures with others, you'll need to set your API key:

```bash
export FIGPACK_API_KEY=your_api_key_here
```

Then use one of the following methods to upload your figure:

**Option 1: Environment Variable**

```bash
export FIGPACK_UPLOAD=1
```

Then run your script as usual.

**Option 2: Upload Parameter**

```python
# Set the API key in your environment, then:
graph.show(upload=True, title="Shared Figure")
```

When uploading, your figure will be stored in the figpack cloud and you'll receive a shareable URL.

**Note:** You only need an account if you want to upload figures for sharing. Local figure creation works without authentication.

## Need Help?

For more detailed instructions and advanced features, check out the [official documentation](https://flatironinstitute.github.io/figpack) or reach out to the authors.
