"""
Markdown view for figpack - displays markdown content
"""

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

        # Store the markdown content
        group.attrs["content"] = self.content
