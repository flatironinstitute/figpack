"""
RasterPlot view for figpack - displays multiple raster plots
"""

from typing import List
import numpy as np
import zarr

from ...core.figpack_view import FigpackView
from .RasterPlotItem import RasterPlotItem
from .UnitsTable import UnitsTable, UnitsTableColumn, UnitsTableRow
from ...views.Box import Box, LayoutItem


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

    @staticmethod
    def from_nwb_units_table(
        nwb_url_or_path: str,
        *,
        units_path: str,
        include_units_selector: bool = False,
    ):
        import lindi

        f = lindi.LindiH5pyFile.from_hdf5_file(nwb_url_or_path)
        X = f[units_path]
        spike_times = X["spike_times"]
        spike_times_index = X["spike_times_index"]
        id = X["id"]
        plots = []
        num_units = len(spike_times_index)
        start_times = []
        end_times = []
        for unit_index in range(num_units):
            unit_id = id[unit_index]
            if unit_index > 0:
                start_index = spike_times_index[unit_index - 1]
            else:
                start_index = 0
            end_index = spike_times_index[unit_index]
            unit_spike_times = spike_times[start_index:end_index]
            if len(unit_spike_times) == 0:
                continue
            start_times.append(unit_spike_times[0])
            end_times.append(unit_spike_times[-1])
            plots.append(
                RasterPlotItem(unit_id=str(unit_id), spike_times_sec=unit_spike_times)
            )
        view = RasterPlot(
            start_time_sec=min(start_times),
            end_time_sec=max(end_times),
            plots=plots,
        )
        if include_units_selector:
            columns: List[UnitsTableColumn] = [
                UnitsTableColumn(key="unitId", label="Unit", dtype="int"),
            ]
            rows: List[UnitsTableRow] = []
            for unit_id in id:
                rows.append(
                    UnitsTableRow(
                        unit_id=str(unit_id),
                        values={},
                    )
                )
            units_table = UnitsTable(
                columns=columns,
                rows=rows,
            )
            layout = Box(
                direction="horizontal",
                items=[
                    LayoutItem(view=units_table, max_size=150, title="Units"),
                    LayoutItem(view=view, title="Spike Amplitudes"),
                ],
            )
            return layout
        else:
            return view

    def _write_to_zarr_group(self, group: zarr.Group) -> None:
        """
        Args:
            group: Zarr group to write data into
        """
        # Set the view type
        group.attrs["view_type"] = "RasterPlot"

        # Store view parameters
        group.attrs["start_time_sec"] = self.start_time_sec
        group.attrs["end_time_sec"] = self.end_time_sec

        # Prepare unified data arrays
        unified_data = self._prepare_unified_data()

        if unified_data["total_spikes"] == 0:
            # Handle empty data case
            group.create_dataset("timestamps", data=np.array([], dtype=np.float32))
            group.create_dataset("unit_indices", data=np.array([], dtype=np.uint16))
            group.create_dataset("reference_times", data=np.array([], dtype=np.float32))
            group.create_dataset(
                "reference_indices", data=np.array([], dtype=np.uint32)
            )
            group.attrs["unit_ids"] = []
            group.attrs["total_spikes"] = 0
            return

        chunks = (
            (2_000_000,)
            if unified_data["total_spikes"] > 2_000_000
            else (len(unified_data["timestamps"]),)
        )
        # Store main data arrays
        group.create_dataset(
            "timestamps",
            data=unified_data["timestamps"],
            dtype=np.float32,
            chunks=chunks,
        )
        group.create_dataset(
            "unit_indices",
            data=unified_data["unit_indices"],
            dtype=np.uint16,
            chunks=chunks,
        )
        group.create_dataset(
            "reference_times",
            data=unified_data["reference_times"],
            dtype=np.float32,
            chunks=(len(unified_data["reference_times"]),),
        )
        group.create_dataset(
            "reference_indices",
            data=unified_data["reference_indices"],
            dtype=np.uint32,
            chunks=(len(unified_data["reference_indices"]),),
        )

        # Create spike counts array with 1-second bins
        duration = self.end_time_sec - self.start_time_sec
        num_bins = int(np.ceil(duration))
        num_units = len(self.plots)
        spike_counts = np.zeros((num_bins, num_units), dtype=np.uint16)

        # Efficiently compute spike counts for each unit
        for unit_idx, plot in enumerate(self.plots):
            # Convert spike times to bin indices
            bin_indices = (
                (np.array(plot.spike_times_sec) - self.start_time_sec)
            ).astype(int)
            # Count spikes in valid bins
            valid_indices = (bin_indices >= 0) & (bin_indices < num_bins)
            unique_bins, counts = np.unique(
                bin_indices[valid_indices], return_counts=True
            )
            spike_counts[unique_bins, unit_idx] = counts.clip(
                max=65535
            )  # Clip to uint16 max

        # Store spike counts array
        group.create_dataset(
            "spike_counts_1sec",
            data=spike_counts,
            dtype=np.uint16,
            chunks=(min(num_bins, 10000), min(num_units, 500)),
        )

        # Store unit ID mapping
        group.attrs["unit_ids"] = unified_data["unit_ids"]
        group.attrs["total_spikes"] = unified_data["total_spikes"]

    def _prepare_unified_data(self) -> dict:
        """
        Prepare unified data arrays from all plots

        Returns:
            Dictionary containing unified arrays and metadata
        """
        if not self.plots:
            return {
                "timestamps": np.array([], dtype=np.float32),
                "unit_indices": np.array([], dtype=np.uint16),
                "reference_times": np.array([], dtype=np.float32),
                "reference_indices": np.array([], dtype=np.uint32),
                "unit_ids": [],
                "total_spikes": 0,
            }

        # Create unit ID mapping
        unit_ids = [str(plot.unit_id) for plot in self.plots]
        unit_id_to_index = {unit_id: i for i, unit_id in enumerate(unit_ids)}

        # Collect all spikes with their unit indices
        all_spikes = []
        for plot in self.plots:
            unit_index = unit_id_to_index[str(plot.unit_id)]
            for time in plot.spike_times_sec:
                all_spikes.append((float(time), unit_index))

        if not all_spikes:
            return {
                "timestamps": np.array([], dtype=np.float32),
                "unit_indices": np.array([], dtype=np.uint16),
                "reference_times": np.array([], dtype=np.float32),
                "reference_indices": np.array([], dtype=np.uint32),
                "unit_ids": unit_ids,
                "total_spikes": 0,
            }

        # Sort by timestamp
        all_spikes.sort(key=lambda x: x[0])

        # Extract sorted arrays
        timestamps = np.array([spike[0] for spike in all_spikes], dtype=np.float32)
        unit_indices = np.array([spike[1] for spike in all_spikes], dtype=np.uint16)

        # Generate reference arrays
        reference_times, reference_indices = self._generate_reference_arrays(timestamps)

        return {
            "timestamps": timestamps,
            "unit_indices": unit_indices,
            "reference_times": reference_times,
            "reference_indices": reference_indices,
            "unit_ids": unit_ids,
            "total_spikes": len(all_spikes),
        }

    def _generate_reference_arrays(
        self, timestamps: np.ndarray, interval_sec: float = 1.0
    ) -> tuple:
        """
        Generate reference arrays using actual timestamps from the data

        Args:
            timestamps: Sorted array of timestamps
            interval_sec: Minimum interval between reference points

        Returns:
            Tuple of (reference_times, reference_indices)
        """
        if len(timestamps) == 0:
            return np.array([], dtype=np.float32), np.array([], dtype=np.uint32)

        reference_times = []
        reference_indices = []

        current_ref_time = timestamps[0]
        reference_times.append(current_ref_time)
        reference_indices.append(0)

        # Find the next reference point at least interval_sec later
        for i, timestamp in enumerate(timestamps):
            if timestamp >= current_ref_time + interval_sec:
                reference_times.append(timestamp)
                reference_indices.append(i)
                current_ref_time = timestamp

        return np.array(reference_times, dtype=np.float32), np.array(
            reference_indices, dtype=np.uint32
        )
