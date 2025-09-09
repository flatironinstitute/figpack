"""
UnitsTableColumn for spike sorting views
"""

from typing import Literal


class UnitsTableColumn:
    """
    Represents a column in a units table
    """

    def __init__(
        self,
        *,
        key: str,
        label: str,
        dtype: Literal["int", "float", "str", "bool"],
    ):
        """
        Initialize a UnitsTableColumn

        Args:
            key: The key used to access values in the row data
            label: Display label for the column
            dtype: Data type of the column values
        """
        self.key = key
        self.label = label
        self.dtype = dtype

    def to_dict(self):
        """
        Convert the column to a dictionary representation
        """
        return {
            "key": self.key,
            "label": self.label,
            "dtype": self.dtype,
        }
