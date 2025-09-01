import os
import numpy as np
from typing import List
import figpack.spike_sorting.views as ssv
import spikeinterface as si
import spikeinterface.extractors as se


def main():
    recording, sorting = se.toy_example(
        num_units=12, duration=300, seed=0, num_segments=1
    )
    assert isinstance(recording, si.BaseRecording)

    view = example_spike_amplitudes(recording=recording, sorting=sorting)

    title = "Example Spike Amplitudes"
    description_md = """
# Example Spike Amplitudes

This is an example of spike amplitudes created using figpack.
"""

    view.show(
        open_in_browser=True,
        title=title,
        description=description_md,
    )


def example_spike_amplitudes(
    *,
    recording: si.BaseRecording,
    sorting: si.BaseSorting,
):
    rng = np.random.default_rng(2022)
    plot_items: List[ssv.SpikeAmplitudesItem] = []
    for unit_id in sorting.get_unit_ids():
        spike_times_sec = (
            np.array(sorting.get_unit_spike_train(segment_index=0, unit_id=unit_id))
            / sorting.get_sampling_frequency()
        )
        plot_items.append(
            ssv.SpikeAmplitudesItem(
                unit_id=unit_id,
                spike_times_sec=spike_times_sec.astype(np.float32),
                spike_amplitudes=rng.uniform(0, 5)
                + rng.normal(0, 0.2, spike_times_sec.shape).astype(
                    np.float32
                ),  # fake amplitudes
            )
        )

    view = ssv.SpikeAmplitudes(
        start_time_sec=0,
        end_time_sec=recording.get_num_frames(segment_index=0)
        / recording.get_sampling_frequency(),
        plots=plot_items,
    )
    return view


if __name__ == "__main__":
    main()
