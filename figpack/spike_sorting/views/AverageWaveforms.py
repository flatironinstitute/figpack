"""
AverageWaveforms view for figpack - displays multiple average waveforms
"""

from typing import List, Optional, Union

import numpy as np
import zarr

from ...core.figpack_view import FigpackView


class AverageWaveformItem:
    """
    Represents a single average waveform for a unit
    """

    def __init__(
        self,
        *,
        unit_id: Union[str, int],
        channel_ids: List[Union[str, int]],
        waveform: np.ndarray,
        waveform_std_dev: Optional[np.ndarray] = None,
        waveform_percentiles: Optional[List[np.ndarray]] = None,
    ):
        """
        Initialize an AverageWaveformItem

        Args:
            unit_id: Identifier for the unit
            channel_ids: List of channel identifiers
            waveform: 2D numpy array representing the average waveform (num_samples x num_channels)
            waveform_std_dev: Optional 2D numpy array representing the standard deviation of the waveform
            waveform_percentiles: Optional list of 2D numpy arrays representing percentiles of the waveform
        """
        self.unit_id = unit_id
        self.channel_ids = channel_ids
        self.waveform = np.array(waveform, dtype=np.float32)
        self.waveform_std_dev = (
            np.array(waveform_std_dev, dtype=np.float32)
            if waveform_std_dev is not None
            else None
        )
        if waveform_percentiles is not None:
            self.waveform_percentiles = [
                np.array(p, dtype=np.float32) for p in waveform_percentiles
            ]
        else:
            self.waveform_percentiles = None


class AverageWaveforms(FigpackView):
    """
    A view that displays multiple average waveforms for spike sorting analysis
    """

    def __init__(self, *, average_waveforms: List[AverageWaveformItem]):
        """
        Initialize an AverageWaveforms view

        Args:
            average_waveforms: List of AverageWaveformItem objects
        """
        self.average_waveforms = average_waveforms

    @staticmethod
    def from_sorting_analyzer(sorting_analyzer):
        sorting_analyzer.compute(
            ["random_spikes", "waveforms", "templates", "noise_levels"]
        )
        ext_templates = sorting_analyzer.get_extension("templates")
        # shape is num_units, num_samples, num_channels
        av_templates = ext_templates.get_data(operator="average")

        ext_noise_levels = sorting_analyzer.get_extension("noise_levels")
        noise_levels = ext_noise_levels.get_data()

        waveform_std_dev = np.zeros(
            (av_templates.shape[1], av_templates.shape[2]), dtype=np.float32
        )
        for i in range(av_templates.shape[2]):
            waveform_std_dev[:, i] = noise_levels[i]

        average_waveform_items = []
        for i, unit_id in enumerate(sorting_analyzer.unit_ids):
            waveform = av_templates[i]
            channel_ids = list(sorting_analyzer.recording.get_channel_ids())
            average_waveform_items.append(
                AverageWaveformItem(
                    unit_id=unit_id,
                    waveform=waveform,
                    channel_ids=channel_ids,
                    waveform_std_dev=waveform_std_dev,
                )
            )
        view = AverageWaveforms(average_waveforms=average_waveform_items)
        return view

    def _write_to_zarr_group(self, group: zarr.Group) -> None:
        """
        Write the AverageWaveforms data to a Zarr group

        Args:
            group: Zarr group to write data into
        """
        # Set the view type
        group.attrs["view_type"] = "AverageWaveforms"

        # Store the number of average waveforms
        group.attrs["num_average_waveforms"] = len(self.average_waveforms)

        # Store metadata for each average waveform
        average_waveform_metadata = []
        for i, waveform in enumerate(self.average_waveforms):
            waveform_name = f"waveform_{i}"

            # Store metadata
            metadata = {
                "name": waveform_name,
                "unit_id": str(waveform.unit_id),
                "channel_ids": [str(ch) for ch in waveform.channel_ids],
            }
            average_waveform_metadata.append(metadata)

            # Create arrays for this average waveform
            group.create_dataset(
                f"{waveform_name}/waveform",
                data=waveform.waveform,
                dtype=waveform.waveform.dtype,
            )
            if waveform.waveform_std_dev is not None:
                group.create_dataset(
                    f"{waveform_name}/waveform_std_dev",
                    data=waveform.waveform_std_dev,
                    dtype=waveform.waveform_std_dev.dtype,
                )
            if waveform.waveform_percentiles is not None:
                for j, p in enumerate(waveform.waveform_percentiles):
                    group.create_dataset(
                        f"{waveform_name}/waveform_percentile_{j}",
                        data=p,
                        dtype=p.dtype,
                    )

        # Store the average waveform metadata
        group.attrs["average_waveforms"] = average_waveform_metadata
