"""
Splitter view for figpack - a resizable split layout container
"""

from typing import Literal

from ..core._figure_spec import SpecProp, SpecSchema
from ..core.figpack_view import FigpackView
from ..core.zarr import Group
from .LayoutItem import LayoutItem


class Splitter(FigpackView):
    """
    A resizable split layout container that divides space between two items
    """

    spec_schema = SpecSchema(
        view_type="Splitter",
        description="Two child views separated by a draggable divider.",
        props=[
            SpecProp(
                "direction",
                '"horizontal" | "vertical"',
                "Whether the panes are side by side (horizontal) or stacked (vertical).",
            ),
            SpecProp(
                "split_pos",
                "number (0 to 1)",
                "Initial position of the divider, as a fraction of the size.",
            ),
            SpecProp(
                "item1_metadata",
                "{min_size, max_size, ...}",
                "Size limits of the first pane, in pixels.",
            ),
            SpecProp(
                "item2_metadata",
                "{min_size, max_size, ...}",
                "Size limits of the second pane, in pixels.",
            ),
        ],
        children="views",
        children_description="child views item1 and item2.",
    )

    def __init__(
        self,
        *,
        direction: Literal["horizontal", "vertical"] = "vertical",
        item1: LayoutItem,
        item2: LayoutItem,
        split_pos: float = 0.5,
    ):
        """
        Initialize a Splitter layout view

        Args:
            direction: Split direction - "horizontal" or "vertical"
            item1: First LayoutItem (left/top)
            item2: Second LayoutItem (right/bottom)
            split_pos: Initial split position as fraction (0.0 to 1.0)
        """
        self.direction = direction
        self.item1 = item1
        self.item2 = item2
        self.split_pos = max(0.1, min(0.9, split_pos))  # Clamp between 0.1 and 0.9

    def write_to_zarr_group(self, group: Group) -> None:
        """
        Write the Splitter layout data to a Zarr group

        Args:
            group: Zarr group to write data into
        """
        # Set the view type
        group.attrs["view_type"] = "Splitter"

        # Set layout properties
        group.attrs["direction"] = self.direction
        group.attrs["split_pos"] = self.split_pos

        # Store item metadata
        item1_metadata = self.item1.to_dict()
        item1_metadata["name"] = "item1"
        item2_metadata = self.item2.to_dict()
        item2_metadata["name"] = "item2"

        group.attrs["item1_metadata"] = item1_metadata
        group.attrs["item2_metadata"] = item2_metadata

        # Create subgroups for each item's view
        item1_group = group.create_group("item1")
        self.item1.view.write_to_zarr_group(item1_group)

        item2_group = group.create_group("item2")
        self.item2.view.write_to_zarr_group(item2_group)
