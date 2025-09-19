"""
UnitMetricsGraph view for figpack - displays unit metrics in a graph format
"""

from typing import List, Optional, Union, Dict
import json

import numpy as np

import figpack
from ..spike_sorting_extension import spike_sorting_extension


class UnitMetricsGraphMetric:
    """
    Defines a metric with key, label, and data type
    """

    def __init__(
        self,
        *,
        key: str,
        label: str,
        dtype: str,
    ):
        """
        Initialize a UnitMetricsGraphMetric

        Args:
            key: Unique identifier for the metric
            label: Human-readable label for display
            dtype: Data type of the metric ("int", "float", etc.)
        """
        self.key = key
        self.label = label
        self.dtype = dtype

    def to_dict(self) -> Dict:
        """Convert to dictionary for serialization"""
        return {
            "key": self.key,
            "label": self.label,
            "dtype": self.dtype,
        }


class UnitMetricsGraphUnit:
    """
    Represents a unit with its metric values
    """

    def __init__(
        self,
        *,
        unit_id: Union[str, int],
        values: Dict[str, Union[int, float]],
    ):
        """
        Initialize a UnitMetricsGraphUnit

        Args:
            unit_id: Identifier for the unit
            values: Dictionary mapping metric keys to their values
        """
        self.unit_id = unit_id
        self.values = values

    def to_dict(self) -> Dict:
        """Convert to dictionary for serialization"""
        return {
            "unit_id": str(self.unit_id),
            "values": self.values,
        }


class UnitMetricsGraph(figpack.ExtensionView):
    """
    A view that displays unit metrics in a graph format
    """

    def __init__(
        self,
        *,
        units: List[UnitMetricsGraphUnit],
        metrics: List[UnitMetricsGraphMetric],
        height: Optional[int] = None,
    ):
        """
        Initialize a UnitMetricsGraph view

        Args:
            units: List of UnitMetricsGraphUnit objects containing the data
            metrics: List of UnitMetricsGraphMetric objects defining the metrics
            height: Height of the view in pixels
        """
        super().__init__(
            extension=spike_sorting_extension,
            view_type="spike_sorting.UnitMetricsGraph",
        )
        self.units = units
        self.metrics = metrics
        self.height = height

    def write_to_zarr_group(self, group: figpack.Group) -> None:
        """
        Write the UnitMetricsGraph data to a Zarr group

        Args:
            group: Zarr group to write data into
        """
        super().write_to_zarr_group(group)

        # Set view properties
        if self.height is not None:
            group.attrs["height"] = self.height

        # Store metrics metadata
        metrics_metadata = [metric.to_dict() for metric in self.metrics]
        group.attrs["metrics"] = metrics_metadata

        # Store units data in a zarr array
        units_data = [unit.to_dict() for unit in self.units]
        units_json = json.dumps(units_data).encode("utf-8")
        units_array = np.frombuffer(units_json, dtype=np.uint8)
        group.create_dataset(
            "units_data",
            data=units_array,
        )
        group.attrs["units_data_size"] = len(units_json)
