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

## Optional Dependencies

For additional functionality, you can install optional dependencies:

```bash
# For testing
pip install figpack[test]

# For development
pip install figpack[dev]
```

## Verify Installation

To verify that figpack is installed correctly, run:

```python
import figpack
print(figpack.__version__)
```

You should see the version number printed without any errors.
