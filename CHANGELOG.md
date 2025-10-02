# Change Log

## [Unreleased]

## [0.2.26] - 2025-10-02

- Box Layout - do not leave room for empty titles
- figpack_3d - mesh view with sphere example

## [0.2.25] - 2025-09-25

- Fix bug where FIGPACK_REMOTE_ENV=1 was not forcing upload=True

## [0.2.24] - 2025-09-24

- Support FIGPACK_REMOTE_ENV environment variable to indicate remote/cloud environment (Colab/JupyterHub) or local environment for purposes of determining ephemeral behavior

## [0.2.23] - 2025-09-24

- Hardening of api for create/upload/finalize figure (retries, etc)
- Implement MountainLayout view

## [0.2.22] - 2025-09-24

- Support custom Zarr codecs defined in figpack extensions
- Move mp4 decoder to figpack_experimental extension
- Rename jfm -> experimental in figpack_experimental extension
- Fix ephemeral bug
- Fix bug where manage figure button was not showing up

## [0.2.21] - 2025-09-17

- Remove chroma-js dependency
- Move main plugin to figpack-figure main package (no longer a separate package)
- Code cleanup
- MP4 codec for Zarr
- Lossy video view in figpack_experimental extension

## [0.2.20] - 2025-09-16

- Export as SVG for Timeseries Graph, Spectrogram, Multichannel Timeseries
- Annotations and curation
- Linting/formatting for extensions

## [0.2.19] - 2025-09-12

- Added unit locations spike sorting view
- Reworked context provider structure in preparation for moving plugins to figpack extensions
- Moved franklab view to franklab_extension package
- Removed extension registry (no longer needed)
- Added support for editing figures - annotations, curations, etc
- Created SortingCuration view
- Created figpack_experimental extension for experimental views (editable notes view)
- Created figpack_nwb extension for viewing NWB items - starting with PlaneSegmentation
- Cachebust for cases where we know data may change (e.g., annotations)
- Build wheels for figpack extensions and host them on github pages, with extensions cli for managing installs
- Created figpack_spike_sorting extension - ported code from plugin package
- Created figpack_spike_sorting on pypi

## [0.2.15] - 2025-09-08
- Support for Zarr v3 in addition to v2.
