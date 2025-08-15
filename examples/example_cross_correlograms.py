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
    view = example_cross_correlograms(sorting=sorting)
    title = "Example Cross Correlograms"
    description_md = """
# Example Cross Correlograms

This is an example of cross-correlograms created using figpack.
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


def example_cross_correlograms(
    *, sorting: si.BaseSorting, hide_unit_selector: bool = False, height=500
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
        height=height,
    )

    # Create cross-correlograms for the right side
    cross_correlogram_items: List[ssv.CrossCorrelogramItem] = []
    unit_ids = sorting.get_unit_ids()

    for i1, unit_id1 in enumerate(unit_ids):
        for i2, unit_id2 in enumerate(unit_ids):
            if abs(i2 - i1) > 5:
                # don't compute cross-correlograms for units that are too far apart
                continue
            if unit_id1 != unit_id2:
                a = compute_correlogram_data(
                    sorting=sorting,
                    unit_id1=unit_id1,
                    unit_id2=unit_id2,
                    window_size_msec=50,
                    bin_size_msec=1,
                )
            else:
                a = compute_correlogram_data(
                    sorting=sorting,
                    unit_id1=unit_id1,
                    unit_id2=None,
                    window_size_msec=50,
                    bin_size_msec=1,
                )
            bin_edges_sec = a["bin_edges_sec"]
            bin_counts = a["bin_counts"]
            cross_correlogram_items.append(
                ssv.CrossCorrelogramItem(
                    unit_id1=unit_id1,
                    unit_id2=unit_id2,
                    bin_edges_sec=bin_edges_sec,
                    bin_counts=bin_counts,
                )
            )

    cross_correlograms = ssv.CrossCorrelograms(
        cross_correlograms=cross_correlogram_items,
        hide_unit_selector=hide_unit_selector,
        height=height,
    )

    # Create splitter with units table on left (max width 300px) and cross-correlograms on right
    splitter = vv.Splitter(
        direction="horizontal",
        item1=vv.LayoutItem(view=units_table, max_size=300, title="Units"),
        item2=vv.LayoutItem(view=cross_correlograms, title="Cross Correlograms"),
        split_pos=0.25,  # 25% for the units table, 75% for cross-correlograms
    )

    return splitter


if __name__ == "__main__":
    main()
