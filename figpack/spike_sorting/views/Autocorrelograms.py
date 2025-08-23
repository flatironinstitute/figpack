"""
Autocorrelograms view for figpack - displays multiple autocorrelograms
"""

from typing import List, Optional

import numpy as np
import zarr

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
    ):
        """
        Initialize an Autocorrelograms view

        Args:
            autocorrelograms: List of AutocorrelogramItem objects
        """
        self.autocorrelograms = autocorrelograms

    @staticmethod
    def from_sorting(sorting):
        import spikeinterface as si
        import spikeinterface.widgets as sw

        assert isinstance(sorting, si.BaseSorting), "Input must be a BaseSorting object"
        W = sw.plot_autocorrelograms(sorting)
        return Autocorrelograms.from_spikeinterface_widget(W)

    @staticmethod
    def from_spikeinterface_widget(W):
        from spikeinterface.widgets.base import to_attr
        from spikeinterface.widgets.utils_sortingview import make_serializable

        from .AutocorrelogramItem import AutocorrelogramItem

        data_plot = W.data_plot

        dp = to_attr(data_plot)

        unit_ids = make_serializable(dp.unit_ids)

        ac_items = []
        for i in range(len(unit_ids)):
            for j in range(i, len(unit_ids)):
                if i == j:
                    ac_items.append(
                        AutocorrelogramItem(
                            unit_id=unit_ids[i],
                            bin_edges_sec=(dp.bins / 1000.0).astype("float32"),
                            bin_counts=dp.correlograms[i, j].astype("int32"),
                        )
                    )

        view = Autocorrelograms(autocorrelograms=ac_items)
        return view

    def _write_to_zarr_group(self, group: zarr.Group) -> None:
        """
        Write the Autocorrelograms data to a Zarr group

        Args:
            group: Zarr group to write data into
        """
        # Set the view type
        group.attrs["view_type"] = "Autocorrelograms"

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
