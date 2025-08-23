"""
SpikeAmplitudes view for figpack - displays spike amplitudes over time
"""

from typing import List, Optional

import numpy as np
import zarr

from ...core.figpack_view import FigpackView
from .SpikeAmplitudesItem import SpikeAmplitudesItem


class SpikeAmplitudes(FigpackView):
    """
    A view that displays spike amplitudes over time for multiple units
    """

    def __init__(
        self,
        *,
        start_time_sec: float,
        end_time_sec: float,
        plots: List[SpikeAmplitudesItem],
        hide_unit_selector: bool = False,
        height: int = 500,
    ):
        """
        Initialize a SpikeAmplitudes view

        Args:
            start_time_sec: Start time of the view in seconds
            end_time_sec: End time of the view in seconds
            plots: List of SpikeAmplitudesItem objects
            hide_unit_selector: Whether to hide the unit selector
            height: Height of the view in pixels
        """
        self.start_time_sec = start_time_sec
        self.end_time_sec = end_time_sec
        self.plots = plots
        self.hide_unit_selector = hide_unit_selector
        self.height = height

    def _write_to_zarr_group(self, group: zarr.Group) -> None:
        """
        Write the SpikeAmplitudes data to a Zarr group

        Args:
            group: Zarr group to write data into
        """
        # Set the view type
        group.attrs["view_type"] = "SpikeAmplitudes"

        # Store view parameters
        group.attrs["start_time_sec"] = self.start_time_sec
        group.attrs["end_time_sec"] = self.end_time_sec
        group.attrs["hide_unit_selector"] = self.hide_unit_selector
        group.attrs["height"] = self.height

        # Store the number of plots
        group.attrs["num_plots"] = len(self.plots)

        # Store metadata for each plot
        plot_metadata = []
        for i, plot in enumerate(self.plots):
            plot_name = f"plot_{i}"

            # Store metadata
            metadata = {
                "name": plot_name,
                "unit_id": str(plot.unit_id),
                "num_spikes": len(plot.spike_times_sec),
            }
            plot_metadata.append(metadata)

            # Create arrays for this plot
            group.create_dataset(
                f"{plot_name}/spike_times_sec",
                data=plot.spike_times_sec,
                dtype=np.float32,
            )
            group.create_dataset(
                f"{plot_name}/spike_amplitudes",
                data=plot.spike_amplitudes,
                dtype=np.float32,
            )

        # Store the plot metadata
        group.attrs["plots"] = plot_metadata
