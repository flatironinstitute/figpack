# Contributing to figpack

## Development Setup

1. Clone the repository
2. Install in development mode: `pip install -e ".[dev]"`
3. Install GUI dependencies: `cd figpack-gui && npm install`
4. Set up pre-commit hooks: `pre-commit install`

## Code Formatting

This project uses [black](https://black.readthedocs.io/) for code formatting. The formatting is automatically enforced through pre-commit hooks.

### Automatic Formatting (Recommended)

Once you've run `pre-commit install`, black will automatically format your code before each commit:

1. Make your changes
2. `git add` your files
3. `git commit` - black will run automatically and format your code
4. If formatting changes were made, add the formatted files and commit again

### Manual Formatting

You can also run black manually:

```bash
# Format all Python files
black figpack tests

# Check formatting without making changes
black --check figpack tests

# Run all pre-commit hooks manually
pre-commit run --all-files
```

### Configuration

Black is configured in `pyproject.toml` with:

- Line length: 88 characters
- Target Python version: 3.8+
- Excludes: figpack-gui, figpack-api, figpack-manage-figure directories

## Making Changes

- Follow existing code style and conventions
- Code must pass black formatting (enforced by pre-commit hooks)
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
