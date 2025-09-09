"""
RasterPlotItem for figpack - represents a single unit's raster plot
"""

from typing import Union
import numpy as np


class RasterPlotItem:
    """
    Represents spike times for a single unit in a raster plot
    """

    def __init__(
        self,
        *,
        unit_id: Union[str, int],
        spike_times_sec: np.ndarray,
    ):
        """
        Initialize a RasterPlotItem

        Args:
            unit_id: Identifier for the unit
            spike_times_sec: Numpy array of spike times in seconds
        """
        self.unit_id = unit_id
        self.spike_times_sec = np.array(spike_times_sec, dtype=np.float32)
