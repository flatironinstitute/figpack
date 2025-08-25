# CrossCorrelograms

Visualize cross-correlation analysis between pairs of units in spike sorting data.

Simple integration with SpikeInterface:

```python
import spikeinterface.extractors as se
import spikeinterface.widgets as sw
import figpack.spike_sorting.views as ssv

recording, sorting = se.toy_example(
    num_units=9, duration=300, seed=0, num_segments=1
)
view = ssv.CrossCorrelograms.from_sorting(sorting)
view.show(open_in_browser=True, title="Cross-Correlograms Example")
```

More detailed example can be found at [example_cross_correlograms.py](../examples/example_cross_correlograms.py).
