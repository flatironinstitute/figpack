"""
UnitSimilarityMatrix view for figpack - displays a similarity matrix between units
"""

from typing import List, Optional, Tuple, Union

import figpack
from ..spike_sorting_extension import spike_sorting_extension
from .UnitSimilarityScore import UnitSimilarityScore


class UnitSimilarityMatrix(figpack.ExtensionView):
    """
    A view that displays a similarity matrix between units
    """

    def __init__(
        self,
        *,
        unit_ids: List[Union[str, int]],
        similarity_scores: List[UnitSimilarityScore],
        range: Optional[Tuple[float, float]] = None,
    ):
        """
        Initialize a UnitSimilarityMatrix view

        Args:
            unit_ids: List of unit identifiers
            similarity_scores: List of UnitSimilarityScore objects representing pairwise similarities
            range: Optional tuple specifying the range for the color scale (min, max)
        """
        super().__init__(
            extension=spike_sorting_extension,
            view_type="spike_sorting.UnitSimilarityMatrix",
        )
        self.unit_ids = unit_ids
        self.similarity_scores = similarity_scores
        self.range = range

    def write_to_zarr_group(self, group: figpack.Group) -> None:
        """
        Write the UnitSimilarityMatrix data to a Zarr group

        Args:
            group: Zarr group to write data into
        """
        super().write_to_zarr_group(group)

        # Store unit IDs as strings
        group.attrs["unit_ids"] = [str(uid) for uid in self.unit_ids]

        # Store similarity scores as a list of dictionaries
        similarity_scores_data = [score.to_dict() for score in self.similarity_scores]
        group.attrs["similarity_scores"] = similarity_scores_data

        # Store optional range parameter
        if self.range is not None:
            group.attrs["range"] = list(self.range)
