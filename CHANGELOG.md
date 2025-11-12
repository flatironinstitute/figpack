# Change Log

- API hardening and rate limiting implemented in figpack-api-cf worker
- Remove dark mode in figpack-figure

## [0.3.5] - 2025-11-11

- figpack_franklab - improve track animation - export to SVG and fix coordinate transforms
- figpack_franklab - add controls to track animation (heatmap selection, playback speed, time bar)
- figpack: improve default chunk size calculation for Zarr datasets

## [0.3.4] - 2025-11-06

- show() returns URL of figure
- Do not render until visible - improves performance when many figures are embedded in iframes

## [0.3.3] - 2025-11-06

- Improvements to TimeseriesGraph for interval series data
- Include script in about dialog
- Documents in iframes and write to clipboard

## [0.3.2] - 2025-11-05

- Create figpack-serve with worker for preparing and serving figpack figures from source URLs
- Remove sourceUrl from figure creation API
- Remove upload by sourceUrl functionality

## [0.3.1] - 2025-11-04

- Migration fixes

## [0.3.0] - 2025-11-04

- Migration to Cloudflare

## [0.2.40] - 2025-11-03

- Figpack Documents

## [0.2.39] - 2025-10-29

- Consolidate chunks to reduce Zarr file count before upload

## [0.2.38] - 2025-10-29

- Export figures as SVG format for publication and presentation use

## [0.2.37] - 2025-10-24

- Do not use figure hash in create figure api - generate random id instead
- Implement source url for archiving, e.g. on Zenodo. See https://sandbox.zenodo.org/records/391408

## [0.2.36] - 2025-10-24

- Improve Python typing throughout
- Fix height calculation in FPCaptionedView
- In figpack_slides, support slide editing of titles
- In figpack_slides, support slide editing of markdown sections
- In timeseries graph, ensure minimum 1 pixel width for time intervals
- Sliding slide transitions in figpack_slides extension
- Add linear decode view in figpack_experimental extension
- Support url in figpack view command line tool

## [0.2.35] - 2025-10-22

- Implement embed=true query parameter for docs for embedding in presentations
- Slides: box layout on right
- Documentation: Lazy iframes
- Add CITATION.cff and create github release for zenodo doi

## [0.2.34] - 2025-10-21

- New multi channel intervals view in figpack_experimental extension
- New CaptionedView view in main figpack package
- Fix spacing in slides
- Add ensureVisible option to setCurrentTime, and use this in MultiChannelIntervals view
- Enhance MultiChannelIntervals

## [0.2.33] - 2025-10-13

- Remove advanced markdown processing in main Markdown view (keep it simple)
- Add advanced markdown processing in figpack_slides extension

## [0.2.32] - 2025-10-10

- Parse markdown in figpack_slides
- Description field in figpack_view.save()
- Fix rendering issue for uniform data in TimeseriesGraph view (need canceled flag in draw options)

## [0.2.31] - 2025-10-08

- Table of contents for figpack slides
- In full screen mode, hide the status bar

## [0.2.30] - 2025-10-08

- Fix bug when using zarr 3, remove "chunks=True" from create_dataset calls

## [0.2.29] - 2025-10-08

- Figpack Slides extension package!
- Enhanced markdown
- Iframe view

## [0.2.28] - 2025-10-07

- Implement timestamps_for_inserting_nans parameter for uniform data in TimeseriesGraph view

## [0.2.27] - 2025-10-02

- Add example rotator to docs index page
- Add channel_spacing and auto_channel_spacing to TimeseriesGraph uniform data

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
