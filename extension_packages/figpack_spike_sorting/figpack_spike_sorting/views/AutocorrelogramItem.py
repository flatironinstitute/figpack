"""
AutocorrelogramItem for spike sorting views
"""

from typing import Union

import numpy as np


class AutocorrelogramItem:
    """
    Represents a single autocorrelogram for a unit
    """

    def __init__(
        self,
        *,
        unit_id: Union[str, int],
        bin_edges_sec: np.ndarray,
        bin_counts: np.ndarray,
    ):
        """
        Initialize an AutocorrelogramItem

        Args:
            unit_id: Identifier for the unit
            bin_edges_sec: Array of bin edges in seconds
            bin_counts: Array of bin counts
        """
        self.unit_id = unit_id
        self.bin_edges_sec = np.array(bin_edges_sec, dtype=np.float32)
        self.bin_counts = np.array(bin_counts, dtype=np.int32)
