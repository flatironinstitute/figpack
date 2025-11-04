# Core Python Package

This document provides technical details about figpack's core Python package implementation, focusing on the architecture and patterns developers need to understand when extending or contributing to the Python side of figpack.

## Package Architecture

### Core Structure

```
figpack/
├── __init__.py              # Package entry point
├── cli.py                   # Command-line interface
├── core/                    # Core functionality
│   ├── figpack_view.py      # Base view class
│   ├── _show_view.py        # Display system
│   ├── _bundle_utils.py     # Figure bundling
│   ├── _server_manager.py   # Local server management
│   └── config.py            # Configuration
├── views/                   # Built-in view components
└── spike_sorting/           # Domain-specific extensions
```

### Design Principles

**View-Based Architecture**: All visualizations inherit from `FigpackView` and implement a consistent interface for data serialization and display.

**Zarr Storage**: Data is serialized to the Zarr format for efficient storage, cross-platform compatibility, and integration with the frontend.

**Environment Intelligence**: The display system automatically detects the execution environment (Jupyter, Colab, scripts) and adapts behavior accordingly.

**Plugin System**: Domain-specific functionality is organized into separate modules that extend the core system.

## FigpackView Base Class

The `FigpackView` class provides the foundation for all figpack visualizations:

```python
class FigpackView:
    def show(self, *, title: str, **kwargs):
        """Display with intelligent environment detection"""

    def save(self, output_path: str, *, title: str):
        """Save as figure bundle"""

    def write_to_zarr_group(self, group: figpack.Group):
        """Serialize data - implemented by subclasses"""
        raise NotImplementedError
```

### Key Responsibilities

- **Consistent Interface**: All views use the same `show()` and `save()` methods
- **Environment Detection**: Automatically handles Jupyter notebooks, cloud platforms, and standalone scripts
- **Data Serialization**: Manages the conversion from Python objects to Zarr format

### The show() Method

The `show()` method implements intelligent display behavior:

```python
# Environment detection examples
if _is_in_colab():
    upload = True; ephemeral = True
elif _is_in_jupyterhub():
    upload = True; ephemeral = True
elif _is_in_notebook():
    inline = True
else:
    open_in_browser = True
```

**Display modes:**

- **Local server**: For scripts and local Jupyter notebooks
- **Upload**: For cloud environments (Colab, JupyterHub)
- **Inline**: For notebook environments with iframe display

## Data Serialization with Zarr

### The \write_to_zarr_group Pattern

Every view must implement `write_to_zarr_group()` to serialize its data:

```python
def write_to_zarr_group(self, group: figpack.Group) -> None:
    # 1. Set view type for frontend routing
    group.attrs["view_type"] = "TimeseriesGraph"

    # 2. Store configuration as attributes
    group.attrs["y_label"] = self.y_label
    group.attrs["legend_opts"] = self.legend_opts

    # 3. Store data arrays as datasets
    group.create_dataset("data", data=self.data.astype(np.float32))

    # 4. Handle nested structures
    for i, series in enumerate(self._series):
        series_group = group.create_group(f"series_{i}")
        series.write_to_zarr_group(series_group)
```

### Best Practices

**Data Types**: Use `np.float32` instead of `np.float64` to reduce file sizes without significant precision loss.

**Attributes vs Datasets**: Store configuration and metadata in `group.attrs`, numerical arrays as datasets.

**View Type**: Always set `group.attrs["view_type"]` to match the frontend component name.

**Validation**: Validate data before serialization to provide clear error messages.

## Creating New Views

### Basic Implementation

```python
import numpy as np
import figpack

class BarChart(figpack.FigpackView):
    def __init__(self, categories, values, colors=None, title=""):
        self.categories = list(categories)
        self.values = np.asarray(values, dtype=np.float32)
        self.colors = colors or ["blue"] * len(categories)
        self.title = title

        # Validation
        if len(self.categories) != len(self.values):
            raise ValueError("Categories and values must have same length")

    def write_to_zarr_group(self, group: figpack.Group) -> None:
        group.attrs["view_type"] = "BarChart"
        group.attrs["title"] = self.title
        group.attrs["categories"] = self.categories
        group.attrs["colors"] = self.colors

        group.create_dataset("values", data=self.values)
```

