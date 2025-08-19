"""
PlotlyFigure view for figpack - displays plotly figures
"""

import json
from datetime import date, datetime
from typing import Any, Dict, Union

import numpy as np
import zarr

from ..core.figpack_view import FigpackView


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


class PlotlyFigure(FigpackView):
    """
    A plotly figure visualization component
    """

    def __init__(self, fig):
        """
        Initialize a PlotlyFigure view

        Args:
            fig: The plotly figure object
        """
        self.fig = fig

    def _write_to_zarr_group(self, group: zarr.Group) -> None:
        """
        Write the plotly figure data to a Zarr group

        Args:
            group: Zarr group to write data into
        """
        # Set the view type
        group.attrs["view_type"] = "PlotlyFigure"

        # Convert the plotly figure to a dictionary
        fig_dict = self.fig.to_dict()

        # Store the figure data as JSON string using custom encoder
        group.attrs["figure_data"] = json.dumps(fig_dict, cls=CustomJSONEncoder)
