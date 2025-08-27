# Figpack Local Server Behavior

This document describes how the local server functionality works in figpack when using `view.show()`.

## Overview

When you call `view.show()`, the behavior depends on several factors including the `upload` parameter, environment detection (notebook vs. non-notebook), and user preferences.

## Upload Mode (`upload=True`)

When `upload=True`:

1. **File Creation**: Files are created in a temporary directory specific to this upload
2. **Cloud Upload**: Files are uploaded to the figpack cloud bucket (requires `FIGPACK_API_KEY` environment variable)
3. **URL Generation**: User receives a remote URL that loads the page
4. **Display Behavior**:
   - **In notebook environment**: An iframe element is displayed inline in the output cell, execution continues without blocking
   - **Outside notebook environment**:
     - If `open_in_browser=True`: Browser tab opens automatically
     - Execution halts until user presses Enter to continue
5. **User Override**: The `inline` parameter can override auto-detection (`inline=True` forces inline mode, `inline=False` forces browser mode)

## Local Server Mode (`upload=False`)

When `upload=False`, the behavior is more complex and uses a persistent server approach:

### Process-Level Management

1. **Temporary Directory**: A single temporary directory is created per process (prefixed with `figpack_process_`)
2. **Directory Persistence**: This directory persists across multiple `show()` calls within the same process
3. **Cleanup**: The directory is automatically cleaned up when the process ends

### Server Management

1. **Single Server**: At most one local file server exists per process
2. **Server Reuse**: If a server is already running, subsequent `show()` calls reuse it
3. **Server Startup**: If no server exists, a new one is started automatically
4. **Port Selection**: Uses automatic port selection (finds available port) unless specified
5. **CORS Support**: Server includes CORS headers for cross-origin requests when `allow_origin` is specified

### File Organization

1. **Figure Subdirectories**: Each `show()` call creates a unique subdirectory within the process temp directory
2. **Server Root**: The server serves the process-level temporary directory (parent of figure subdirectories)
3. **URL Structure**: URLs point to `localhost:port/figure_subdirectory`

### Display Behavior

1. **In notebook environment** (or `inline=True`):

   - An iframe is displayed inline in the output cell
   - Execution continues without blocking
   - Server continues running in background

2. **Outside notebook environment** (or `inline=False`):
   - If `open_in_browser=True`: Browser tab opens automatically
   - User sees URL to access the visualization
   - Execution halts until user presses Enter to continue

## Development Mode (`_dev=True`)

Development mode maintains the same behavior as before:

1. **Fixed Port**: Uses port 3004 by default
2. **CORS Configuration**: Automatically sets `allow_origin="http://localhost:5173"`
3. **Upload Disabled**: Cannot be used with `upload=True`
4. **Development URL**: Provides URL for use with figpack-figure in development mode

## Examples

### Basic Local Server Usage

```python
import figpack as fp

# First figure - starts server
view1 = fp.Markdown("# Figure 1")
url1 = view1.show()  # Creates server, returns http://localhost:XXXX/figure_YYYY

# Second figure - reuses server
view2 = fp.Markdown("# Figure 2")
url2 = view2.show()  # Reuses server, returns http://localhost:XXXX/figure_ZZZZ

# Both figures remain accessible until process ends
```

### Upload Mode

```python
import os
os.environ['FIGPACK_API_KEY'] = 'your-api-key'

view = fp.Markdown("# My Figure")
url = view.show(upload=True)  # Uploads to cloud, returns remote URL
```

### Notebook vs Non-Notebook Behavior

```python
# In Jupyter notebook - displays inline automatically
view.show()  # Shows iframe inline, continues execution

# Outside notebook - waits for user input
view.show()  # Shows URL, waits for Enter key

# Force inline mode anywhere
view.show(inline=True)  # Always shows inline if possible

# Force browser mode anywhere
view.show(inline=False)  # Always waits for Enter key
```

## Technical Details

### Process Cleanup

- Server shutdown and temporary directory cleanup happen automatically via `atexit` handlers
- No manual cleanup is required
- Cleanup is robust and handles exceptions gracefully

### Graceful Shutdown Handling

The system includes robust handling for cases where processes don't shut down gracefully (e.g., kernel restarts in VSCode Jupyter integration):

1. **Process Tracking**: Each temporary directory contains a `process_info.json` file with:

   - Process ID (PID) of the owning process
   - Port number being used by the server
   - Creation and update timestamps

2. **Orphaned Directory Cleanup**: Before creating new temporary directories, the system:

   - Scans for existing `figpack_process_*` directories
   - Checks if the owning process is still alive
   - Checks if the port is still in use
   - Removes directories where either the process is dead or the port is free

3. **Directory Monitoring**: When a server is running, a background thread monitors the temporary directory:
   - Checks every 5 seconds if the directory still exists
   - Automatically stops the server if the directory is deleted externally
   - Prevents orphaned servers from running indefinitely

### Thread Safety

- Server manager uses thread-safe singleton pattern
- Multiple threads can safely call `show()` simultaneously
- Server startup is protected by locks to prevent race conditions

### Error Handling

- Missing API key for uploads raises `EnvironmentError`
- Server startup failures are handled gracefully
- Cleanup failures during process exit are logged but don't raise exceptions
- Process tracking failures are logged but don't prevent normal operation

## Migration from Previous Behavior

The new implementation maintains backward compatibility while adding the persistent server functionality:

- **Same API**: All existing parameters work exactly as before
- **Same URLs**: URL structure and behavior unchanged for end users
- **Better Performance**: Server reuse eliminates startup overhead for multiple figures
- **Cleaner Cleanup**: Automatic process-level cleanup is more reliable
