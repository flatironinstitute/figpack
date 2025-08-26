import os
from typing import List

import spikeinterface as si
import spikeinterface.extractors as se

import figpack.spike_sorting.views as ssv
import figpack.views as vv

from helpers.compute_correlogram_data import compute_correlogram_data


def main():
    recording, sorting = se.toy_example(
        num_units=18, duration=300, seed=0, num_segments=1
    )
    view = example_autocorrelograms(recording=recording, sorting=sorting)
    title = "Example Autocorrelograms"
    description_md = """
# Example Autocorrelograms

This is an example of autocorrelograms created using figpack.
"""

    view.show(
        open_in_browser=True,
        title=title,
        description=description_md,
    )


def example_autocorrelograms(
    *, recording: si.BaseRecording, sorting: si.BaseSorting
) -> vv.Splitter:
    # Create a simple units table for the left side
    columns: List[ssv.UnitsTableColumn] = [
        ssv.UnitsTableColumn(key="unitId", label="Unit", dtype="int"),
    ]
    rows: List[ssv.UnitsTableRow] = []
    for unit_id in sorting.get_unit_ids():
        rows.append(
            ssv.UnitsTableRow(
                unit_id=unit_id,
                values={
                    "unitId": unit_id,
                },
            )
        )

    units_table = ssv.UnitsTable(
        columns=columns,
        rows=rows,
    )

    # Create autocorrelograms for the right side
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
    autocorrelograms = ssv.Autocorrelograms(autocorrelograms=autocorrelogram_items)

    # Create splitter with units table on left (max width 300px) and autocorrelograms on right
    splitter = vv.Splitter(
        direction="horizontal",
        item1=vv.LayoutItem(view=units_table, max_size=300, title="Units"),
        item2=vv.LayoutItem(view=autocorrelograms, title="Autocorrelograms"),
        split_pos=0.25,  # 25% for the units table, 75% for autocorrelograms
    )

    return splitter


if __name__ == "__main__":
    main()
