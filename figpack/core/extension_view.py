"""
Base class for views that use figpack extensions
"""

from .figpack_view import FigpackView
from .figpack_extension import FigpackExtension
from ..core.zarr import Group


class ExtensionView(FigpackView):
    """
    Base class for views that are rendered by figpack extensions
    """

    def __init__(self, *, extension: FigpackExtension):
        """
        Initialize an extension-based view

        Args:
            extension_name: Name of the extension that will render this view
        """
        super().__init__()
        self.extension = extension

    def _write_to_zarr_group(self, group: Group) -> None:
        """
        Write the extension view metadata to a Zarr group.
        Subclasses should call super()._write_to_zarr_group(group) first,
        then add their own data.

        Args:
            group: Zarr group to write data into
        """
        # Set the view type to indicate this is an extension view
        group.attrs["view_type"] = "ExtensionView"

        # Store the extension name so the frontend knows which extension to use
        group.attrs["extension_name"] = self.extension.name

        group.attrs["extension_version"] = self.extension.version
