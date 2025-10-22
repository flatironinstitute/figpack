"""
Box view for figpack - a layout container that handles other views
"""

from typing import List, Literal, Optional

from ..core.figpack_view import FigpackView
from ..core.zarr import Group
from .LayoutItem import LayoutItem


class Box(FigpackView):
    """
    A layout container view that arranges other views in horizontal or vertical layouts
    """

    def __init__(
        self,
        *,
        direction: Literal["horizontal", "vertical"] = "vertical",
        show_titles: bool = True,
        items: List[LayoutItem],
        title: Optional[str] = None,
    ) -> None:
        """
        Initialize a Box layout view

        Args:
            direction: Layout direction - "horizontal" or "vertical"
            show_titles: Whether to show titles for layout items
            items: List of LayoutItem objects containing the child views
            title: Optional title to display at the top of the box

        Raises:
            ValueError: If direction is not "horizontal" or "vertical"
        """
        if direction not in ["horizontal", "vertical"]:
            raise ValueError('direction must be either "horizontal" or "vertical"')

        self.direction = direction
        self.show_titles = show_titles
        self.items = items
        self.title = title

    def write_to_zarr_group(self, group: Group) -> None:
        """
        Write the Box layout data to a Zarr group

        Args:
            group: Zarr group to write data into
        """
        # Set the view type
        group.attrs["view_type"] = "Box"

        # Set layout properties
        group.attrs["direction"] = self.direction
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
