import os
from typing import List

import spikeinterface as si
import spikeinterface.extractors as se

import figpack.spike_sorting.views as ssv

from helpers.compute_correlogram_data import compute_correlogram_data


def main():
    _, sorting = se.toy_example(num_units=18, duration=300, seed=0, num_segments=1)
    view = example_autocorrelograms(sorting=sorting)
    title = "Example Autocorrelograms"
    description_md = """
# Example Autocorrelograms

This is an example of autocorrelograms created using figpack.
"""

    upload = os.environ.get("FIGPACK_UPLOAD") == "1"
    _dev = os.environ.get("FIGPACK_DEV") == "1"
    view.show(
        open_in_browser=True,
        upload=upload,
        _dev=_dev,
        title=title,
        description=description_md,
    )


def example_autocorrelograms(
    *, sorting: si.BaseSorting, height=400
) -> ssv.Autocorrelograms:
    autocorrelogram_items: List[ssv.AutocorrelogramItem] = []
    for unit_id in sorting.get_unit_ids():
        a = compute_correlogram_data(
            sorting=sorting,
            unit_id1=unit_id,
            unit_id2=None,
            window_size_msec=50,
            bin_size_msec=1,
        )
        bin_edges_sec = a["bin_edges_sec"]
        bin_counts = a["bin_counts"]
        autocorrelogram_items.append(
            ssv.AutocorrelogramItem(
                unit_id=unit_id, bin_edges_sec=bin_edges_sec, bin_counts=bin_counts
            )
        )
    view = ssv.Autocorrelograms(autocorrelograms=autocorrelogram_items, height=height)
    return view


if __name__ == "__main__":
    main()
