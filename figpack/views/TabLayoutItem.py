"""
TabLayoutItem class for figpack TabLayout view - represents a tab in a tab layout container
"""

from typing import Optional

from ..core.figpack_view import FigpackView


class TabLayoutItem:
    """
    Represents a tab item in a TabLayout with a label and view
    """

    def __init__(
        self,
        view: FigpackView,
        *,
        label: str,
    ):
        """
        Initialize a TabLayoutItem

        Args:
            view: The figpack view to be contained in this tab
            label: The label text to display on the tab
        """
        self.view = view
        self.label = label

    def to_dict(self) -> dict:
        """
        Convert the TabLayoutItem to a dictionary for serialization

        Returns:
            Dictionary representation of the TabLayoutItem
        """
        return {
            "label": self.label,
        }
