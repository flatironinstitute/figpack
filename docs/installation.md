# Installation

## Requirements

- Python 3.8 or higher

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

- **figpack_spike_sorting**: Spike sorting specific visualization tools (available on PyPI)
- **figpack_3d**: 3D visualization extension using Three.js
- **figpack_force_graph**: Force-directed graph visualization extension  
- **figpack_franklab**: Frank Lab specific neuroscience visualization tools
- **figpack_experimental**: Experimental features and visualizations

### Installing Extension Packages

#### From PyPI

The figpack_spike_sorting extension is available directly from PyPI:

```bash
# Install the spike sorting extension from PyPI
pip install figpack_spike_sorting
```

#### Using the figpack CLI

For other extensions:

```bash
# List available extensions
figpack extensions list

# Install specific extensions
figpack extensions install figpack_3d

# Install all available extensions
figpack extensions install --all

# Upgrade an already installed extension
figpack extensions install figpack_3d --upgrade
```

#### Manual Installation from Wheels

You can also install extension packages directly from our GitHub Pages wheel repository:

```bash
# Install extensions from wheels (for extensions not on PyPI)
pip install --find-links https://flatironinstitute.github.io/figpack/wheels/ figpack_3d
```

Or browse and download wheels directly from the [wheels page](https://flatironinstitute.github.io/figpack/wheels/).

#### Managing Extensions

```bash
# List all extensions and their status
figpack extensions list

# Uninstall extensions
figpack extensions uninstall figpack_3d

# Get help for extension commands
figpack extensions --help
```

### Development Installation of Extensions

For development work on extension packages:

```bash
git clone https://github.com/flatironinstitute/figpack.git
cd figpack/extension_packages/figpack_experimental  # or any other extension
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
