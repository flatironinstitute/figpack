import urllib.request
import urllib.error

from ...core.figpack_extension import FigpackExtension


def _load_javascript_code():
    """Load the JavaScript code from the plotly.js file"""
    import os

    js_path = os.path.join(os.path.dirname(__file__), "plotly_view.js")
    try:
        with open(js_path, "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        raise FileNotFoundError(
            f"Could not find plotly.js at {js_path}. "
            "Make sure the JavaScript file is present in the package."
        )


def _download_plotly_library():
    url = "https://cdn.plot.ly/plotly-2.35.2.min.js"
    try:
        with urllib.request.urlopen(url) as response:
            return response.read().decode("utf-8")
    except urllib.error.URLError as e:
        raise RuntimeError(f"Failed to download plotly library from {url}: {e}")


# Download the plotly library and create the extension with additional files
try:
    plotly_lib_js = _download_plotly_library()
    additional_files = {"plotly.min.js": plotly_lib_js}
except Exception as e:
    print(f"Warning: Could not download plotly library: {e}")
    print("Extension will fall back to CDN loading")
    additional_files = {}

# Create and register the plotly extension
_plotly_extension = FigpackExtension(
    name="figpack-plotly",
    javascript_code=_load_javascript_code(),
    additional_files=additional_files,
    version="1.0.0",
)
