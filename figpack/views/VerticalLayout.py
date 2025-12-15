"""
VerticalLayout view for figpack - a vertically scrolling layout container
"""

from typing import List, Optional

from ..core.figpack_view import FigpackView
from ..core.zarr import Group
from .VerticalLayoutItem import VerticalLayoutItem


class VerticalLayout(FigpackView):
    """
    A vertically scrolling layout container that arranges views with fixed heights
    """

    def __init__(
        self,
        *,
        items: List[VerticalLayoutItem],
        show_titles: bool = True,
        title: Optional[str] = None,
    ) -> None:
        """
        Initialize a VerticalLayout view

        Args:
            items: List of VerticalLayoutItem objects containing the child views
            show_titles: Whether to show titles for layout items
            title: Optional title to display at the top of the layout

        Raises:
            ValueError: If items list is empty
        """
        if not items:
            raise ValueError("items list cannot be empty")

        self.items = items
        self.show_titles = show_titles
        self.title = title

    def write_to_zarr_group(self, group: Group) -> None:
        """
        Write the VerticalLayout data to a Zarr group

        Args:
            group: Zarr group to write data into
        """
        # Set the view type
        group.attrs["view_type"] = "VerticalLayout"

        # Set layout properties
        group.attrs["show_titles"] = self.show_titles
        group.attrs["title"] = self.title

        # Create a list to store item metadata
        items_metadata = []

        # Process each layout item
        for i, item in enumerate(self.items):
            item_name = f"item_{i}"

            # Store item metadata
            item_metadata = item.to_dict()
            item_metadata["name"] = item_name
            items_metadata.append(item_metadata)

            # Create a subgroup for this item's view
            item_group = group.create_group(item_name)

            # Recursively write the child view to the subgroup
            item.view.write_to_zarr_group(item_group)

        # Store the items metadata
        group.attrs["items"] = items_metadata
