"""
Autocorrelograms view for figpack - displays multiple autocorrelograms
"""

import zarr
import numpy as np
from typing import List, Optional
from ...core.figpack_view import FigpackView
from .AutocorrelogramItem import AutocorrelogramItem


class Autocorrelograms(FigpackView):
    """
    A view that displays multiple autocorrelograms for spike sorting analysis
    """

    def __init__(
        self,
        *,
        autocorrelograms: List[AutocorrelogramItem],
        height: Optional[int] = 400,
    ):
        """
        Initialize an Autocorrelograms view

        Args:
            autocorrelograms: List of AutocorrelogramItem objects
            height: Height of the view in pixels
        """
        self.autocorrelograms = autocorrelograms
        self.height = height

    def _write_to_zarr_group(self, group: zarr.Group) -> None:
        """
        Write the Autocorrelograms data to a Zarr group

        Args:
            group: Zarr group to write data into
        """
        # Set the view type
        group.attrs["view_type"] = "Autocorrelograms"

        # Set view properties
        if self.height is not None:
            group.attrs["height"] = self.height

        # Store the number of autocorrelograms
        group.attrs["num_autocorrelograms"] = len(self.autocorrelograms)

        # Store metadata for each autocorrelogram
        autocorrelogram_metadata = []
        for i, autocorr in enumerate(self.autocorrelograms):
            autocorr_name = f"autocorrelogram_{i}"

            # Store metadata
            metadata = {
                "name": autocorr_name,
                "unit_id": str(autocorr.unit_id),
                "num_bins": len(autocorr.bin_counts),
            }
            autocorrelogram_metadata.append(metadata)

            # Create arrays for this autocorrelogram
            group.create_dataset(
                f"{autocorr_name}/bin_edges_sec",
                data=autocorr.bin_edges_sec,
                dtype=np.float32,
            )
            group.create_dataset(
                f"{autocorr_name}/bin_counts",
                data=autocorr.bin_counts,
                dtype=np.int32,
            )

        # Store the autocorrelogram metadata
        group.attrs["autocorrelograms"] = autocorrelogram_metadata
