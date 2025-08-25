"""
GalleryItem class for figpack Gallery view - represents an item in a gallery layout container
"""

from typing import Optional

from ..core.figpack_view import FigpackView


class GalleryItem:
    """
    Represents an item in a Gallery with a label and view.

    Similar to TabLayoutItem, but designed for gallery layouts where each item
    maintains its own independent timeseries selection context.
    """

    def __init__(
        self,
        view: FigpackView,
        *,
        label: str,
    ):
        """
        Initialize a GalleryItem

        Args:
            view: The figpack view to be contained in this gallery item
            label: The label text to display for this gallery item
        """
        self.view = view
        self.label = label

    def to_dict(self) -> dict:
        """
        Convert the GalleryItem to a dictionary for serialization

        This method is used when writing the gallery data to Zarr format.
        The dictionary contains metadata about the item that will be stored
        in the Zarr group attributes.

        Returns:
            Dictionary representation of the GalleryItem containing the label
        """
        return {
            "label": self.label,
        }
