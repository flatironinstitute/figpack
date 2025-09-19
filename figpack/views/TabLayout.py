"""
TabLayout view for figpack - a tabbed layout container that handles other views
"""

from typing import Any, Dict, List, Optional

from ..core.figpack_view import FigpackView
from ..core.zarr import Group
from .TabLayoutItem import TabLayoutItem


class TabLayout(FigpackView):
    """
    A tabbed layout container view that arranges other views in tabs
    """

    def __init__(
        self,
        *,
        items: List[TabLayoutItem],
        initial_tab_index: int = 0,
    ):
        """
        Initialize a TabLayout view

        Args:
            items: List of TabLayoutItem objects containing the child views
            initial_tab_index: Index of the initially selected tab (default: 0)
        """
        self.items = items
        self.initial_tab_index = (
            max(0, min(initial_tab_index, len(items) - 1)) if items else 0
        )

    def write_to_zarr_group(self, group: Group) -> None:
        """
        Write the TabLayout data to a Zarr group

        Args:
            group: Zarr group to write data into
        """
        # Set the view type
        group.attrs["view_type"] = "TabLayout"

        # Set layout properties
        group.attrs["initial_tab_index"] = self.initial_tab_index

        # Create a list to store item metadata
        items_metadata = []

        # Process each tab item
        for i, item in enumerate(self.items):
            item_name = f"tab_{i}"

            # Store item metadata
            item_metadata = item.to_dict()
            item_metadata["name"] = item_name
            items_metadata.append(item_metadata)

            # Create a subgroup for this tab's view
            item_group = group.create_group(item_name)

            # Recursively write the child view to the subgroup
            item.view.write_to_zarr_group(item_group)

        # Store the items metadata
        group.attrs["items"] = items_metadata
