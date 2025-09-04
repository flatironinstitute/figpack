# Figpack vs Figurl

## Introduction & Shared Vision

Both figpack and [figurl](https://github.com/flatironinstitute/figurl) address the fundamental challenge of creating shareable, interactive scientific visualizations that go beyond static plots. They enable researchers to create browser-based figures that can be easily shared with collaborators, embedded in publications, and used for interactive data exploration.

The core insight shared by both projects is that modern scientific visualization should be:
- **Interactive**: Allowing users to zoom, pan, and explore data dynamically
- **Shareable**: Easily distributed via URLs or files
- **Browser-based**: Accessible on any device without specialized software
- **Programmatic**: Generaated from Python scripts for reproducibility

## Architectural Differences

### The Coordination vs. Bundle Model

The key architectural difference between figurl and figpack lies in how they handle the relationship between data, visualization code, and the viewing environment.

**figurl** uses a **coordination model** with three separate components:
- **Data storage**: Files stored in kachery-cloud using content-addressable URIs
- **Visualization plugins**: Static HTML bundles hosted on cloud storage buckets
- **Coordination service**: figurl.org pairs data URIs with visualization plugins

When you open a figurl link, the figurl.org web application downloads the specified visualization plugin and data, then coordinates their interaction within an iframe.

**figpack** uses a **bundle model** where everything is self-contained:
- **Data**: Stored locally in efficient Zarr format within the figure directory
- **Visualization code**: React-based viewer bundled with each figure
- **Rendering logic**: All JavaScript and CSS included in the figure bundle

Each figpack figure is a complete, standalone web application that includes both the data and the code needed to visualize it.

### Data Handling

Whereas figurl primarily uses JSON with base64 encoded binary data for storage, figpack employs the Zarr format for efficient storage and retrieval of large numerical arrays. This allows figpack to handle much larger datasets interactively, leveraging hierarchical downsampling and chunked data access.

## Issues Solved by figpack's Approach

### Eliminating Coordination Dependencies

figurl's coordination model, while elegant, creates a dependency chain where all three components (data, plugin, and coordinator) must remain available and properly linked for a figure to work. If any component becomes unavailable or if the coordination service changes, existing figures can break.

figpack eliminates this coordination requirement entirely. Since each figure is self-contained, it will continue to work as long as the bundle itself is preserved, regardless of what happens to external services or frameworks.

### Local-First Philosophy

figpack adopts a local-first approach where figures work offline by default. You can create, view, and share figures without any internet connection. Cloud sharing is available as an optional convenience feature, but it's not required for basic functionality.

This contrasts with figurl's cloud-first approach, where internet connectivity and cloud services are essential for both creating and viewing figures.

### Future-Proof Archival

figpack figures are designed for long-term preservation. Since they don't depend on external frameworks, APIs, or coordination services to render, they can be archived (for example, uploaded to Zenodo) with confidence that they will remain viewable in the future.

The self-contained nature means that as long as web browsers continue to support HTML, CSS, and JavaScript, figpack figures will continue to work without modification.

### Seamless Notebook Integration

figpack provides enhanced integration with Jupyter environments through automatic environment detection. It can distinguish between local Jupyter, Google Colab, and JupyterHub environments, automatically adjusting its behavior for optimal user experience in each context.

The `show()` function intelligently chooses between inline display, browser opening, and cloud upload based on the detected environment, while still allowing manual override of these defaults.

### Simplified Extension Development

figpack's extension system allows developers to create custom visualizations by bundling JavaScript code directly with Python components. This eliminates the need to separately host and version visualization plugins, making the development workflow more straightforward.

Extensions can load additional JavaScript files and integrate external libraries, all while maintaining the self-contained bundle approach.

### Comprehensive Figure Lifecycle Management

figpack provides a well-defined lifecycle management system for figures that addresses long-term sustainability and resource management concerns that are not clearly addressed in figurl.

**Local-First with Optional Cloud Storage:**
figpack figures begin as local, temporary files that can optionally be uploaded to the cloud. This approach ensures that figures work immediately without requiring external services, while still providing sharing capabilities when needed.

**Automatic Expiration and Extension:**
When figures are uploaded to figpack cloud, they expire automatically after 24 hours by default. This prevents indefinite accumulation of unused figures while still providing reasonable access time for sharing and collaboration. Users can extend or renew figures that remain useful, and important figures can be pinned to prevent automatic expiration.

**User-Associated Storage:**
Unlike figurl, where figure ownership and management is unclear, figpack associates uploaded figures with individual users. This enables proper access control, usage tracking, and allows users to manage their own figure collections through the figpack management interface.

**Planned Garbage Collection:**
The system includes provisions for garbage collection of expired figures, ensuring that storage resources are managed efficiently over time. This contrasts with figurl's approach, where there is no clear plan for removing old or unused figures.

## View Ecosystem & Migration Path

### Ported Components from SortingView

Many visualization components from the figurl ecosystem have been ported to figpack, maintaining similar Python APIs to ease migration:

**Spike Sorting Views:**
- RasterPlot
- Autocorrelograms
- CrossCorrelograms
- AverageWaveforms
- SpikeAmplitudes
- UnitsTable
- UnitMetricsGraph
- etc.

**Core Visualization Types:**
- TimeseriesGraph
- Markdown
- Image
- MatplotlibFigure
- PlotlyFigure
- etc.

**Layout Components:**
- Box
- Splitter
- TabLayout
- etc.

**New Views:**
- MultiChannelTimeseries
- Spectrogram
- etc.

### Migration Considerations

For users familiar with figurl/sortingview, the transition to figpack is designed to be straightforward. The Python APIs are largely compatible, with the main difference being the `show()` function's enhanced capabilities and the self-contained output format.
