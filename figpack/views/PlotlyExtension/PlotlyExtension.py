import json
import numpy as np
from datetime import date, datetime

import figpack


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
        # It's important that we only import conditionally, so we are not always downloading plotly
        from ._plotly_extension import _plotly_extension

        super().__init__(extension=_plotly_extension, view_type="plotly.PlotlyFigure")

        self.fig = fig

    def write_to_zarr_group(self, group: figpack.Group) -> None:
        """
        Write the plotly figure data to a Zarr group

        Args:
            group: Zarr group to write data into
        """
        super().write_to_zarr_group(group)

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
