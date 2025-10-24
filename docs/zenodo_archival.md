# Archiving Figures on Zenodo

This guide shows how to archive figpack visualizations on Zenodo for permanent storage and citation, then view them through figpack's web interface.

## Why Zenodo?

- Get a citable reference for your figures
- Long-term preservation
- Free hosting for research outputs

## Workflow Overview

1. Create and save your figure as `.tar.gz`
2. Upload to Zenodo and get a DOI
3. View via `https://figpack.org/view?source=<zenodo-url-to-figure-file>`

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

### Option A: View it locally

```bash
figpack view "https://zenodo.org/records/[RECORD_ID]/files/my_figure.tar.gz"
```

### Option B: Direct Browser Access (good for sharing)

Simply visit:
```
https://manage.figpack.org/view?source=https://zenodo.org/records/[RECORD_ID]/files/my_figure.tar.gz
```

**First-time setup**: The first person to view this URL will need to create the cached figure using the CLI (see Option B).

### Option C: CLI Upload (First Time Only)

If the figure hasn't been cached yet, use the CLI to create it:

```bash
# Set your API key
export FIGPACK_API_KEY=your-api-key

# Upload and cache the figure
figpack upload-from-source-url "https://zenodo.org/records/[RECORD_ID]/files/my_figure.tar.gz" --title "My Figure"
```

This creates a figpack figure linked to your Zenodo URL. After this, anyone can view it using Option A without needing an API key.

## Query Existing Figures

To check if a figure already exists for a Zenodo URL:

```bash
figpack find-by-source-url "https://zenodo.org/records/[RECORD_ID]/files/my_figure.tar.gz"
```

## Example

Here's a complete example URL format:

https://figpack.org/view?source=https://sandbox.zenodo.org/records/391408/files/hello_figpack.tgz

## Note

You may want to provide the URL to the shareable URL in the description field on Zenodo for easy access.