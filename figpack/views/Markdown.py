"""
Markdown view for figpack - displays markdown content
"""

from typing import Optional
import numpy as np

from ..core.figpack_view import FigpackView
from ..core.zarr import Group


class Markdown(FigpackView):
    """
    A markdown content visualization component
    """

    def __init__(self, content: str, *, font_size: Optional[int] = None):
        """
        Initialize a Markdown view

        Args:
            content: The markdown content to display
        """
        self.content = content
        self.font_size = font_size

    def write_to_zarr_group(self, group: Group) -> None:
        """
        Write the markdown data to a Zarr group

        Args:
            group: Zarr group to write data into
        """
        # Set the view type
        group.attrs["view_type"] = "Markdown"

        if self.font_size is not None:
            group.attrs["font_size"] = self.font_size

        # Convert string content to numpy array of bytes
        content_bytes = self.content.encode("utf-8")
        content_array = np.frombuffer(content_bytes, dtype=np.uint8)

        # Store the markdown content as a zarr array
        group.create_dataset("content_data", data=content_array)

        # Store content size in attrs
        group.attrs["data_size"] = len(content_bytes)
