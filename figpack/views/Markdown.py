"""
Markdown view for figpack - displays markdown content
"""

import numpy as np
import zarr

from ..core.figpack_view import FigpackView


class Markdown(FigpackView):
    """
    A markdown content visualization component
    """

    def __init__(self, content: str):
        """
        Initialize a Markdown view

        Args:
            content: The markdown content to display
        """
        self.content = content

    def _write_to_zarr_group(self, group: zarr.Group) -> None:
        """
        Write the markdown data to a Zarr group

        Args:
            group: Zarr group to write data into
        """
        # Set the view type
        group.attrs["view_type"] = "Markdown"

        # Convert string content to numpy array of bytes
        content_bytes = self.content.encode("utf-8")
        content_array = np.frombuffer(content_bytes, dtype=np.uint8)

        # Store the markdown content as a zarr array
        group.create_dataset(
            "content_data", data=content_array, dtype=np.uint8, chunks=True
        )

        # Store content size in attrs
        group.attrs["data_size"] = len(content_bytes)
