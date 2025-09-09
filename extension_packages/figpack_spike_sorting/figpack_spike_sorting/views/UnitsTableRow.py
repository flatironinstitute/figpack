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
            "unitId": self.unit_id,
            "values": self.values,
        }
