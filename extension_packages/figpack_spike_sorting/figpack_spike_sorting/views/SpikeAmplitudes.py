"""
SpikeAmplitudes view for figpack - displays spike amplitudes over time
"""

from typing import List

import numpy as np

from .SpikeAmplitudesItem import SpikeAmplitudesItem
from .UnitsTable import UnitsTable, UnitsTableColumn, UnitsTableRow

import figpack
import figpack.views as fpv
from ..spike_sorting_extension import spike_sorting_extension


class SpikeAmplitudes(figpack.ExtensionView):
    """
    A view that displays spike amplitudes over time for multiple units
    """

    def __init__(
        self,
        *,
        start_time_sec: float,
        end_time_sec: float,
        plots: List[SpikeAmplitudesItem],
    ):
        """
        Initialize a SpikeAmplitudes view

        Args:
            start_time_sec: Start time of the view in seconds
            end_time_sec: End time of the view in seconds
            plots: List of SpikeAmplitudesItem objects
        """
        super().__init__(
            extension=spike_sorting_extension, view_type="spike_sorting.SpikeAmplitudes"
        )
        self.start_time_sec = start_time_sec
        self.end_time_sec = end_time_sec
        self.plots = plots

    @staticmethod
    def from_nwb_units_table(
        nwb_url_or_path_or_h5py,
        *,
        units_path: str,
        include_units_selector: bool = False,
    ):
        if isinstance(nwb_url_or_path_or_h5py, str):
            import lindi

            f = lindi.LindiH5pyFile.from_hdf5_file(nwb_url_or_path_or_h5py)
        else:
            f = nwb_url_or_path_or_h5py
        X = f[units_path]
        spike_amplitudes = X["spike_amplitudes"]
        # spike_amplitudes_index = X["spike_amplitudes_index"] # presumably the same as spike_times_index
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
            unit_spike_amplitudes = spike_amplitudes[start_index:end_index]
            unit_spike_times = spike_times[start_index:end_index]
            if len(unit_spike_times) == 0:
                continue
            start_times.append(unit_spike_times[0])
            end_times.append(unit_spike_times[-1])
            plots.append(
                SpikeAmplitudesItem(
                    unit_id=str(unit_id),
                    spike_times_sec=unit_spike_times,
                    spike_amplitudes=unit_spike_amplitudes,
                )
            )
        view = SpikeAmplitudes(
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
            layout = fpv.Box(
                direction="horizontal",
                items=[
                    fpv.LayoutItem(view=units_table, max_size=150, title="Units"),
                    fpv.LayoutItem(view=view, title="Spike Amplitudes"),
                ],
            )
            return layout
        else:
            return view

    def write_to_zarr_group(self, group: figpack.Group) -> None:
        """
        Write the SpikeAmplitudes data to a Zarr group using unified storage format

        Args:
            group: Zarr group to write data into
        """
        super().write_to_zarr_group(group)

        # Store view parameters
        group.attrs["start_time_sec"] = self.start_time_sec
        group.attrs["end_time_sec"] = self.end_time_sec

        # Prepare unified data arrays
        unified_data = self._prepare_unified_data()

        if unified_data["total_spikes"] == 0:
            # Handle empty data case
            group.create_dataset("timestamps", data=np.array([], dtype=np.float32))
            group.create_dataset("unit_indices", data=np.array([], dtype=np.uint16))
            group.create_dataset("amplitudes", data=np.array([], dtype=np.float32))
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
            chunks=chunks,
        )
        group.create_dataset(
            "unit_indices",
            data=unified_data["unit_indices"],
            chunks=chunks,
        )
        group.create_dataset(
            "amplitudes",
            data=unified_data["amplitudes"],
            chunks=chunks,
        )
        group.create_dataset(
            "reference_times",
            data=unified_data["reference_times"],
            chunks=(len(unified_data["reference_times"]),),
        )
        group.create_dataset(
            "reference_indices",
            data=unified_data["reference_indices"],
            chunks=(len(unified_data["reference_indices"]),),
        )

        # Store unit ID mapping
        group.attrs["unit_ids"] = unified_data["unit_ids"]
        group.attrs["total_spikes"] = unified_data["total_spikes"]

        # Create subsampled data
        subsampled_data = self._create_subsampled_data(
            unified_data["timestamps"],
            unified_data["unit_indices"],
            unified_data["amplitudes"],
        )

        if subsampled_data:
            subsampled_group = group.create_group("subsampled_data")
            for factor_name, data in subsampled_data.items():
                chunks = (
                    (2_000_000,)
                    if len(data["timestamps"]) > 2_000_000
                    else (len(data["timestamps"]),)
                )
                factor_group = subsampled_group.create_group(factor_name)
                factor_group.create_dataset(
                    "timestamps",
                    data=data["timestamps"],
                    chunks=chunks,
                )
                factor_group.create_dataset(
                    "unit_indices",
                    data=data["unit_indices"],
                    chunks=chunks,
                )
                factor_group.create_dataset(
                    "amplitudes",
                    data=data["amplitudes"],
                    chunks=chunks,
                )
                factor_group.create_dataset(
                    "reference_times",
                    data=data["reference_times"],
                    chunks=(len(data["reference_times"]),),
                )
                factor_group.create_dataset(
                    "reference_indices",
                    data=data["reference_indices"],
                    chunks=(len(data["reference_indices"]),),
                )

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
                "amplitudes": np.array([], dtype=np.float32),
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
            for time, amplitude in zip(plot.spike_times_sec, plot.spike_amplitudes):
                all_spikes.append((float(time), unit_index, float(amplitude)))

        if not all_spikes:
            return {
                "timestamps": np.array([], dtype=np.float32),
                "unit_indices": np.array([], dtype=np.uint16),
                "amplitudes": np.array([], dtype=np.float32),
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
        amplitudes = np.array([spike[2] for spike in all_spikes], dtype=np.float32)

        # Generate reference arrays
        reference_times, reference_indices = self._generate_reference_arrays(timestamps)

        return {
            "timestamps": timestamps,
            "unit_indices": unit_indices,
            "amplitudes": amplitudes,
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

    def _create_subsampled_data(
        self, timestamps: np.ndarray, unit_indices: np.ndarray, amplitudes: np.ndarray
    ) -> dict:
        """
        Create subsampled data with geometric progression factors

        Args:
            timestamps: Original timestamps array
            unit_indices: Original unit indices array
            amplitudes: Original amplitudes array

        Returns:
            Dictionary of subsampled data by factor
        """
        subsampled_data = {}
        factor = 4
        current_timestamps = timestamps
        current_unit_indices = unit_indices
        current_amplitudes = amplitudes

        while len(current_timestamps) >= 500000:
            # Create subsampled version by taking every Nth spike
            subsampled_indices = np.arange(0, len(current_timestamps), factor)
            subsampled_timestamps = current_timestamps[subsampled_indices]
            subsampled_unit_indices = current_unit_indices[subsampled_indices]
            subsampled_amplitudes = current_amplitudes[subsampled_indices]

            # Generate reference arrays for this subsampled level
            ref_times, ref_indices = self._generate_reference_arrays(
                subsampled_timestamps
            )

            subsampled_data[f"factor_{factor}"] = {
                "timestamps": subsampled_timestamps,
                "unit_indices": subsampled_unit_indices,
                "amplitudes": subsampled_amplitudes,
                "reference_times": ref_times,
                "reference_indices": ref_indices,
            }

            # Prepare for next iteration
            current_timestamps = subsampled_timestamps
            current_unit_indices = subsampled_unit_indices
            current_amplitudes = subsampled_amplitudes
            factor *= 4  # Geometric progression: 4, 16, 64, 256, ...

        return subsampled_data
