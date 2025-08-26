# Documentation Development

This directory contains the Sphinx documentation for figpack.

## Local Development

### Prerequisites

Install the documentation dependencies:

```bash
pip install -e .[docs]
```

Or install manually:

```bash
pip install sphinx myst-parser sphinx-rtd-theme
```

### Building Documentation

To build the documentation locally:

```bash
cd docs
make html
```

The built documentation will be available in `_build/html/index.html`.

### Live Reload Development

For development with automatic rebuilding when files change, first install the docs dependencies:

```bash
pip install -e .[docs]
```

Then run:

```bash
cd docs
make livehtml
```

This will start a local server (usually at http://127.0.0.1:8000) that automatically rebuilds and refreshes when you make changes.

### Clean Build

To clean the build directory and rebuild:

```bash
cd docs
make clean-build
```

## GitHub Pages Deployment

Documentation is automatically built and deployed to GitHub Pages when changes are pushed to the main branch. The workflow is defined in `.github/workflows/docs.yml`.

## Structure

- `conf.py` - Sphinx configuration
- `index.md` - Main documentation page
- `installation.md` - Installation guide
- `quickstart.md` - Quick start guide
- `examples/` - Examples documentation
- `api/` - API reference documentation
- `_static/` - Static assets (images, CSS, etc.)
- `_build/` - Generated documentation (ignored by git)

## Writing Documentation

This documentation uses MyST (Markedly Structured Text) which allows you to write in Markdown with additional Sphinx features. See the [MyST documentation](https://myst-parser.readthedocs.io/) for syntax details.
