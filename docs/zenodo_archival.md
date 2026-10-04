# Archiving Figures on Zenodo

This guide shows how to archive figpack visualizations on Zenodo for permanent storage and citation, then view them locally with the figpack command-line tool.

## Why Zenodo?

- Get a citable reference for your figures
- Long-term preservation
- Free hosting for research outputs

## Workflow Overview

1. Create and save your figure as `.tar.gz`
2. Upload to Zenodo and get a DOI
3. View with `figpack view <zenodo-url-to-figure-file>`

## Step 1: Create Your Figure

```python
import numpy as np
import figpack.views as vv

# Create your visualization
graph = vv.TimeseriesGraph(y_label="Signal")
t = np.linspace(0, 10, 1000)
y = np.sin(2 * np.pi * t)
graph.add_line_series(name="sine wave", t=t, y=y, color="blue")

# Save as .tar.gz
graph.save("my_figure.tar.gz", title="My Figure")
```

Or download from a figure that has been uploaded:

```bash
figpack download https://figures.figpack.org/figures/default/[figure-id]/index.html my_figure.tar.gz
```

## Step 2: Upload to Zenodo

For testing you can use [Zenodo Sandbox](https://sandbox.zenodo.org). For production, use [Zenodo](https://zenodo.org).

After you create a new record, upload your file(s) and publish, the download URL will look like:
```
https://zenodo.org/records/[RECORD_ID]/files/my_figure.tar.gz
```

## Step 3: View Your Figure

```bash
figpack view "https://zenodo.org/records/[RECORD_ID]/files/my_figure.tar.gz"
```

This downloads the archive, extracts it to a temporary directory, and serves it locally in your browser. It also accepts a path to a local `.tar.gz` file.
