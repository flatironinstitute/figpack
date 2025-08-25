"""
RasterPlot view for figpack - displays multiple raster plots
"""

from typing import List
import numpy as np
import zarr

from ...core.figpack_view import FigpackView
from .RasterPlotItem import RasterPlotItem


class RasterPlot(FigpackView):
    """
    A view that displays multiple raster plots for spike sorting analysis
    """

    def __init__(
        self,
        *,
        start_time_sec: float,
        end_time_sec: float,
        plots: List[RasterPlotItem],
        height: int = 500,
    ):
        """
        Initialize a RasterPlot view

        Args:
            start_time_sec: Start time in seconds for the plot range
            end_time_sec: End time in seconds for the plot range
            plots: List of RasterPlotItem objects
            height: Height of the plot in pixels (default: 500)
        """
        self.start_time_sec = float(start_time_sec)
        self.end_time_sec = float(end_time_sec)
        self.plots = plots
        self.height = height

    def _write_to_zarr_group(self, group: zarr.Group) -> None:
        """
        Write the RasterPlot data to a Zarr group

        Args:
            group: Zarr group to write data into
        """
        # Set the view type
        group.attrs["view_type"] = "RasterPlot"

        # Store view-level attributes
        group.attrs["start_time_sec"] = self.start_time_sec
        group.attrs["end_time_sec"] = self.end_time_sec
        group.attrs["height"] = self.height
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

        # Store the plot metadata
        group.attrs["plots"] = plot_metadata
