# Contributing to figpack

## Development Setup

1. Clone the repository
2. Install in development mode: `pip install -e .`
3. Install GUI dependencies: `cd figpack-gui && npm install`

## Making Changes

- Follow existing code style and conventions
- Add tests for new functionality
- Update documentation as needed

## Releasing to PyPI

To create a new release and publish to PyPI:

### 1. Update the version

Update the version number in **both** of these files:

- `figpack/__init__.py`: Update the `__version__` variable
- `pyproject.toml`: Update the `version` field

Make sure both files have the exact same version number.

### 2. Commit and push the changes

```bash
git add figpack/__init__.py pyproject.toml
git commit -m "Bump version to X.Y.Z"
git push origin main
```

### 3. Automatic deployment

The GitHub Actions workflow will automatically:

- Build the GUI components
- Create the Python package
- Publish to PyPI
- Create and push a git tag (e.g., `vX.Y.Z`)

The deployment is triggered automatically when changes are pushed to `figpack/__init__.py` on the main branch. You can also trigger it manually from the GitHub Actions tab if needed.

### 4. Verify the release

- Check that the new version appears on [PyPI](https://pypi.org/project/figpack/)
- Verify that a new git tag was created in the repository
- Test installing the new version: `pip install --upgrade figpack`

## Manual Release (if needed)

If the automatic workflow fails, you can manually release:

```bash
# Build the GUI
cd figpack-gui
npm run build
cd ..

# Build and upload to PyPI
python -m build
python -m twine upload dist/*
```

Note: Manual releases require PyPI credentials to be configured locally.
