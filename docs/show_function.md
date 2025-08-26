# The show() Function

The `show()` function is the core display function in figpack, used to visualize any figpack view component. It provides flexible options for displaying visualizations either locally or remotely, with intelligent environment detection and configuration.

The function automatically adapts its behavior based on the execution environment. In a Jupyter notebook, it defaults to displaying visualizations inline within notebook cells. In Google Colab or JupyterHub, it automatically switches to upload mode with ephemeral figures to ensure accessibility. When running standalone Python scripts, it opens visualizations in a browser window by default.

These behaviors can be customized through both function parameters and environment variables, giving you full control over how your visualizations are displayed while maintaining sensible defaults for common use cases.

## Function Signature

```python
def show(
    self,
    *,
    title: str,
    description: Union[str, None] = None,
    port: Union[int, None] = None,
    open_in_browser: Union[bool, None] = None,
    upload: Union[bool, None] = None,
    inline: Union[bool, None] = None,
    inline_height: int = 600,
    ephemeral: Union[bool, None] = None,
    allow_origin: Union[str, None] = None,
    wait_for_input: Union[bool, None] = None,
    _dev: Union[bool, None] = None
)
```

## Parameters

### Required Parameters

- `title` (str): Title for the browser tab and figure.

### Optional Parameters

- `description` (str | None, default=None): Description text for the figure, supports markdown formatting.

- `port` (int | None, default=None): Port number for the local server. If None, uses a random available port. This is particularly useful in development environments where you need to avoid port conflicts.

- `open_in_browser` (bool | None, default=None): Controls whether to automatically open the visualization in a browser window. By default, this is determined by the environment - it will open automatically outside of notebook environments (like when running scripts directly), but won't open automatically in notebooks where inline display is preferred. Do not use this in CI environments or headless servers where browser opening is not desired or possible.

- `upload` (bool | None, default=None): Determines whether to upload the figure to figpack servers. The default behavior is controlled by the `FIGPACK_UPLOAD` environment variable. When running in cloud notebook environments like Google Colab or JupyterHub, this may be automatically set to `True` with `ephemeral=True` to ensure the visualization is accessible.

- `inline` (bool | None, default=None): Controls whether to display the visualization inline (e.g., in a Jupyter notebook cell). By default, this is automatically enabled in notebook environments and disabled elsewhere. Can be forced on/off regardless of environment.

- `inline_height` (int, default=600): Height in pixels for inline iframe display. Only relevant when displaying inline in notebooks. Adjust based on the complexity and size of your visualization.

- `ephemeral` (bool | None, default=None): Controls whether to upload as an ephemeral (temporary) figure. Automatically set to `True` in cloud notebook environments (Colab, JupyterHub) when `upload=True`. Ephemeral figures don't require an API key but have limited lifespan.

- `allow_origin` (str | None, default=None): CORS allow-origin header for the local server. Typically only needed in development scenarios or when integrating with other local services.

- `wait_for_input` (bool | None, default=None): Controls whether to pause execution until user presses Enter. By default, this is enabled outside of notebook environments to prevent scripts from terminating before users can view the visualization. Should be set to `False` in CI environments, automated testing, or any non-interactive context to prevent the script from hanging while waiting for input.

- `_dev` (Union[bool, None], default=None): Development mode flag for figpack developers. When enabled:
  - Uses a fixed port (3004) by default
  - Disables figure uploads
  - Sets CORS allow-origin to http://localhost:5173
  - Generates a random figure name for local development
  - Prevents browser opening
    This mode is designed for local development of figpack itself, particularly when developing the GUI interface. Most users should not need to use this parameter.

## Environment Variables

The function's behavior can be controlled through environment variables. These provide a way to set consistent default behaviors across your entire project without modifying code:

- `FIGPACK_UPLOAD`: Set to "1" to enable figure uploading by default. This is particularly useful in shared environments where you want all visualizations to be accessible via URL.

- `FIGPACK_INLINE`: Set to "1" to force inline display. This overrides the automatic environment detection and always displays figures inline when possible.

- `FIGPACK_OPEN_IN_BROWSER`: Set to "1" to automatically open figures in browser. This should not be set in CI environments or headless servers.

- `FIGPACK_API_KEY`: Required for non-ephemeral figure uploads. This key authenticates your uploads to the figpack servers. Not required for ephemeral figures in cloud environments.

- `FIGPACK_DEV`: Set to "1" to enable development mode. This changes several behaviors to be more suitable for local development, like using fixed ports and disabling uploads.

## Auto-Detection Behavior

The `show()` function includes sophisticated auto-detection capabilities:

### Environment Detection

- **Jupyter Notebook**: Automatically detected through IPython presence and kernel attributes
- **Google Colab**: Detected through presence of google.colab module
- **JupyterHub**: Detected through JUPYTERHUB_USER environment variable

### Display Mode Selection

1. **Upload Mode**

   - Default: Based on `FIGPACK_UPLOAD` environment variable
   - Forces `ephemeral=True` in Colab/JupyterHub environments
   - Requires API key for non-ephemeral uploads

2. **Inline Display**

   - Enabled automatically in notebook environments
   - Can be forced with `FIGPACK_INLINE=1`
   - Uses iframe with configurable height

3. **Browser Opening**
   - Default: Opens automatically outside notebook environments
   - Can be forced with `FIGPACK_OPEN_IN_BROWSER=1`

## Usage Examples

### Basic Local Display

```python
view.show(
    title="My Visualization"
)
```

### Custom Inline Display in Notebook

```python
view.show(
    title="Notebook Visualization",
    inline=True,
    inline_height=800,
    description="Custom height inline visualization"
)
```

### Upload with Custom Configuration

```python
view.show(
    title="Uploaded Visualization",
    upload=True,
    description="This visualization will be uploaded to figpack servers",
    wait_for_input=True
)
```

### Development Mode

```python
view.show(
    title="Development View",
    port=3004,
    _dev=True
)
```

### CI Environment

```python
view.show(
    title="CI Test Visualization",
    open_in_browser=False,  # Prevent browser opening in CI
    wait_for_input=False    # Don't wait for user input
)
```
