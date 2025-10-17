"""
CaptionedView for figpack - displays a view with a caption below it
"""

from typing import Optional
import numpy as np

from ..core.figpack_view import FigpackView
from ..core.zarr import Group


class CaptionedView(FigpackView):
    """
    A view that displays a child view with a text caption below it.
    The caption height dynamically adjusts based on text length and container width.
    """

    def __init__(
        self,
        *,
        view: FigpackView,
        caption: str,
        font_size: Optional[int] = None,
    ):
        """
        Initialize a CaptionedView

        Args:
            view: The child view to display above the caption
            caption: The text caption to display below the view
            font_size: Optional font size for the caption text (default: 14)
        """
        self.view = view
        self.caption = caption
        self.font_size = font_size if font_size is not None else 14

    def write_to_zarr_group(self, group: Group) -> None:
        """
        Write the CaptionedView data to a Zarr group

        Args:
            group: Zarr group to write data into
        """
        # Set the view type
        group.attrs["view_type"] = "CaptionedView"

        # Set caption properties
        group.attrs["font_size"] = self.font_size

        # Convert caption string to numpy array of bytes
        caption_bytes = self.caption.encode("utf-8")
        caption_array = np.frombuffer(caption_bytes, dtype=np.uint8)

        # Store the caption as a zarr array
        group.create_dataset("caption_data", data=caption_array)

        # Store caption size in attrs
        group.attrs["caption_size"] = len(caption_bytes)

        # Create a subgroup for the child view
        child_group = group.create_group("child_view")

        # Recursively write the child view to the subgroup
        self.view.write_to_zarr_group(child_group)
