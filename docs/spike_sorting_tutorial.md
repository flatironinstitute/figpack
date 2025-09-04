# Spike Sorting Tutorial

This tutorial will guide you through creating spike sorting visualizations using figpack's specialized spike sorting views.

## Prerequisites

Before starting this tutorial, make sure you have the required packages installed:

```bash
pip install figpack spikeinterface
```

## Units Table

The Units Table displays basic information about detected neural units:

```python
import spikeinterface.extractors as se
import figpack.spike_sorting.views as ssv

# Generate synthetic spike data
recording, sorting = se.toy_example(
    num_units=6, duration=60, seed=0, num_segments=1
)

# Create a simple units table
columns = [
    ssv.UnitsTableColumn(key="unitId", label="Unit", dtype="int"),
    ssv.UnitsTableColumn(key="numSpikes", label="Spike Count", dtype="int"),
]

rows = []
for unit_id in sorting.get_unit_ids():
    spike_count = len(sorting.get_unit_spike_train(unit_id=unit_id))
    rows.append(
        ssv.UnitsTableRow(
            unit_id=unit_id,
            values={
                "unitId": unit_id,
                "numSpikes": spike_count,
            },
        )
    )

view = ssv.UnitsTable(columns=columns, rows=rows)
view.show(title="Units Table Example", open_in_browser=True)
```

<iframe src="./spike_sorting_tutorial_units_table/index.html?embedded=1" width="100%" height="400" frameborder="0"></iframe>

## Unit Metrics Graph

The Unit Metrics Graph provides interactive visualization of unit metrics, allowing you to analyze relationships between different properties of units:

```python
import spikeinterface.extractors as se
import figpack.spike_sorting.views as ssv

# Generate synthetic spike data
recording, sorting = se.toy_example(
    num_units=12, duration=300, seed=0, num_segments=1
)

# Define metrics to analyze
metrics = [
    ssv.UnitMetricsGraphMetric(key="numEvents", label="Num. events", dtype="int"),
    ssv.UnitMetricsGraphMetric(key="firingRateHz", label="Firing rate (Hz)", dtype="float"),
]

# Calculate metrics for each unit
units = []
for unit_id in sorting.get_unit_ids():
    spike_train = sorting.get_unit_spike_train(segment_index=0, unit_id=unit_id)
    units.append(
        ssv.UnitMetricsGraphUnit(
            unit_id=unit_id,
            values={
                "numEvents": len(spike_train),
                "firingRateHz": len(spike_train) / (recording.get_num_frames(segment_index=0) / recording.get_sampling_frequency())
            }
        )
    )

# Create and show the view
view = ssv.UnitMetricsGraph(units=units, metrics=metrics, height=500)
view.show(title="Unit Metrics Graph Example", open_in_browser=True)
```

This creates an interactive view where you can:

- View histograms of individual metrics
- Compare metrics in scatter plots
- Select which metrics to display
- Adjust histogram bin sizes
- Zoom into regions of interest
- Select and highlight units

<iframe src="./spike_sorting_tutorial_unit_metrics_graph/index.html?embedded=1" width="100%" height="500" frameborder="0"></iframe>

## Raster Plot

A raster plot shows when each unit fired spikes over time:

```python
import numpy as np
import spikeinterface.extractors as se
import figpack.spike_sorting.views as ssv

# Generate synthetic data
recording, sorting = se.toy_example(
    num_units=8, duration=30, seed=0, num_segments=1
)

# Create raster plot items
plot_items = []
for unit_id in sorting.get_unit_ids():
    spike_times_sec = (
        np.array(sorting.get_unit_spike_train(segment_index=0, unit_id=unit_id))
        / sorting.get_sampling_frequency()
    )
    plot_items.append(
        ssv.RasterPlotItem(
            unit_id=unit_id,
            spike_times_sec=spike_times_sec.astype(np.float32)
        )
    )

view = ssv.RasterPlot(
    start_time_sec=0,
    end_time_sec=30,
    plots=plot_items,
)

view.show(title="Raster Plot Example", open_in_browser=True)
```

<iframe src="./spike_sorting_tutorial_raster_plot/index.html?embedded=1" width="100%" height="450" frameborder="0"></iframe>

## Spike Amplitudes

Visualize spike amplitudes over time to assess unit stability:

```python
import numpy as np
import spikeinterface.extractors as se
import figpack.spike_sorting.views as ssv

# Generate synthetic data
recording, sorting = se.toy_example(
    num_units=5, duration=60, seed=0, num_segments=1
)

# Create amplitude plots with simulated data
plot_items = []
rng = np.random.default_rng(42)

for unit_id in sorting.get_unit_ids():
    spike_times_sec = (
        np.array(sorting.get_unit_spike_train(segment_index=0, unit_id=unit_id))
        / sorting.get_sampling_frequency()
    )

    # Simulate realistic amplitude data
    base_amplitude = rng.uniform(50, 200)
    amplitudes = base_amplitude + rng.normal(0, 10, len(spike_times_sec))

    plot_items.append(
        ssv.SpikeAmplitudesItem(
            unit_id=unit_id,
            spike_times_sec=spike_times_sec.astype(np.float32),
            spike_amplitudes=amplitudes.astype(np.float32),
        )
    )

view = ssv.SpikeAmplitudes(
    start_time_sec=0,
    end_time_sec=60,
    plots=plot_items,
)

view.show(title="Spike Amplitudes Example", open_in_browser=True)
```

