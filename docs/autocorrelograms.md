# Autocorrelograms

Visualize autocorrelograms for spike sorting data.

Simple integration with SpikeInterface:

```python
import spikeinterface.extractors as se
import spikeinterface.widgets as sw
import figpack.spike_sorting.views as ssv

recording, sorting = se.toy_example(
    num_units=9, duration=300, seed=0, num_segments=1
)
view = ssv.Autocorrelograms.from_sorting(sorting)
view.show(open_in_browser=True)
```

More detailed example, constructing a custom `Autocorrelograms` view and combining it with a units table.

[example_autocorrelograms.py](../examples/example_autocorrelograms.py)
