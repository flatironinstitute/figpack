"""
AverageWaveforms view for figpack - displays multiple average waveforms
"""

from typing import List, Union

import numpy as np

import figpack
from ..spike_sorting_extension import spike_sorting_extension


class UnitLocationsItem:
    def __init__(self, *, unit_id: Union[str, int], x: float, y: float):
        """
        Initialize a UnitLocationsItem

        Args:
            unit_id: Identifier for the unit
            x: X-coordinate of the unit location
            y: Y-coordinate of the unit location
        """
        self.unit_id = unit_id
        self.x = x
        self.y = y


class UnitLocations(figpack.ExtensionView):
    """
    A view that displays the locations of units in a 2D space
    """

    def __init__(
        self,
        *,
        units: List[UnitLocationsItem],
        channel_locations: dict,
        disable_auto_rotate: bool = False,
    ):
        """
        Initialize a UnitLocations view

        Args:
            units: List of UnitLocationsItem objects
            channel_locations: Dictionary mapping channel IDs to their locations
        """
        super().__init__(
            extension=spike_sorting_extension, view_type="spike_sorting.UnitLocations"
        )
        self.units = units
        self.channel_locations = channel_locations
        self.disable_auto_rotate = disable_auto_rotate

    def write_to_zarr_group(self, group: figpack.Group) -> None:
        """
        Write the UnitLocations data to a Zarr group

        Args:
            group: Zarr group to write data into
        """
        super().write_to_zarr_group(group)

        channel_locations = {}
        for channel_id, loc in self.channel_locations.items():
            channel_locations[str(channel_id)] = (
                loc.tolist() if isinstance(loc, np.ndarray) else loc
            )

        group.attrs["unit_ids"] = [str(unit.unit_id) for unit in self.units]
        group.attrs["channel_locations"] = channel_locations
        group.attrs["disable_auto_rotate"] = self.disable_auto_rotate

        x_coords = np.array([unit.x for unit in self.units], dtype=np.float32)
        y_coords = np.array([unit.y for unit in self.units], dtype=np.float32)

        coords = np.vstack((x_coords, y_coords)).T  # Shape (num_units, 2)

        group.create_dataset("coords", data=coords)
