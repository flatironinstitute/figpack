"""
VerticalLayoutItem class for figpack VerticalLayout view
"""

from typing import Optional

from ..core.figpack_view import FigpackView


class VerticalLayoutItem:
    """
    Represents an item in a VerticalLayout with a fixed height
    """

    def __init__(
        self,
        view: FigpackView,
        *,
        height: float,
        title: Optional[str] = None,
    ):
        """
        Initialize a VerticalLayoutItem

        Args:
            view: The figpack view to be contained in this layout item
            height: Fixed height in pixels for this item
            title: Optional title to display for this item
        """
        self.view = view
        self.height = height
        self.title = title

    def to_dict(self) -> dict:
        """
        Convert the VerticalLayoutItem to a dictionary for serialization

        Returns:
            Dictionary representation of the VerticalLayoutItem
        """
        return {
            "height": self.height,
            "title": self.title,
        }
