import os
from typing import List

import spikeinterface as si
import spikeinterface.extractors as se
import spikeinterface.widgets as sw

import figpack.spike_sorting.views as ssv
import figpack.views as vv


def main():
    recording, sorting = si.generate_ground_truth_recording(
        durations=[120],
        num_units=10,
        seed=0,
        num_channels=8,
        noise_kwargs={"noise_levels": 50},
    )
    sorting_analyzer = si.create_sorting_analyzer(sorting=sorting, recording=recording)
    view = example_average_waveforms(sorting_analyzer=sorting_analyzer)
    title = "Example Average Waveforms"
    description_md = """
# Example Average Waveforms

This is an example of average waveforms created using figpack.
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


def example_average_waveforms(
    *,
    sorting_analyzer: si.SortingAnalyzer,
) -> vv.Splitter:
    view = ssv.AverageWaveforms.from_sorting_analyzer(sorting_analyzer)
    return view


if __name__ == "__main__":
    main()
