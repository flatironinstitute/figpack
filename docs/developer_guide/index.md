# Developer Guide

This guide provides detailed technical information about figpack's architecture and implementation. It is intended for developers who want to contribute to or extend the project.

Figpack consists of four interconnected components: figpack (the core Python package), figpack-api (the web API), figpack-figure (the figure GUI), and figpack-manage (the management web application). The source code for all components are contained in this repository.

## Views

Views are the fundamental building blocks for figures in figpack. Each view type is defined by a Python class and a corresponding frontend component. A view can either produce a standalone figure or can be embedded within the layout of another view. Key points about views:

### View Implementation (Python Side)

- Each view type is implemented as a Python class that inherits from `FigpackView`
- Views are responsible for managing their data and serialization logic
- Views can be nested within other views to create complex layouts

### Serialization

Views use a zarr-based serialization mechanism:

- Every view must implement a `write_to_zarr_group` method
- This method serializes the view's data to disk, either as:
  - A top-level zarr group (for standalone figures)
  - A nested zarr group (when embedded in another view)
- Parent views can call `write_to_zarr_group` on their child views during serialization
- The serialized data becomes part of the figure bundle
- Figure bundles can be stored locally or uploaded to the cloud

### Frontend Implementation

Every view requires a corresponding frontend implementation in the figpack-figure UI:

- The frontend component must handle the same view type (specified by the "view_type" attribute of the zarr group)
- It's responsible for:
  - Loading data from the zarr group (sometimes lazily for performance)
  - Rendering the view's content appropriately
  - Managing any interactive features

## Figures

Figures are created when calling the `.show()` method on a view. Each figure consists of a directory containing multiple files:

- `index.html`: The main entry point for viewing the figure
- Supporting `.js/.css` files: Required for rendering the visualization
- `data.zarr/`: Directory containing the serialized view data, which may include nested views
- Consolidated metadata (`.zmetadata`)
- `manifest.json`: Lists all files and their sizes in the bundle
- `figpack.json`: Only present in cloud-uploaded figures, contains figure metadata including expiration details
  - This file allows the figure viewer (figpack-figure) to check expiration status without depending on the figpack API
  - Ensures figures remain self-contained and archivable long-term

### Figure Storage

Figures can be stored in several ways depending on the environment and configuration for the `.show()` call:

1. **Temporary**: Stored in a temporary directory, cleaned up when the Python process ends
2. **Local**: Saved to a local directory or `.tar.gz` file for longer-term storage
3. **Cloud**: Uploaded to figpack cloud (via `show(upload=True)` or `FIGPACK_UPLOAD=1` environment variable)

### Serving Local Figures

When viewing figures locally (without cloud upload), figpack uses a process-level local file server:

- A single file server runs per Python process
  - Server is automatically started on first `.show()` call
  - Subsequent `.show()` calls reuse the same server
  - Server automatically finds an available port
  - Server includes CORS support when needed

The server manages files efficiently:

- Creates a process-specific temporary directory
- Each `.show()` call gets a unique subdirectory
- Files are served from `http://localhost:<port>/<figure_subdirectory>`
- Directory and server are automatically cleaned up when the process ends

Display behavior depends on the environment:

- In notebooks: Shows figures inline using iframes (unless upload=True)
- Outside notebooks: Opens in browser tab or provides URL
- Can be overridden with `inline=True/False` parameter

The server implementation includes:

- Thread-safe singleton pattern for server management
- Automatic port selection
- Graceful shutdown handling
- Cleanup of orphaned servers/directories
- Background monitoring for reliability

### Cloud Upload Process

When uploading to figpack cloud:

1. Python makes a request to the "create" endpoint of the figpack API (deployed on Vercel)

   - Requires `FIGPACK_API_KEY` environment variable
   - Creates a new figure owned by the user
   - Assigns a URL in the figpack bucket (default: https://figures.figpack.org)

2. Upload process:
   - Makes requests to the upload endpoint to obtain signed upload URLs
   - Uploads all files in the bundle, including:
     - Source code
     - `data.zarr` content
     - Metadata and manifest files
   - Calls finalize endpoint when complete

### Cloud Figure Management

Cloud Figures can be managed through the figpack-manage GUI (https://manage.figpack.org):

- View figures via their assigned URLs
- Browse a table of all uploaded figures
- Manage figure lifecycle:
  - By default, figures expire after 24 hours
  - Users can renew/extend figures
  - Figures can be pinned to prevent expiration (admins may unpin if needed)
  - Expired figures become unviewable and may be removed during garbage collection

## figpack-figure Component

The figpack-figure component is the React-based web application responsible for rendering interactive figures in the browser. It serves as the data visualization engine for the figpack system. Key aspects:

- Built from TypeScript/React source into compiled static assets
- Bundled into the Python figpack package
- Copied into each figure's directory alongside Zarr data during figure creation
- Uses a plugin-based architecture for extensible view types
- Implements efficient data loading through remote Zarr access
- Makes figures self-contained and portable - each is a complete web application with both rendering logic and data

Every view type in figpack requires a corresponding frontend implementation in figpack-figure that:

- Handles the same view type as specified in the Zarr group
- Loads data from Zarr arrays (sometimes lazily for performance)
- Renders the view's content appropriately
- Manages interactive features

## Extensions

The extension system allows developers to create custom views with specialized JavaScript rendering code:

- Extensions combine Python data handling with custom JavaScript visualization
- Extensions can load additional JavaScript files for modular code organization
- Each extension provides its own JavaScript implementation and optional utilities
- Extensions are registered globally and can be reused across multiple views
- Built-in support for external library integration and dependency management

## Viewing Figures in Development Mode

When implementing a new view type or modifying an existing view type, it is helpful to be able to run the figpack-figure frontend in develop mode with hot module loading and point it to the data of a test figure. This can be achieved in either of two ways:

1. Set `_dev=True` in the call to `show()`
2. Set the environment variable `FIGPACK_DEV=1`

In development mode, the `show()` command will:

- Prepare the figure files in a temporary directory
- Print a URL you can open in your browser for development

The standard development setup involves:

1. Running `npm run dev` in figpack-figure (runs on port 5173)
2. Opening the development URL (e.g., `http://localhost:5173?data=http://localhost:3004/fig_bbppfcys/data.zarr`)
   - The figure data is served on port 3004 by a development file server
   - You can modify code in figpack-figure and see changes live due to hot module reloading

## Backlinks System

[See backlinks.md](./backlinks)

## Detailed Architecture

```{toctree}
:maxdepth: 2

python-package
figpack-figure
figpack-manage
figpack-api
backlinks
extension_hmr_workflow
```

---
