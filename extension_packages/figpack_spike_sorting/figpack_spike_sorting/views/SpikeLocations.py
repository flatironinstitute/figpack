"""
SpikeLocations view for figpack - displays spike locations in 2D space
"""

from typing import Dict, List, Optional, Tuple, Union

import numpy as np
import figpack
from ..spike_sorting_extension import spike_sorting_extension


class SpikeLocationsItem:
    """
    Represents spike locations for a single unit
    """

    def __init__(
        self,
        *,
        unit_id: Union[str, int],
        spike_times_sec: np.ndarray,
        x_locations: np.ndarray,
        y_locations: np.ndarray,
    ):
        """
        Initialize a SpikeLocationsItem

        Args:
            unit_id: Identifier for the unit
            spike_times_sec: Array of spike times in seconds
            x_locations: Array of x coordinates for each spike
            y_locations: Array of y coordinates for each spike
        """
        self.unit_id = unit_id
        self.spike_times_sec = np.array(spike_times_sec, dtype=np.float32)
        self.x_locations = np.array(x_locations, dtype=np.float32)
        self.y_locations = np.array(y_locations, dtype=np.float32)

        # Validate that all arrays have the same length
        if not (
            len(self.spike_times_sec) == len(self.x_locations) == len(self.y_locations)
        ):
            raise ValueError(
                "spike_times_sec, x_locations, and y_locations must have the same length"
            )


class SpikeLocations(figpack.ExtensionView):
    """
    A view that displays spike locations in 2D space
    """

    def __init__(
        self,
        *,
        units: List[SpikeLocationsItem],
        x_range: Tuple[float, float],
        y_range: Tuple[float, float],
        channel_locations: Optional[Dict[str, np.ndarray]] = None,
        hide_unit_selector: bool = False,
        disable_auto_rotate: bool = False,
    ):
        """
        Initialize a SpikeLocations view

        Args:
            units: List of SpikeLocationsItem objects
            x_range: Tuple specifying the x-axis range (min, max)
            y_range: Tuple specifying the y-axis range (min, max)
            channel_locations: Optional dictionary mapping channel IDs to (x, y) coordinates
            hide_unit_selector: Whether to hide the unit selector
            disable_auto_rotate: Whether to disable automatic rotation of the view
        """
        super().__init__(
            extension=spike_sorting_extension,
            view_type="spike_sorting.SpikeLocations",
        )
        self.units = units
        self.x_range = x_range
        self.y_range = y_range
        self.channel_locations = channel_locations
        self.hide_unit_selector = hide_unit_selector
        self.disable_auto_rotate = disable_auto_rotate

    def write_to_zarr_group(self, group: figpack.Group) -> None:
        """
        Write the SpikeLocations data to a Zarr group

        Args:
            group: Zarr group to write data into
        """
        super().write_to_zarr_group(group)

        # Store metadata
        group.attrs["x_range"] = list(self.x_range)
        group.attrs["y_range"] = list(self.y_range)

        if self.hide_unit_selector:
            group.attrs["hide_unit_selector"] = True

        if self.disable_auto_rotate:
            group.attrs["disable_auto_rotate"] = True

        # Store channel locations if provided
        if self.channel_locations is not None:
            channel_locations_dict = {}
            for ch_id, loc in self.channel_locations.items():
                channel_locations_dict[str(ch_id)] = [float(a) for a in loc]
            group.attrs["channel_locations"] = channel_locations_dict

        # Store unit data
        unit_metadata = []
        for i, unit_item in enumerate(self.units):
            unit_name = f"unit_{i}"

            # Store metadata
            metadata = {
                "name": unit_name,
                "unit_id": str(unit_item.unit_id),
            }
            unit_metadata.append(metadata)

            # Create datasets for this unit
            group.create_dataset(
                f"{unit_name}/spike_times_sec",
                data=unit_item.spike_times_sec,
            )
            group.create_dataset(
                f"{unit_name}/x_locations",
                data=unit_item.x_locations,
            )
            group.create_dataset(
                f"{unit_name}/y_locations",
                data=unit_item.y_locations,
            )

        # Store the unit metadata
        group.attrs["units"] = unit_metadata
