"""
MountainLayout view for figpack - a workspace-style layout container with left panel and split right panel
"""

from typing import List

from ..core.figpack_view import FigpackView
from ..core.zarr import Group
from .MountainLayoutItem import MountainLayoutItem


class MountainLayout(FigpackView):
    """
    A workspace-style layout container view that provides:
    - Left panel with view buttons (top) and control views (bottom)
    - Right panel split into north and south tab workspaces
    - Views can be opened/closed and reopened in either workspace area
    """

    def __init__(
        self,
        *,
        items: List[MountainLayoutItem],
    ):
        """
        Initialize a MountainLayout view

        Args:
            items: List of MountainLayoutItem objects containing the child views.
                   Control items (is_control=True) will appear in the bottom-left panel.
                   Regular items will have buttons in the top-left panel and can be opened
                   in the north/south workspaces on the right.
        """
        self.items = items

    def write_to_zarr_group(self, group: Group) -> None:
        """
        Write the MountainLayout data to a Zarr group

        This method serializes the mountain layout structure and all its child views
        into a Zarr group format that can be read by the frontend components.
        Each item's view is written to its own subgroup within the main layout group.

        Args:
            group: Zarr group to write data into
        """
        # Set the view type identifier for the frontend
        group.attrs["view_type"] = "MountainLayout"

        # Create a list to store metadata for all layout items
        items_metadata = []

        # Process each mountain layout item
        for i, item in enumerate(self.items):
            # Generate a unique name for this item's subgroup
            item_name = f"mountain_item_{i}"

            # Store item metadata (label, is_control, etc.) for the frontend
            item_metadata = item.to_dict()
            item_metadata["name"] = item_name
            items_metadata.append(item_metadata)

            # Create a subgroup for this item's view
            item_group = group.create_group(item_name)

            # Recursively write the child view to the subgroup
            # This allows any figpack view to be contained within a mountain layout item
            item.view.write_to_zarr_group(item_group)

        # Store the complete items metadata in the group attributes
        # This will be used by the frontend to render the mountain layout structure
        group.attrs["items"] = items_metadata
