import os
import pathlib
import json
from typing import Optional, List

import zarr

from .figpack_view import FigpackView
from .figpack_extension import FigpackExtension
from .extension_view import ExtensionView
from .zarr import Group, _check_zarr_version
from ._zarr_consolidate import consolidate_zarr_chunks

thisdir = pathlib.Path(__file__).parent.resolve()


def prepare_figure_bundle(
    view: FigpackView,
    tmpdir: str,
    *,
    title: str,
    description: Optional[str] = None,
    script: Optional[str] = None,
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
        script: Optional script text used to generate the figure
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

    # If we are using zarr 3, then we set the default zarr format to 2 temporarily
    # because we only support version 2 on the frontend right now.

    if _check_zarr_version() == 3:
        old_default_zarr_format = zarr.config.get("default_zarr_format")  # type: ignore
        zarr.config.set({"default_zarr_format": 2})  # type: ignore

    try:
        # Write the view data to the Zarr group
        zarr_group = zarr.open_group(pathlib.Path(tmpdir) / "data.zarr", mode="w")
        zarr_group = Group(zarr_group)
        view.write_to_zarr_group(zarr_group)

        # Add title and description and script as attributes on the top-level zarr group
        zarr_group.attrs["title"] = title
        if description:
            zarr_group.attrs["description"] = description
        if script:
            zarr_group.attrs["script"] = script

        # Discover and write extension JavaScript files
        required_extensions = _discover_required_extensions(view)
        _write_extension_files(required_extensions, tmpdir)

        # Generate extension manifest
        _write_extension_manifest(required_extensions, tmpdir)

        # Create the .zmetadata file
        zarr.consolidate_metadata(zarr_group._zarr_group.store)

        # It's important that we remove all the metadata files except for the
        # consolidated one so there is a single source of truth.
        _remove_metadata_files_except_consolidated(pathlib.Path(tmpdir) / "data.zarr")

        # Consolidate zarr chunks into larger files to reduce upload count
        consolidate_zarr_chunks(pathlib.Path(tmpdir) / "data.zarr")
    finally:
        if _check_zarr_version() == 3:
            zarr.config.set({"default_zarr_format": old_default_zarr_format})  # type: ignore


def _remove_metadata_files_except_consolidated(zarr_dir: pathlib.Path) -> None:
    """
    Remove all zarr metadata files except for the consolidated one.

    Args:
        zarr_dir: Path to the zarr directory
    """
    if not zarr_dir.is_dir():
        raise ValueError(f"Expected a directory, got: {zarr_dir}")

    for root, dirs, files in os.walk(zarr_dir):
        for file in files:
            if (
                file.endswith(".zarray")
                or file.endswith(".zgroup")
                or file.endswith(".zattrs")
            ):
                file_path = pathlib.Path(root) / file
                try:
                    file_path.unlink()
                except Exception as e:
                    print(f"Warning: could not remove file {file_path}: {e}")


def _discover_required_extensions(view: FigpackView) -> List[str]:
    """
    Recursively discover all extensions required by a view and its children

    Args:
        view: The root view to analyze

    Returns:
        Set of extension names required by this view hierarchy
    """
    extension_names_discovered = set()
    extensions_discovered = []
    visited = set()  # Prevent infinite recursion

    def _collect_extensions(v: FigpackView):
        # Prevent infinite recursion
        if id(v) in visited:
            return
        visited.add(id(v))

        # Check if this view is an extension view
        if isinstance(v, ExtensionView):
            if v.extension.name not in extension_names_discovered:
                extension_names_discovered.add(v.extension.name)
                extensions_discovered.append(v.extension)

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
    return extensions_discovered


def _write_extension_files(extensions, tmpdir: str) -> None:
    """
    Write JavaScript files for the required extensions

    Args:
        extension_names: Set of extension names to write
        tmpdir: Directory to write extension files to
    """
    tmpdir_path = pathlib.Path(tmpdir)

    for extension in extensions:
        if not isinstance(extension, FigpackExtension):
            raise ValueError("Expected a FigpackExtension instance")
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


def _write_extension_manifest(extensions, tmpdir: str) -> None:
    """
    Write the extension manifest file that lists all extensions and their files

    Args:
        extensions: List of FigpackExtension instances
        tmpdir: Directory to write the manifest file to
    """
    tmpdir_path = pathlib.Path(tmpdir)
    manifest_path = tmpdir_path / "extension_manifest.json"

    # Build the manifest data
    manifest_data = {"extensions": []}

    for extension in extensions:
        if not isinstance(extension, FigpackExtension):
            raise ValueError("Expected a FigpackExtension instance")

        # Get the main script filename
        main_script = extension.get_javascript_filename()

        # Get additional script filenames
        additional_filenames = extension.get_additional_filenames()
        additional_scripts = list(additional_filenames.values())

        extension_entry = {
            "name": extension.name,
            "mainScript": main_script,
            "additionalScripts": additional_scripts,
            "version": extension.version,
        }

        manifest_data["extensions"].append(extension_entry)

    # Write the manifest file
    manifest_path.write_text(
        json.dumps(manifest_data, indent=2, ensure_ascii=False), encoding="utf-8"
    )
