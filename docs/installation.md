# Installation

## Requirements

- Python 3.8 or higher
- pip package manager

## Install from PyPI

Install figpack using pip:

```bash
pip install figpack
```

## Development Installation

If you want to contribute to figpack or install from source:

```bash
git clone https://github.com/flatironinstitute/figpack.git
cd figpack
pip install -e .
```

## Extension Packages

Figpack provides several extension packages with specialized visualization capabilities:

- **figpack_3d**: 3D visualization extension using Three.js
- **figpack_force_graph**: Force-directed graph visualization extension  
- **figpack_franklab**: Frank Lab specific neuroscience visualization tools
- **figpack_spike_sorting**: Spike sorting specific visualization tools

### Installing Extension Packages

You can install extension packages directly from our GitHub Pages wheel repository:

```bash
# Install the 3D visualization extension
pip install --find-links https://flatironinstitute.github.io/figpack/wheels/ figpack_3d

# Install the force graph extension
pip install --find-links https://flatironinstitute.github.io/figpack/wheels/ figpack_force_graph

# Install the spike sorting extension
pip install --find-links https://flatironinstitute.github.io/figpack/wheels/ figpack_spike_sorting

# Install the Frank Lab extension
pip install --find-links https://flatironinstitute.github.io/figpack/wheels/ figpack_franklab
```

You can also browse and download wheels directly from the [wheels page](https://flatironinstitute.github.io/figpack/wheels/).

### Development Installation of Extensions

For development work on extension packages:

```bash
git clone https://github.com/flatironinstitute/figpack.git
cd figpack/extension_packages/figpack_3d  # or any other extension
npm install  # if the extension has JavaScript components
npm run build  # if the extension has JavaScript components
pip install -e .
```

## Verify Installation

To verify that figpack is installed correctly, run:

```bash
figpack --version
```

or in Python:

```python
import figpack
print(figpack.__version__)
```

You should see the version number printed without any errors.
