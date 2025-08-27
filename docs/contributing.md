# Contributing to figpack

## Project Overview

figpack is a Python package for interactive browser visualizations. It consists of:

- Core Python package
- Web API (figpack-api)
- Figure GUI (figpack-figure)
- Management interface (figpack-manage)

The Figure GUI is what renders the figures. The build assets are included in the Python package and get injected into the figure directories.

## Setup Development Environment

1. Install Python 3.8+
2. Fork the repository and clone your fork, or clone the repository directly and create a branch if you have been granted write access.
3. Install development dependencies:

```bash
pip install -e ".[dev,test]"
pre-commit install
```

## Development Standards

- Code formatting: Black (line length 88)
- Test coverage: 60% minimum
- Python support: 3.8+

## Testing

Run tests:

```bash
pytest
```

## Making Changes

1. Create a fork or branch (depending on access)
2. Make changes
3. Ensure tests pass
4. Update documentation if needed
5. Submit pull request

## Pull Request Requirements

- Tests pass
- Coverage meets minimum
- Documentation updated
- Pre-commit hooks pass

## Issues

File bug reports and feature requests via GitHub Issues. Include:

- Steps to reproduce (for bugs)
- Expected vs actual behavior
- Python/package versions

## Developer Guide

For detailed information, see the [Developer Guide](./developer_guide/index).
