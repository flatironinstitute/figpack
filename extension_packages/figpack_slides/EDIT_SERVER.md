# Figpack Slides Edit Server

Web server for live editing of markdown slide files.

## Usage

Start the server:
```bash
figpack-slides-serve /path/to/slides.md
```

Options:
- `--port` - Port to listen on (default: 3001)
- `--allowed-origin` - Allowed CORS origin (default: http://localhost:3000)

Example:
```bash
figpack-slides-serve my_presentation.md --port 3001 --allowed-origin http://localhost:3000
```

The server accepts POST requests to `/save-slide-edits` endpoint to modify slide titles in the markdown file.