<iframe src="./spike_sorting_tutorial_spike_amplitudes/index.html?embedded=1" width="100%" height="450" frameborder="0"></iframe>

Or load it from a local or remote NWB file:

```python
import figpack.spike_sorting.views as ssv

print(f"Loading from remote NWB file...")
view = ssv.SpikeAmplitudes.from_nwb_units_table(
    "https://api.dandiarchive.org/api/assets/37ca1798-b14c-4224-b8f0-037e27725336/download/",
    units_path="/units",
    include_units_selector=True,
)
view.show(title="NWB Spike Amplitudes Example")
```

<!-- This is larger, so we precompute it and host it on figpack: -->
<iframe src="https://figures.figpack.org/figures/default/49b633fced04b3d1778ebfaa2eea337215a3f107/index.html" width="100%" height="450" frameborder="0"></iframe>

## Average Waveforms

Average waveforms show the average spike shape for each unit:

```python
import spikeinterface as si
import spikeinterface.extractors as se
import figpack.spike_sorting.views as ssv

# Generate synthetic data with ground truth
recording, sorting = si.generate_ground_truth_recording(
    durations=[120],
    num_units=8,
    seed=0,
    num_channels=6,
    noise_kwargs={"noise_levels": 50},
)

# Create sorting analyzer to compute waveforms
sorting_analyzer = si.create_sorting_analyzer(sorting=sorting, recording=recording)

# Create average waveforms view
view = ssv.AverageWaveforms.from_sorting_analyzer(sorting_analyzer)
view.show(title="Average Waveforms Example", open_in_browser=True)
```

This visualization allows you to:

- View the average spike waveform for each unit
- See waveforms across all recording channels
- Assess the spatial extent and amplitude of each unit
- Identify the primary channel for each unit
- Compare waveform shapes between units

<iframe src="./spike_sorting_tutorial_average_waveforms/index.html?embedded=1" width="100%" height="500" frameborder="0"></iframe>

## Autocorrelograms

Autocorrelograms help assess the quality of unit isolation by showing refractory periods:

```python
import spikeinterface.extractors as se
import figpack.spike_sorting.views as ssv

# Generate synthetic data
recording, sorting = se.toy_example(
    num_units=6, duration=120, seed=0, num_segments=1
)

# Use the built-in method for simplicity
view = ssv.Autocorrelograms.from_sorting(sorting)
view.show(title="Autocorrelograms Example", open_in_browser=True)
```

<iframe src="./spike_sorting_tutorial_autocorrelograms/index.html?embedded=1" width="100%" height="500" frameborder="0"></iframe>

## Cross Correlograms

Cross correlograms reveal temporal relationships between different units, helping identify potential synchrony or interactions:

```python
import spikeinterface.extractors as se
import figpack.spike_sorting.views as ssv

# Generate synthetic data with more units for cross-correlation analysis
recording, sorting = se.toy_example(
    num_units=9, duration=300, seed=0, num_segments=1
)

# Use the built-in method to create cross correlograms
view = ssv.CrossCorrelograms.from_sorting(sorting)
view.show(title="Cross Correlograms Example", open_in_browser=True)
```

<iframe src="./spike_sorting_tutorial_cross_correlograms/index.html?embedded=1" width="100%" height="600" frameborder="0"></iframe>

## Simple Combined Layout

Combine multiple views:

```python
import numpy as np
import spikeinterface.extractors as se
import figpack.spike_sorting.views as ssv
import figpack.views as vv

# Generate synthetic data
recording, sorting = se.toy_example(
    num_units=6, duration=60, seed=0, num_segments=1
)

# Create units table
columns = [
    ssv.UnitsTableColumn(key="unitId", label="Unit", dtype="int"),
    ssv.UnitsTableColumn(key="numSpikes", label="Spikes", dtype="int"),
]

rows = []
for unit_id in sorting.get_unit_ids():
    spike_count = len(sorting.get_unit_spike_train(unit_id=unit_id))
    rows.append(
        ssv.UnitsTableRow(
            unit_id=unit_id,
            values={"unitId": unit_id, "numSpikes": spike_count},
        )
    )

units_table = ssv.UnitsTable(columns=columns, rows=rows)

# Create raster plot
plot_items = []
for unit_id in sorting.get_unit_ids():
    spike_times_sec = (
        np.array(sorting.get_unit_spike_train(segment_index=0, unit_id=unit_id))
        / sorting.get_sampling_frequency()
    )
    plot_items.append(
        ssv.RasterPlotItem(
            unit_id=unit_id,
            spike_times_sec=spike_times_sec.astype(np.float32)
        )
    )

raster_plot = ssv.RasterPlot(
    start_time_sec=0,
    end_time_sec=60,
    plots=plot_items,
)

# Combine in a layout
view = vv.Splitter(
    direction="horizontal",
    item1=vv.LayoutItem(view=units_table, max_size=300, title="Units"),
    item2=vv.LayoutItem(view=raster_plot, title="Spike Times"),
    split_pos=0.3,
)

view.show(title="Spike Sorting Dashboard", open_in_browser=True)
```

<iframe src="./spike_sorting_tutorial_dashboard/index.html?embedded=1" width="100%" height="450" frameborder="0"></iframe>
