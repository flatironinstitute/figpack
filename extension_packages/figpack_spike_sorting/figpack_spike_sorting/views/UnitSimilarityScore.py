"""
UnitSimilarityScore for spike sorting views
"""

from typing import Union


class UnitSimilarityScore:
    """
    Represents a similarity score between two units
    """

    def __init__(
        self,
        *,
        unit_id1: Union[str, int],
        unit_id2: Union[str, int],
        similarity: float,
    ):
        """
        Initialize a UnitSimilarityScore

        Args:
            unit_id1: Identifier for the first unit
            unit_id2: Identifier for the second unit
            similarity: Similarity score between the units (typically 0-1)
        """
        self.unit_id1 = unit_id1
        self.unit_id2 = unit_id2
        self.similarity = similarity

    def to_dict(self):
        """
        Convert the similarity score to a dictionary representation
        """
        return {
            "unitId1": self.unit_id1,
            "unitId2": self.unit_id2,
            "similarity": self.similarity,
        }
