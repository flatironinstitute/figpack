import os
import pathlib

import zarr

from .figpack_view import FigpackView

thisdir = pathlib.Path(__file__).parent.resolve()


def prepare_figure_bundle(
    view: FigpackView, tmpdir: str, *, title: str = None, description: str = None
) -> None:
    """
    Prepare a figure bundle in the specified temporary directory.

    This function:
    1. Copies all files from the figpack-gui-dist directory to tmpdir
    2. Writes the view data to a zarr group
    3. Consolidates zarr metadata

    Args:
        view: The figpack view to prepare
        tmpdir: The temporary directory to prepare the bundle in
        title: Optional title for the figure
        description: Optional description for the figure (markdown supported)
    """
    html_dir = thisdir / ".." / "figpack-gui-dist"
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

    # Write the graph data to the Zarr group
    zarr_group = zarr.open_group(
        pathlib.Path(tmpdir) / "data.zarr",
        mode="w",
        synchronizer=zarr.ThreadSynchronizer(),
    )
    view._write_to_zarr_group(zarr_group)

    # Add title and description as attributes on the top-level zarr group
    if title is not None:
        zarr_group.attrs["title"] = title
    if description is not None:
        zarr_group.attrs["description"] = description

    zarr.consolidate_metadata(zarr_group.store)
