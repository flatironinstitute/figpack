import os
from typing import List

import numpy as np

import spikeinterface as si
import spikeinterface.extractors as se

import figpack_spike_sorting.views as ssv


def main():
    recording, sorting = se.toy_example(
        num_units=18, duration=300, seed=0, num_segments=1
    )
    assert isinstance(recording, si.BaseRecording)

    view = example_raster_plot(recording=recording, sorting=sorting)
    title = "Example Raster Plot"
    description_md = """
# Example Raster Plot

This is an example of a raster plot created using figpack.
"""

    view.show(
        open_in_browser=True,
        title=title,
        description=description_md,
    )


def example_raster_plot(*, recording: si.BaseRecording, sorting: si.BaseSorting):
    plot_items: List[ssv.RasterPlotItem] = []
    for unit_id in sorting.get_unit_ids():
        spike_times_sec = (
            np.array(sorting.get_unit_spike_train(segment_index=0, unit_id=unit_id))
            / sorting.get_sampling_frequency()
        )
        plot_items.append(
            ssv.RasterPlotItem(
                unit_id=unit_id, spike_times_sec=spike_times_sec.astype(np.float32)
            )
        )

    view = ssv.RasterPlot(
        start_time_sec=0,
        end_time_sec=recording.get_num_frames(segment_index=0)
        / recording.get_sampling_frequency(),
        plots=plot_items,
    )
    return view


if __name__ == "__main__":
    main()
