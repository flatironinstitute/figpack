"""
Example demonstrating the SpikeLocations view
"""

from typing import List
import numpy as np
import spikeinterface as si
import spikeinterface.extractors as se
from figpack_spike_sorting.views import SpikeLocations, SpikeLocationsItem


def main():
    # Generate synthetic spike data
    recording, sorting = se.toy_example(
        num_units=12, num_channels=10, duration=300, seed=0
    )

    # Get channel locations for the probe
    channel_locations = recording.get_channel_locations().astype(np.float32)
    xmin = np.min(channel_locations[:, 0])
    xmax = np.max(channel_locations[:, 0])
    ymin = np.min(channel_locations[:, 1])
    ymax = np.max(channel_locations[:, 1])

    # Expand ranges for better visualization
    xspan = xmax - xmin
    yspan = ymax - ymin
    if xmax <= xmin:
        xmin = xmin - 12
        xmax = xmax + 12
    if ymax <= ymin:
        ymin = ymin - 12
        ymax = ymax + 12

    xspan = xmax - xmin
    yspan = ymax - ymin
    xmin = xmin - xspan * 0.2
    xmax = xmax + xspan * 0.2
    ymin = ymin - yspan * 0.2
    ymax = ymax + yspan * 0.2

    # Create spike location items for each unit
    rng = np.random.default_rng(2022)
    items: List[SpikeLocationsItem] = []
    for unit_id in sorting.get_unit_ids():
        spike_times_sec = (
            np.array(sorting.get_unit_spike_train(segment_index=0, unit_id=unit_id))
            / sorting.get_sampling_frequency()
        )

        # Simulate a center location for this unit
        center_x = rng.uniform(xmin, xmax)
        center_y = rng.uniform(ymin, ymax)

        # Create simulated spike locations around the center
        items.append(
            SpikeLocationsItem(
                unit_id=unit_id,
                spike_times_sec=spike_times_sec.astype(np.float32),
                x_locations=rng.normal(center_x, 6, spike_times_sec.shape).astype(
                    np.float32
                ),
                y_locations=rng.normal(center_y, 6, spike_times_sec.shape).astype(
                    np.float32
                ),
            )
        )

    # Prepare channel locations dictionary
    channel_locations_dict = {}
    for ii, channel_id in enumerate(recording.get_channel_ids()):
        channel_locations_dict[str(channel_id)] = recording.get_channel_locations()[
            ii, :
        ].astype(np.float32)

    # Create the view
    view = SpikeLocations(
        units=items,
        x_range=(float(xmin), float(xmax)),
        y_range=(float(ymin), float(ymax)),
        channel_locations=channel_locations_dict,
        disable_auto_rotate=True,
    )

    # Show the view
    view.show(title="Spike Locations Example", open_in_browser=True)


if __name__ == "__main__":
    main()
