from typing import List
import numpy as np

import spikeinterface as si

import figpack_spike_sorting.views as ssv


def main():
    recording, sorting = si.generate_ground_truth_recording(
        durations=[120],
        num_units=10,
        seed=0,
        num_channels=8,
        noise_kwargs={"noise_levels": 50},
    )
    view = example_unit_locations(recording=recording, sorting=sorting)
    title = "Example Unit Locations"
    description_md = """
# Example Unit Locations

This is an example of unit locations created using figpack.
"""

    view.show(
        open_in_browser=True,
        title=title,
        description=description_md,
    )


def example_unit_locations(*, recording: si.BaseRecording, sorting: si.BaseSorting):
    channel_locations = recording.get_channel_locations()
    xmin = np.min(channel_locations[:, 0])
    xmax = np.max(channel_locations[:, 0])
    if xmax <= xmin:
        xmax = xmin + 1
    ymin = np.min(channel_locations[:, 1])
    ymax = np.max(channel_locations[:, 1])
    if ymax <= ymin:
        ymax = ymin + 1
    # noise_level = estimate_noise_level(recording)
    unit_ids = sorting.get_unit_ids()
    unit_items: List[ssv.UnitLocationsItem] = []
    for ii, unit_id in enumerate(unit_ids):
        unit_items.append(
            ssv.UnitLocationsItem(
                unit_id=unit_id,
                x=float(xmin + ((ii + 0.5) / len(unit_ids)) * (xmax - xmin)),
                y=float(
                    ymin + ((ii + 0.5) / len(unit_ids)) * (ymax - ymin)
                ),  # fake location
            )
        )
    channel_locations = {}
    for ii, channel_id in enumerate(recording.channel_ids):
        channel_locations[str(channel_id)] = recording.get_channel_locations()[
            ii, :
        ].astype(np.float32)
    view = ssv.UnitLocations(
        units=unit_items, channel_locations=channel_locations, disable_auto_rotate=True
    )
    return view


if __name__ == "__main__":
    main()
