"""
Test based on si_cross_correlograms.py example but with only 3 units
"""

import pytest
import spikeinterface.extractors as se

import figpack.spike_sorting.views as ssv


def test_si_cross_correlograms():
    """Test cross correlograms with 3 units from toy example"""
    # Create toy data with only 3 units instead of 9
    recording, sorting = se.toy_example(
        num_units=3, duration=300, seed=0, num_segments=1
    )

    # Create the cross correlograms view
    view = ssv.CrossCorrelograms.from_sorting(sorting)

    # Basic assertions to verify the view was created correctly
    assert view is not None
    assert isinstance(view, ssv.CrossCorrelograms)

    # With 3 units, we should have 3 autocorrelograms + 3 cross-correlograms = 6 total
    # (unit0-unit0, unit1-unit1, unit2-unit2, unit0-unit1, unit0-unit2, unit1-unit2)
    assert len(view.cross_correlograms) == 6

    # Verify that all cross-correlogram items have the expected structure
    for item in view.cross_correlograms:
        assert hasattr(item, "unit_id1")
        assert hasattr(item, "unit_id2")
        assert hasattr(item, "bin_edges_sec")
        assert hasattr(item, "bin_counts")
        assert len(item.bin_edges_sec) > 0
        assert len(item.bin_counts) > 0
        # bin_counts should have one fewer element than bin_edges
        assert len(item.bin_counts) == len(item.bin_edges_sec) - 1


if __name__ == "__main__":
    # Allow running this test file directly
    test_si_cross_correlograms()
    print("Test passed!")
