"""
Gallery view for figpack - a gallery layout container that handles other views with separate timeseries contexts
"""

from typing import Any, Dict, List, Optional

from ..core.figpack_view import FigpackView
from ..core.zarr import Group
from .GalleryItem import GalleryItem


class Gallery(FigpackView):
    """
    A gallery layout container view that arranges other views in a gallery format.

    The Gallery view is functionally similar to TabLayout, but with a key difference:
    each gallery item maintains its own independent timeseries selection context.
    This means that time range selections, current time, and visible time ranges
    are isolated between different gallery items, allowing for independent navigation
    and analysis of timeseries data in each item.

    This is particularly useful when comparing different datasets or views that
    should not share the same time selection state.
    """

    def __init__(
        self,
        *,
        items: List[GalleryItem],
        initial_item_index: int = 0,
    ):
        """
        Initialize a Gallery view

        Args:
            items: List of GalleryItem objects containing the child views.
                   Each item will have its own independent timeseries selection context.
            initial_item_index: Index of the initially selected gallery item (default: 0).
                               Will be clamped to valid range if out of bounds.
        """
        self.items = items
        # Ensure initial_item_index is within valid bounds
        self.initial_item_index = (
            max(0, min(initial_item_index, len(items) - 1)) if items else 0
        )

    def write_to_zarr_group(self, group: Group) -> None:
        """
        Write the Gallery data to a Zarr group

        This method serializes the gallery structure and all its child views
        into a Zarr group format that can be read by the frontend components.
        Each gallery item's view is written to its own subgroup within the
        main gallery group.

        Args:
            group: Zarr group to write data into
        """
        # Set the view type identifier for the frontend
        group.attrs["view_type"] = "Gallery"

        # Store gallery-specific properties
        group.attrs["initial_item_index"] = self.initial_item_index

        # Create a list to store metadata for all gallery items
        items_metadata = []

        # Process each gallery item
        for i, item in enumerate(self.items):
            # Generate a unique name for this item's subgroup
            item_name = f"gallery_item_{i}"

            # Store item metadata (label, etc.) for the frontend
            item_metadata = item.to_dict()
            item_metadata["name"] = item_name
            items_metadata.append(item_metadata)

            # Create a subgroup for this gallery item's view
            item_group = group.create_group(item_name)

            # Recursively write the child view to the subgroup
            # This allows any figpack view to be contained within a gallery item
            item.view.write_to_zarr_group(item_group)

        # Store the complete items metadata in the group attributes
        # This will be used by the frontend to render the gallery structure
        group.attrs["items"] = items_metadata
