"""
CrossCorrelogramItem for spike sorting views
"""

from typing import Union

import numpy as np


class CrossCorrelogramItem:
    """
    Represents a single cross-correlogram between two units
    """

    def __init__(
        self,
        *,
        unit_id1: Union[str, int],
        unit_id2: Union[str, int],
        bin_edges_sec: np.ndarray,
        bin_counts: np.ndarray,
    ):
        """
        Initialize a CrossCorrelogramItem

        Args:
            unit_id1: Identifier for the first unit
            unit_id2: Identifier for the second unit
            bin_edges_sec: Array of bin edges in seconds
            bin_counts: Array of bin counts
        """
        self.unit_id1 = unit_id1
        self.unit_id2 = unit_id2
        self.bin_edges_sec = np.array(bin_edges_sec, dtype=np.float32)
        self.bin_counts = np.array(bin_counts, dtype=np.int32)
