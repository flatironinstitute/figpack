"""
SpikeAmplitudesItem for figpack - represents spike amplitudes for a single unit
"""

from typing import Union

import numpy as np


class SpikeAmplitudesItem:
    """
    Represents spike amplitudes for a single unit
    """

    def __init__(
        self,
        *,
        unit_id: Union[str, int],
        spike_times_sec: np.ndarray,
        spike_amplitudes: np.ndarray,
    ):
        """
        Initialize a SpikeAmplitudesItem

        Args:
            unit_id: Identifier for the unit
            spike_times_sec: 1D numpy array of spike times in seconds
            spike_amplitudes: 1D numpy array of spike amplitudes
        """
        assert spike_times_sec.ndim == 1, "Spike times must be 1-dimensional"
        assert spike_amplitudes.ndim == 1, "Spike amplitudes must be 1-dimensional"
        assert len(spike_times_sec) == len(
            spike_amplitudes
        ), "Spike times and amplitudes must have the same length"

        self.unit_id = unit_id
        self.spike_times_sec = np.array(spike_times_sec, dtype=np.float32)
        self.spike_amplitudes = np.array(spike_amplitudes, dtype=np.float32)
