import urllib.request
import urllib.error
import os
import tempfile
import hashlib

from ...core.figpack_extension import FigpackExtension


def _load_javascript_code():
    """Load the JavaScript code from the plotly.js file"""
    js_path = os.path.join(os.path.dirname(__file__), "plotly_view.js")
    try:
        with open(js_path, "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        raise FileNotFoundError(
            f"Could not find plotly.js at {js_path}. "
            "Make sure the JavaScript file is present in the package."
        )


def _get_cache_path(url):
    """Get the cache file path for a given URL"""
    # Create a unique filename based on the URL
    url_hash = hashlib.md5(url.encode()).hexdigest()
    cache_dir = os.path.join(tempfile.gettempdir(), "figpack_plotly_cache")
    os.makedirs(cache_dir, exist_ok=True)
    return os.path.join(cache_dir, f"plotly_{url_hash}.js")


def _download_plotly_library():
    """Download the Plotly library with caching support"""
    url = "https://cdn.plot.ly/plotly-2.35.2.min.js"
    cache_path = _get_cache_path(url)

    # Try to load from cache first
    if os.path.exists(cache_path):
        try:
            with open(cache_path, "r", encoding="utf-8") as f:
                return f.read()
        except Exception as e:
            print(f"Warning: Failed to read cached plotly library: {e}")
            # Continue to download if cache read fails

    # Download from CDN
    try:
        with urllib.request.urlopen(url) as response:
            content = response.read().decode("utf-8")

        # Save to cache
        try:
            with open(cache_path, "w", encoding="utf-8") as f:
                f.write(content)
        except Exception as e:
            print(f"Warning: Failed to cache plotly library: {e}")
            # Continue even if caching fails

        return content
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
