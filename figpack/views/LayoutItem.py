"""
LayoutItem class for figpack Box view - represents an item in a layout container
"""

from typing import Optional, Union

from ..core.figpack_view import FigpackView


class LayoutItem:
    """
    Represents an item in a Box layout with positioning and sizing constraints
    """

    def __init__(
        self,
        view: FigpackView,
        *,
        stretch: Optional[float] = None,
        min_size: Optional[float] = None,
        max_size: Optional[float] = None,
        title: Optional[str] = None,
        collapsible: bool = False,
    ):
        """
        Initialize a LayoutItem

        Args:
            view: The figpack view to be contained in this layout item
            stretch: Stretch factor for flexible sizing (relative to other stretch items)
            min_size: Minimum size in pixels
            max_size: Maximum size in pixels
            title: Title to display for this item
            collapsible: Whether this item can be collapsed
        """
        self.view = view
        self.stretch = stretch
        self.min_size = min_size
        self.max_size = max_size
        self.title = title
        self.collapsible = collapsible

    def to_dict(self) -> dict:
        """
        Convert the LayoutItem to a dictionary for serialization

        Returns:
            Dictionary representation of the LayoutItem
        """
        return {
            "stretch": self.stretch,
            "min_size": self.min_size,
            "max_size": self.max_size,
            "title": self.title,
            "collapsible": self.collapsible,
        }
