import os
import pathlib
from typing import Set

import zarr

from .figpack_view import FigpackView
from .figpack_extension import ExtensionRegistry
from .extension_view import ExtensionView

thisdir = pathlib.Path(__file__).parent.resolve()


def prepare_figure_bundle(
    view: FigpackView, tmpdir: str, *, title: str, description: str = None
) -> None:
    """
    Prepare a figure bundle in the specified temporary directory.

    This function:
    1. Copies all files from the figpack-figure-dist directory to tmpdir
    2. Writes the view data to a zarr group
    3. Discovers and writes extension JavaScript files
    4. Consolidates zarr metadata

    Args:
        view: The figpack view to prepare
        tmpdir: The temporary directory to prepare the bundle in
        title: Title for the figure (required)
        description: Optional description for the figure (markdown supported)
    """
    html_dir = thisdir / ".." / "figpack-figure-dist"
    if not os.path.exists(html_dir):
        raise SystemExit(f"Error: directory not found: {html_dir}")

    # Copy all files in html_dir recursively to tmpdir
    for item in html_dir.iterdir():
        if item.is_file():
            target = pathlib.Path(tmpdir) / item.name
            target.write_bytes(item.read_bytes())
        elif item.is_dir():
            target = pathlib.Path(tmpdir) / item.name
            target.mkdir(exist_ok=True)
            for subitem in item.iterdir():
                target_sub = target / subitem.name
                target_sub.write_bytes(subitem.read_bytes())

    # Write the view data to the Zarr group
    zarr_group = zarr.open_group(
        pathlib.Path(tmpdir) / "data.zarr",
        mode="w",
        synchronizer=zarr.ThreadSynchronizer(),
    )
    view._write_to_zarr_group(zarr_group)

    # Add title and description as attributes on the top-level zarr group
    zarr_group.attrs["title"] = title
    if description is not None:
        zarr_group.attrs["description"] = description

    # Discover and write extension JavaScript files
    required_extensions = _discover_required_extensions(view)
    _write_extension_files(required_extensions, tmpdir)

    zarr.consolidate_metadata(zarr_group.store)


def _discover_required_extensions(view: FigpackView) -> Set[str]:
    """
    Recursively discover all extensions required by a view and its children

    Args:
        view: The root view to analyze

    Returns:
        Set of extension names required by this view hierarchy
    """
    extensions = set()
    visited = set()  # Prevent infinite recursion

    def _collect_extensions(v: FigpackView):
        # Prevent infinite recursion
        if id(v) in visited:
            return
        visited.add(id(v))

        # Check if this view is an extension view
        if isinstance(v, ExtensionView):
            extensions.add(v.extension_name)

        # Recursively check all attributes that might contain child views
        for attr_name in dir(v):
            if attr_name.startswith("_"):
                continue

            try:
                attr_value = getattr(v, attr_name)

                # Handle single child view
                if isinstance(attr_value, FigpackView):
                    _collect_extensions(attr_value)

                # Handle lists/tuples of items that might contain views
                elif isinstance(attr_value, (list, tuple)):
                    for item in attr_value:
                        # Check if item has a 'view' attribute (like LayoutItem)
                        if hasattr(item, "view") and isinstance(item.view, FigpackView):
                            _collect_extensions(item.view)
                        # Or if the item itself is a view
                        elif isinstance(item, FigpackView):
                            _collect_extensions(item)

                # Handle objects that might have a 'view' attribute
                elif hasattr(attr_value, "view") and isinstance(
                    attr_value.view, FigpackView
                ):
                    _collect_extensions(attr_value.view)

            except (AttributeError, TypeError):
                # Skip attributes that can't be accessed or aren't relevant
                continue

    _collect_extensions(view)
    return extensions


def _write_extension_files(extension_names: Set[str], tmpdir: str) -> None:
    """
    Write JavaScript files for the required extensions

    Args:
        extension_names: Set of extension names to write
        tmpdir: Directory to write extension files to
    """
    if not extension_names:
        return

    registry = ExtensionRegistry.get_instance()
    tmpdir_path = pathlib.Path(tmpdir)

    for extension_name in extension_names:
        extension = registry.get_extension(extension_name)
        if extension is None:
            raise RuntimeError(
                f"Extension '{extension_name}' is required but not registered"
            )

        # Write the main JavaScript file
        js_filename = extension.get_javascript_filename()
        js_path = tmpdir_path / js_filename

        # Add some metadata as comments at the top
        js_content = f"""/*
 * Figpack Extension: {extension.name}
 * Version: {extension.version}
 * Generated automatically - do not edit
 */

{extension.javascript_code}
"""

        js_path.write_text(js_content, encoding="utf-8")

        # Write additional JavaScript files
        additional_filenames = extension.get_additional_filenames()
        for original_name, safe_filename in additional_filenames.items():
            additional_content = extension.additional_files[original_name]
            additional_path = tmpdir_path / safe_filename

            # Add metadata header to additional files too
            additional_js_content = f"""/*
 * Figpack Extension Additional File: {extension.name}/{original_name}
 * Version: {extension.version}
 * Generated automatically - do not edit
 */

{additional_content}
"""

            additional_path.write_text(additional_js_content, encoding="utf-8")
