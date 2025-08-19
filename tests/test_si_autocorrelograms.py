"""
Test based on si_autocorrelograms.py example but with only 3 units
"""

import pytest
import spikeinterface.extractors as se

import figpack.spike_sorting.views as ssv


def test_si_autocorrelograms():
    """Test autocorrelograms with 3 units from toy example"""
    # Create toy data with only 3 units instead of 9
    recording, sorting = se.toy_example(
        num_units=3, duration=300, seed=0, num_segments=1
    )

    # Create the autocorrelograms view
    view = ssv.Autocorrelograms.from_sorting(sorting)

    # Basic assertions to verify the view was created correctly
    assert view is not None
    assert isinstance(view, ssv.Autocorrelograms)

    # With 3 units, we should have 3 autocorrelograms (one for each unit)
    assert len(view.autocorrelograms) == 3

    # Verify that all autocorrelogram items have the expected structure
    for item in view.autocorrelograms:
        assert hasattr(item, "unit_id")
        assert hasattr(item, "bin_edges_sec")
        assert hasattr(item, "bin_counts")
        assert len(item.bin_edges_sec) > 0
        assert len(item.bin_counts) > 0
        # bin_counts should have one fewer element than bin_edges
        assert len(item.bin_counts) == len(item.bin_edges_sec) - 1

    # Verify that we have autocorrelograms for the expected unit IDs
    unit_ids = [item.unit_id for item in view.autocorrelograms]
    expected_unit_ids = ["0", "1", "2"]  # unit IDs are converted to strings
    assert sorted(unit_ids) == sorted(expected_unit_ids)

    # Verify that each autocorrelogram has reasonable data
    for item in view.autocorrelograms:
        # Bin edges should be symmetric around 0 for autocorrelograms
        assert item.bin_edges_sec[0] < 0
        assert item.bin_edges_sec[-1] > 0

        # Bin counts should be non-negative integers
        assert all(count >= 0 for count in item.bin_counts)
        assert item.bin_counts.dtype == "int32"

        # Bin edges should be float32
        assert item.bin_edges_sec.dtype == "float32"


if __name__ == "__main__":
    # Allow running this test file directly
    test_si_autocorrelograms()
    print("Test passed!")
