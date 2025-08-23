"""
CrossCorrelograms view for figpack - displays multiple cross-correlograms
"""

from typing import List, Optional

import numpy as np
import zarr

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
    ):
        """
        Initialize a CrossCorrelograms view

        Args:
            cross_correlograms: List of CrossCorrelogramItem objects
            hide_unit_selector: Whether to hide the unit selector widget
        """
        self.cross_correlograms = cross_correlograms
        self.hide_unit_selector = hide_unit_selector

    @staticmethod
    def from_sorting(sorting):
        import spikeinterface as si
        import spikeinterface.widgets as sw

        assert isinstance(sorting, si.BaseSorting), "Input must be a BaseSorting object"
        W = sw.CrossCorrelogramsWidget(sorting)
        return CrossCorrelograms.from_spikeinterface_widget(W)

    @staticmethod
    def from_spikeinterface_widget(W):
        from spikeinterface.widgets.base import to_attr
        from spikeinterface.widgets.utils_sortingview import make_serializable

        from .CrossCorrelogramItem import CrossCorrelogramItem

        data_plot = W.data_plot

        dp = to_attr(data_plot)

        unit_ids = make_serializable(dp.unit_ids)

        if dp.similarity is not None:
            similarity = dp.similarity
        else:
            similarity = np.ones((len(unit_ids), len(unit_ids)))

        cc_items = []
        for i in range(len(unit_ids)):
            for j in range(i, len(unit_ids)):
                if similarity[i, j] >= dp.min_similarity_for_correlograms:
                    cc_items.append(
                        CrossCorrelogramItem(
                            unit_id1=unit_ids[i],
                            unit_id2=unit_ids[j],
                            bin_edges_sec=(dp.bins / 1000.0).astype("float32"),
                            bin_counts=dp.correlograms[i, j].astype("int32"),
                        )
                    )

        view = CrossCorrelograms(cross_correlograms=cc_items, hide_unit_selector=False)
        return view

    def _write_to_zarr_group(self, group: zarr.Group) -> None:
        """
        Write the CrossCorrelograms data to a Zarr group

        Args:
            group: Zarr group to write data into
        """
        # Set the view type
        group.attrs["view_type"] = "CrossCorrelograms"

        # Set view properties
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
