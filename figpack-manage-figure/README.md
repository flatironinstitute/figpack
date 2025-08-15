# Figpack Figure Manager

A React/TypeScript/Material-UI web application for managing figpack figures deployed at https://figpack.neurosift.app.

## Features

- **Figure Status Display**: Shows the current status of a figpack figure including upload progress, completion status, and expiration information
- **Expiration Management**: Displays time until expiration and provides options for renewal (coming soon) or restoration (coming soon)
- **Figure Information**: Shows detailed metadata including:
  - Figure URL
  - Figure ID
  - Figpack version
  - Upload timestamps
  - File count and total size
- **File Manifest**: Lists all files in the figure with their sizes
- **Actions**:
  - Open figure in new tab
  - Download instructions for command-line tool
  - Refresh figure data

## Usage

The application is accessed via URL parameters:

```
https://figpack.neurosift.app/manage?figure_url=<encoded_figure_url>
```

When users click the "Manage Figure" button in the figpack GUI status bar, it opens this application with the appropriate figure URL.

## Data Sources

The application loads data from two JSON files in the figure directory:

1. **figpack.json**: Contains upload status, timestamps, expiration, and metadata
2. **manifest.json**: Contains file listing and size information

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Deployment

The application is configured to be deployed at https://figpack.neurosift.app with proper routing for the `/manage` path.
