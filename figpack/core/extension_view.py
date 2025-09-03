"""
Base class for views that use figpack extensions
"""

import zarr
from .figpack_view import FigpackView
from .figpack_extension import ExtensionRegistry


class ExtensionView(FigpackView):
    """
    Base class for views that are rendered by figpack extensions
    """

    def __init__(self, *, extension_name: str):
        """
        Initialize an extension-based view

        Args:
            extension_name: Name of the extension that will render this view
        """
        super().__init__()
        self.extension_name = extension_name

        # Validate that the extension is registered
        registry = ExtensionRegistry.get_instance()
        extension = registry.get_extension(extension_name)
        if extension is None:
            raise ValueError(
                f"Extension '{extension_name}' is not registered. "
                f"Make sure to register the extension before creating views that use it."
            )

    def _write_to_zarr_group(self, group: zarr.Group) -> None:
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
        group.attrs["extension_name"] = self.extension_name

        # Store extension metadata for debugging/compatibility
        registry = ExtensionRegistry.get_instance()
        extension = registry.get_extension(self.extension_name)
        if extension:
            group.attrs["extension_version"] = extension.version
