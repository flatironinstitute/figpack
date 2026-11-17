"""
Stacked multi-channel traces where individual channels can be hidden in the viewer
"""

from typing import List, Optional, Union

import numpy as np

import figpack
from figpack.core._figure_spec import SpecProp, SpecSchema
from figpack.views import MultiChannelTimeseries
from .experimental_extension import experimental_extension


class StackedTraces(figpack.ExtensionView):
    """
    Multi-channel traces stacked vertically. The viewer handles the vertical
    offsets, so channels can be hidden (from the channel list opened in the
    toolbar) and the remaining ones are restacked to fill the height.
    """

    spec_schema = SpecSchema(
        view_type="experimental.StackedTraces",
        description="Multi-channel signal stacked vertically; channels can be hidden and shown in the viewer.",
        props=[
            SpecProp(
                "hide_nav_toolbar",
                "boolean",
                "Hide the navigation toolbar below the plot.",
            ),
        ],
    )

    def __init__(
        self,
        *,
        start_time_sec: float,
        sampling_frequency_hz: float,
        data: np.ndarray,
        channel_ids: Optional[List[Union[str, int]]] = None,
        channel_colors: Optional[List[str]] = None,
        hide_nav_toolbar: bool = False,
    ):
        """
        Args:
            start_time_sec: Starting time in seconds
            sampling_frequency_hz: Sampling rate in Hz
            data: N×M array (timepoints × channels). Do not add vertical
                offsets; the viewer stacks the channels. Channel 0 is drawn
                at the bottom.
            channel_ids: Optional channel names (shown on hover and as labels)
            channel_colors: Optional CSS color per channel
            hide_nav_toolbar: Whether to hide the navigation toolbar. This
                also hides the button that opens the channel list.
        """
        super().__init__(
            extension=experimental_extension,
            view_type="experimental.StackedTraces",
        )
        # Reuse the core view for validation, downsampling and storage
        self._mct = MultiChannelTimeseries(
            start_time_sec=start_time_sec,
            sampling_frequency_hz=sampling_frequency_hz,
            data=data,
            channel_ids=channel_ids,
            y_label="",
            hide_nav_toolbar=hide_nav_toolbar,
        )
        n_channels = data.shape[1]
        if channel_colors is not None:
            assert len(channel_colors) == n_channels, (
                f"Number of channel_colors ({len(channel_colors)}) must match "
                f"number of channels ({n_channels})"
            )
            channel_colors = [str(c) for c in channel_colors]
        self.channel_colors = channel_colors

    def write_to_zarr_group(self, group: figpack.Group) -> None:
        self._mct.write_to_zarr_group(group)
        # Overwrite view_type and add the extension info
        super().write_to_zarr_group(group)
        if self.channel_colors is not None:
            group.attrs["channel_colors"] = self.channel_colors
