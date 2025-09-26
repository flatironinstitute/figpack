"""
MountainLayoutItem class for figpack MountainLayout view - represents an item in a mountain layout container
"""

from typing import Optional, Union

from ..core.figpack_view import FigpackView


class MountainLayoutItem:
    """
    Represents an item in a MountainLayout with label, view, and control properties
    """

    def __init__(
        self,
        *,
        label: str,
        view: FigpackView,
        is_control: bool = False,
        control_height: Optional[int] = None,
    ):
        """
        Initialize a MountainLayoutItem

        Args:
            label: The label text to display for this item
            view: The figpack view to be contained in this layout item
            is_control: Whether this item is a control view (shows in bottom-left panel)
            control_height: Height in pixels for control views (optional)
        """
        self.label = label
        self.view = view
        self.is_control = is_control
        self.control_height = control_height

    def to_dict(self) -> dict:
        """
        Convert the MountainLayoutItem to a dictionary for serialization

        Returns:
            Dictionary representation of the MountainLayoutItem
        """
        result = {
            "label": self.label,
            "is_control": self.is_control,
        }
        if self.control_height is not None:
            result["control_height"] = self.control_height
        return result
