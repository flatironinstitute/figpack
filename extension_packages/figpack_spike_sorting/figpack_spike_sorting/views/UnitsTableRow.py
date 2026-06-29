"""
UnitsTableRow for spike sorting views
"""

from typing import Any, Dict, Union


class UnitsTableRow:
    """
    Represents a row in a units table
    """

    def __init__(
        self,
        *,
        unit_id: Union[str, int],
        values: Dict[str, Any],
    ):
        """
        Initialize a UnitsTableRow

        Args:
            unit_id: Identifier for the unit
            values: Dictionary of column key to value mappings
        """
        self.unit_id = unit_id
        self.values = values

    def to_dict(self):
        """
        Convert the row to a dictionary representation
        """
        return {
            # Serialize the unit id as a string to stay consistent with how all
            # other spike-sorting views serialize unit ids (they use
            # str(unit_id)). The units table is the source of the shared unit
            # selection, so a mismatched id type here means selected units never
            # match the string-keyed data in the other views (cross-correlograms,
            # spike amplitudes, etc.) and those views appear empty.
            "unitId": str(self.unit_id),
            "values": self.values,
        }
