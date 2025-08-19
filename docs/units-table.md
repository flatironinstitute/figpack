# UnitsTable

Display spike sorting units in a table format with their properties.

Integration with SpikeInterface:

```python
import spikeinterface.extractors as se
import figpack.spike_sorting.views as ssv

recording, sorting = se.toy_example(
    num_units=18, duration=300, seed=0, num_segments=1
)

# Define columns
columns = [
    ssv.UnitsTableColumn(key="unitId", label="Unit", dtype="int"),
    ssv.UnitsTableColumn(key="numEvents", label="Num. events", dtype="int"),
    ssv.UnitsTableColumn(key="firingRateHz", label="Firing rate (Hz)", dtype="float"),
]

# Create rows
rows = []
for unit_id in sorting.get_unit_ids():
    spike_train = sorting.get_unit_spike_train(unit_id=unit_id)
    rows.append(
        ssv.UnitsTableRow(
            unit_id=unit_id,
            values={
                "unitId": unit_id,
                "numEvents": len(spike_train),
                "firingRateHz": len(spike_train) / (recording.get_num_frames() / recording.get_sampling_frequency()),
            },
        )
    )

view = ssv.UnitsTable(columns=columns, rows=rows)
view.show(open_in_browser=True, title="Units Table Example")
```

More detailed example with similarity scores:

[example_units_table.py](../examples/example_units_table.py)
