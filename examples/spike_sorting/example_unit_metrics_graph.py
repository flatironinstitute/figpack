import spikeinterface.extractors as se
from figpack_spike_sorting.views import (
    UnitMetricsGraphMetric,
    UnitMetricsGraphUnit,
    UnitMetricsGraph,
)


def example_unit_metrics_graph():
    """
    Example showing how to create a UnitMetricsGraph view with unit metrics
    including number of events and firing rate
    """
    # Create a toy sorting dataset
    recording, sorting = se.toy_example(
        num_units=12, duration=300, seed=0, num_segments=1
    )

    # Define the metrics we want to display
    metrics = [
        UnitMetricsGraphMetric(key="numEvents", label="Num. events", dtype="int"),
        UnitMetricsGraphMetric(
            key="firingRateHz", label="Firing rate (Hz)", dtype="float"
        ),
    ]

    # Calculate metrics for each unit
    units = []
    for unit_id in sorting.get_unit_ids():
        spike_train = sorting.get_unit_spike_train(segment_index=0, unit_id=unit_id)
        units.append(
            UnitMetricsGraphUnit(
                unit_id=unit_id,
                values={
                    "numEvents": len(spike_train),
                    "firingRateHz": len(spike_train)
                    / (
                        recording.get_num_frames(segment_index=0)
                        / recording.get_sampling_frequency()
                    ),
                },
            )
        )

    # Create and show the view
    view = UnitMetricsGraph(units=units, metrics=metrics, height=500)
    view.show(title="Unit Metrics Graph Example", open_in_browser=True)


if __name__ == "__main__":
    example_unit_metrics_graph()
