"""
TiledImage view for figpack - displays large images using tiled rendering with deck.gl
"""

from io import BytesIO
from tempfile import TemporaryDirectory
from typing import Any, List, Union

import numpy as np

import figpack
from ..spike_sorting_extension import spike_sorting_extension

pyvips_installation_msg = "To use TiledImage you need to install pyvips (conda install -c conda-forge pyvips recommended)"


class TiledImageLayer:
    def __init__(self, label: str, data: Union[np.ndarray, Any]) -> None:
        """
        Initialize a TiledImageLayer

        Args:
            label: Label for the layer
            data: Image data as numpy array (uint8, shape (height, width, 3) for RGB)
                  or pyvips.Image object
        """
        try:
            import pyvips
        except ImportError:
            raise ImportError(pyvips_installation_msg)

        self.label = label
        self.data = data

        if isinstance(data, pyvips.Image):
            image: pyvips.Image = data
        else:
            if not isinstance(data, np.ndarray):
                raise TypeError("Data must be a numpy array or pyvips.Image")
            if data.dtype != np.uint8:
                raise ValueError("Data must be of type uint8")
            # Convert numpy array to pyvips image
            image: pyvips.Image = pyvips.Image.new_from_array(data)

        self.image = image


class TiledImage(figpack.ExtensionView):
    """
    A view that displays large images using tiled rendering for efficient viewing
    """

    def __init__(
        self, *, tile_size: int, layers: List[TiledImageLayer], verbose: bool = False
    ):
        """
        Initialize a TiledImage view

        Args:
            tile_size: Size of each tile in pixels (e.g., 256)
            layers: List of TiledImageLayer objects
            verbose: Whether to print verbose output during tile generation
        """
        super().__init__(
            extension=spike_sorting_extension, view_type="spike_sorting.TiledImage"
        )
        self.tile_size = tile_size
        self.layers = layers
        self.verbose = verbose

    def write_to_zarr_group(self, group: figpack.Group) -> None:
        """
        Write the TiledImage data to a Zarr group

        Args:
            group: Zarr group to write data into
        """
        import os
        import pyvips

        super().write_to_zarr_group(group)

        group.attrs["tile_size"] = self.tile_size
        group.attrs["num_layers"] = len(self.layers)

        for layer_idx, layer in enumerate(self.layers):
            if self.verbose:
                print(
                    f"Processing layer {layer_idx + 1}/{len(self.layers)}: {layer.label}"
                )

            layer_group = group.create_group(f"layer_{layer_idx}")
            layer_group.attrs["label"] = layer.label

            image: pyvips.Image = layer.image
            layer_group.attrs["width"] = image.width
            layer_group.attrs["height"] = image.height

            # Generate tiled JPEG images using pyvips dzsave
            with TemporaryDirectory() as tmpdir:
                # Generate the tile pyramid
                image.dzsave(
                    f"{tmpdir}/output",
                    overlap=0,
                    tile_size=self.tile_size,
                    layout=pyvips.enums.ForeignDzLayout.DZ,
                )

                output_dirname = f"{tmpdir}/output_files"

                # Count zoom levels
                num_zoom_levels = 0
                z = 1
                while True:
                    dirname = f"{output_dirname}/{z}"
                    if not os.path.exists(dirname):
                        break
                    num_zoom_levels = z
                    z += 1

                layer_group.attrs["num_zoom_levels"] = num_zoom_levels

                # Store each tile as a zarr dataset containing JPEG bytes
                tiles_group = layer_group.create_group("tiles")

                for z in range(1, num_zoom_levels + 1):
                    dirname = f"{output_dirname}/{z}"
                    j = 0
                    while True:
                        if not os.path.exists(f"{dirname}/{j}_0.jpeg"):
                            break
                        k = 0
                        while True:
                            tile_path = f"{dirname}/{j}_{k}.jpeg"
                            if not os.path.exists(tile_path):
                                break

                            # Read the JPEG file as bytes
                            with open(tile_path, "rb") as f:
                                jpeg_bytes = f.read()

                            # Store as uint8 array in zarr
                            tile_key = f"{z}_{j}_{k}"
                            jpeg_array = np.frombuffer(jpeg_bytes, dtype=np.uint8)
                            tiles_group.create_dataset(tile_key, data=jpeg_array)

                            if self.verbose:
                                print(
                                    f"  Stored tile {tile_key}: {len(jpeg_bytes)} bytes"
                                )

                            k += 1
                        j += 1

                if self.verbose:
                    print(
                        f"  Layer {layer.label}: {image.width}x{image.height}, "
                        f"{num_zoom_levels} zoom levels"
                    )
