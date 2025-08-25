import os
from typing import List
import numpy as np
import spikeinterface as si
import spikeinterface.extractors as se
import figpack.spike_sorting.views as ssv


def main():
    recording, sorting = se.toy_example(
        num_units=18, duration=300, seed=0, num_segments=1
    )
    view = example_units_table(recording=recording, sorting=sorting)
    title = "Example Units Table"
    description_md = """
# Example Units Table

This is an example of a units table created using figpack.
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


def example_units_table(
    *, recording: si.BaseRecording, sorting: si.BaseSorting, height=600
):
    columns: List[ssv.UnitsTableColumn] = [
        ssv.UnitsTableColumn(key="unitId", label="Unit", dtype="int"),
        ssv.UnitsTableColumn(key="numEvents", label="Num. events", dtype="int"),
        ssv.UnitsTableColumn(
            key="firingRateHz", label="Firing rate (Hz)", dtype="float"
        ),
    ]
    rows: List[ssv.UnitsTableRow] = []
    for unit_id in sorting.get_unit_ids():
        spike_train = sorting.get_unit_spike_train(unit_id=unit_id)
        rows.append(
            ssv.UnitsTableRow(
                unit_id=unit_id,
                values={
                    "unitId": unit_id,
                    "numEvents": len(spike_train),
                    "firingRateHz": len(spike_train)
                    / (recording.get_num_frames() / recording.get_sampling_frequency()),
                },
            )
        )
    dummy_similarity_scores: List[ssv.UnitSimilarityScore] = []
    for id1 in sorting.get_unit_ids():
        for id2 in sorting.get_unit_ids():
            if id2 != id1:
                if np.random.random() < 0.5:
                    dummy_similarity_scores.append(
                        ssv.UnitSimilarityScore(
                            unit_id1=id1, unit_id2=id2, similarity=np.random.random()
                        )
                    )
    view = ssv.UnitsTable(
        columns=columns,
        rows=rows,
        similarity_scores=dummy_similarity_scores,
        height=height,
    )
    return view


if __name__ == "__main__":
    main()
