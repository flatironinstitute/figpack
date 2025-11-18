# figpack

[![Tests](https://github.com/flatironinstitute/figpack/actions/workflows/test.yml/badge.svg)](https://github.com/flatironinstitute/figpack/actions/workflows/test.yml)
[![codecov](https://codecov.io/gh/flatironinstitute/figpack/branch/main/graph/badge.svg)](https://codecov.io/gh/flatironinstitute/figpack)
[![PyPI version](https://badge.fury.io/py/figpack.svg)](https://badge.fury.io/py/figpack)

A Python package for creating shareable, interactive visualizations in the browser.

## Documentation

For detailed guidance, tutorials, and API reference, visit our **[documentation](https://flatironinstitute.github.io/figpack)**.

## Quick Start

Want to jump right in? Here's how to get started:

```bash
pip install figpack
```

```python
import numpy as np
import figpack.views as vv

# Create a timeseries graph
graph = vv.TimeseriesGraph(y_label="Signal")

# Add some data
t = np.linspace(0, 10, 1000)
y = np.sin(2 * np.pi * t)
graph.add_line_series(name="sine wave", t=t, y=y, color="blue")

# Display the visualization in your browser
graph.show(open_in_browser=True, title="Quick Start Example")
```

## License

Apache-2.0

## Citation

If you use figpack in your research, please cite it:

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.17419621.svg)](https://doi.org/10.5281/zenodo.17419621)

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

Or in APA format:

> Magland, J. (2025). figpack (Version 0.3.7) [Computer software]. Zenodo. https://doi.org/10.5281/zenodo.17419621

## Contributing

Visit the [GitHub repository](https://github.com/flatironinstitute/figpack) for issues, contributions, and the latest updates.
