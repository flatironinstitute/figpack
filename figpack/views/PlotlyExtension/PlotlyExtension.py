import json
import numpy as np
import zarr
import urllib.request
import urllib.error
from datetime import date, datetime

import figpack


def _download_plotly_library():
    url = "https://cdn.plot.ly/plotly-2.35.2.min.js"
    try:
        with urllib.request.urlopen(url) as response:
            return response.read().decode("utf-8")
    except urllib.error.URLError as e:
        raise RuntimeError(f"Failed to download plotly library from {url}: {e}")


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


# Download the plotly library and create the extension with additional files
try:
    plotly_lib_js = _download_plotly_library()
    additional_files = {"plotly.min.js": plotly_lib_js}
except Exception as e:
    print(f"Warning: Could not download plotly library: {e}")
    print("Extension will fall back to CDN loading")
    additional_files = {}

# Create and register the plotly extension
_plotly_extension = figpack.FigpackExtension(
    name="figpack_plotly",
    javascript_code=_load_javascript_code(),
    additional_files=additional_files,
    version="1.0.0",
)


class PlotlyFigure(figpack.ExtensionView):
    """
    A Plotly graph visualization view using the plotly library.

    This view displays interactive Plotly graphs
    """

    def __init__(self, fig):
        """
        Initialize a PlotlyFigure view

        Args:
            fig: The plotly figure object
        """
        super().__init__(extension=_plotly_extension, view_type="plotly.PlotlyFigure")

        self.fig = fig

    def _write_to_zarr_group(self, group: figpack.Group) -> None:
        """
        Write the plotly figure data to a Zarr group

        Args:
            group: Zarr group to write data into
        """
        super()._write_to_zarr_group(group)

        # Convert the plotly figure to a dictionary
        fig_dict = self.fig.to_dict()

        # Convert figure data to JSON string using custom encoder
        json_string = json.dumps(fig_dict, cls=CustomJSONEncoder)

        # Convert JSON string to bytes and store in numpy array
        json_bytes = json_string.encode("utf-8")
        json_array = np.frombuffer(json_bytes, dtype=np.uint8)

        # Store the figure data as compressed array
        group.create_dataset("figure_data", data=json_array)

        # Store data size for reference
        group.attrs["data_size"] = len(json_bytes)


class CustomJSONEncoder(json.JSONEncoder):
    """Custom JSON encoder that handles numpy arrays and datetime objects"""

    def default(self, obj):
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        elif isinstance(obj, (np.integer, np.floating)):
            return obj.item()
        elif isinstance(obj, (datetime, date)):
            return obj.isoformat()
        elif isinstance(obj, np.datetime64):
            return str(obj)
        elif hasattr(obj, "isoformat"):  # Handle other datetime-like objects
            return obj.isoformat()
        return super().default(obj)
