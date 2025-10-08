"""
Iframe view for figpack - displays content in an iframe
"""

import numpy as np

from ..core.figpack_view import FigpackView
from ..core.zarr import Group


class Iframe(FigpackView):
    """
    An iframe visualization component for displaying web content
    """

    def __init__(self, url: str):
        """
        Initialize an Iframe view

        Args:
            url: The URL to display in the iframe
        """
        self.url = url

    def write_to_zarr_group(self, group: Group) -> None:
        """
        Write the iframe data to a Zarr group

        Args:
            group: Zarr group to write data into
        """
        # Set the view type
        group.attrs["view_type"] = "Iframe"

        # Convert URL to numpy array of bytes
        url_bytes = self.url.encode("utf-8")
        url_array = np.frombuffer(url_bytes, dtype=np.uint8)

        # Store the URL as a zarr array
        group.create_dataset("url_data", data=url_array)

        # Store URL size in attrs
        group.attrs["data_size"] = len(url_bytes)
