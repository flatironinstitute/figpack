"""
CrossCorrelograms view for figpack - displays multiple cross-correlograms
"""

import zarr
import numpy as np
from typing import List, Optional
from ...core.figpack_view import FigpackView
from .CrossCorrelogramItem import CrossCorrelogramItem


class CrossCorrelograms(FigpackView):
    """
    A view that displays multiple cross-correlograms for spike sorting analysis
    """

    def __init__(
        self,
        *,
        cross_correlograms: List[CrossCorrelogramItem],
        hide_unit_selector: Optional[bool] = False,
        height: Optional[int] = 500,
    ):
        """
        Initialize a CrossCorrelograms view

        Args:
            cross_correlograms: List of CrossCorrelogramItem objects
            hide_unit_selector: Whether to hide the unit selector widget
            height: Height of the view in pixels
        """
        self.cross_correlograms = cross_correlograms
        self.hide_unit_selector = hide_unit_selector
        self.height = height

    def _write_to_zarr_group(self, group: zarr.Group) -> None:
        """
        Write the CrossCorrelograms data to a Zarr group

        Args:
            group: Zarr group to write data into
        """
        # Set the view type
        group.attrs["view_type"] = "CrossCorrelograms"

        # Set view properties
        if self.height is not None:
            group.attrs["height"] = self.height
        if self.hide_unit_selector is not None:
            group.attrs["hide_unit_selector"] = self.hide_unit_selector

        # Store the number of cross-correlograms
        group.attrs["num_cross_correlograms"] = len(self.cross_correlograms)

        # Store metadata for each cross-correlogram
        cross_correlogram_metadata = []
        for i, cross_corr in enumerate(self.cross_correlograms):
            cross_corr_name = f"cross_correlogram_{i}"

            # Store metadata
            metadata = {
                "name": cross_corr_name,
                "unit_id1": str(cross_corr.unit_id1),
                "unit_id2": str(cross_corr.unit_id2),
                "num_bins": len(cross_corr.bin_counts),
            }
            cross_correlogram_metadata.append(metadata)

            # Create arrays for this cross-correlogram
            group.create_dataset(
                f"{cross_corr_name}/bin_edges_sec",
                data=cross_corr.bin_edges_sec,
                dtype=np.float32,
            )
            group.create_dataset(
                f"{cross_corr_name}/bin_counts",
                data=cross_corr.bin_counts,
                dtype=np.int32,
            )

        # Store the cross-correlogram metadata
        group.attrs["cross_correlograms"] = cross_correlogram_metadata
