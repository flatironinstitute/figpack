"""
Example demonstrating the UnitSimilarityMatrix view
"""

from typing import List
from figpack_spike_sorting.views import UnitSimilarityMatrix, UnitSimilarityScore


def main():
    # Create a list of unit IDs
    unit_ids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

    # Create similarity scores between all pairs of units
    # Using a fake similarity function for demonstration
    similarity_scores: List[UnitSimilarityScore] = []
    for u1 in unit_ids:
        for u2 in unit_ids:
            # Fake similarity score for testing
            similarity = 1 - abs(u1 - u2) / (u1 + u2 + 1)
            similarity_scores.append(
                UnitSimilarityScore(unit_id1=u1, unit_id2=u2, similarity=similarity)
            )

    # Create the view
    view = UnitSimilarityMatrix(
        unit_ids=unit_ids,
        similarity_scores=similarity_scores,
        range=(0, 1),  # Optional: specify the color scale range
    )

    # Show the view
    view.show(title="Unit Similarity Matrix Example", open_in_browser=True)


if __name__ == "__main__":
    main()
