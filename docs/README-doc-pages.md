# Documentation Pages JSON

The `doc-pages.json` file contains metadata about all documentation pages for use by the figpack-assistant project.

## Usage

- **Source**: `docs/doc-pages.json`
- **Deployed**: `https://flatironinstitute.github.io/figpack/doc-pages.json`

## Maintenance

When adding new documentation pages, add an entry to `doc-pages.json` and rebuild with `make html`.

The file is automatically copied to the build output via `html_extra_path` in `conf.py`.