### Implementation Checklist

- [ ] Inherit from `FigpackView`
- [ ] Validate inputs in `__init__`
- [ ] Implement `write_to_zarr_group()`
- [ ] Set `view_type` attribute
- [ ] Use appropriate data types
- [ ] Handle edge cases gracefully

### Complex Views with Series

For views with multiple data series (like TimeseriesGraph):

```python
class TimeseriesGraph(FigpackView):
    def __init__(self, **options):
        self._series = []
        self.options = options

    def add_line_series(self, name, t, y, color="blue", **kwargs):
        series = TGLineSeries(name=name, t=t, y=y, color=color, **kwargs)
        self._series.append(series)

    def write_to_zarr_group(self, group: figpack.Group) -> None:
        group.attrs["view_type"] = "TimeseriesGraph"
        group.attrs["series_names"] = [s.name for s in self._series]

        # Store each series in its own subgroup
        for series in self._series:
            series_group = group.create_group(series.name)
            series.write_to_zarr_group(series_group)
```

## Domain-Specific Extensions

### Creating Specialized Modules

For domain-specific functionality, create separate modules:

```python
# figpack/neuroscience/__init__.py
from .views import SpikeRaster, Spectrogram
import figpack

# figpack/neuroscience/views/spike_raster.py
class SpikeRaster(FigpackView):
    def __init__(self, spike_times, unit_ids, **kwargs):
        self.spike_times = spike_times
        self.unit_ids = unit_ids
        # Domain-specific processing

    def write_to_zarr_group(self, group: figpack.Group):
        group.attrs["view_type"] = "SpikeRaster"
        # Serialize spike data efficiently
```

### Module Organization

**Separate concerns**: Keep domain logic separate from core functionality
**Consistent patterns**: Follow the same view patterns as core views  
**Documentation**: Include domain-specific examples and use cases

## Configuration and Environment

### Environment Variables

Key environment variables that control figpack behavior:

```python
# Force upload mode
FIGPACK_UPLOAD=1

# Force inline display
FIGPACK_INLINE=1

# Force browser opening
FIGPACK_OPEN_IN_BROWSER=1

# Development mode
FIGPACK_DEV=1

# Custom API endpoint
FIGPACK_API_BASE_URL=https://custom-api.example.com
```

### Configuration Files

Core configuration in `figpack/core/config.py`:

```python
FIGPACK_API_BASE_URL = os.getenv(
    "FIGPACK_API_BASE_URL", "https://figpack-api.figpack.org"
)
FIGPACK_BUCKET = os.getenv("FIGPACK_BUCKET", "figpack-figures")
```

## Development Workflow

### Setting Up Development

```bash
# Clone and install in development mode
git clone https://github.com/flatironinstitute/figpack.git
cd figpack
pip install -e ".[dev]"

# Run tests
pytest tests/

# Enable development mode for frontend integration
export FIGPACK_DEV=1
```

## Error Handling

### Robust Implementation

```python
def write_to_zarr_group(self, group: figpack.Group) -> None:
    try:
        # Validate data
        if self.data is None:
            raise ValueError("Data cannot be None")

        data = np.asarray(self.data, dtype=np.float32)
        if data.size == 0:
            raise ValueError("Data cannot be empty")

        group.attrs["view_type"] = "CustomView"
        group.create_dataset("data", data=data)

    except Exception as e:
        raise RuntimeError(f"Failed to serialize {self.__class__.__name__}: {e}") from e
```

## CLI Interface

The `figpack` command-line tool provides utilities for working with figures:

```bash
# Download a figure from URL
figpack download https://example.com/figure.html figure.tar.gz

# View a downloaded figure locally
figpack view figure.tar.gz --port 8080
```

### CLI Implementation

The CLI is implemented in `figpack/cli.py` and provides:

- Figure downloading from URLs
- Local figure viewing
- Manifest parsing and validation

## Contributing Guidelines

### Code Style

- Follow PEP 8 conventions
- Use type hints for public APIs
- Include comprehensive docstrings
- Validate inputs and provide clear error messages

### Testing

- Add tests for new view types in `tests/`
- Include edge cases and error conditions

### Documentation

- Include usage examples
- Document any new configuration options
