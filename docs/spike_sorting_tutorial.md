# Spike Sorting Tutorial

This tutorial will guide you through creating spike sorting visualizations using figpack's specialized spike sorting views.

## Prerequisites

Before starting this tutorial, make sure you have the required packages installed:

```bash
pip install figpack figpack_spike_sorting spikeinterface
```

Several of the examples below use [SpikeInterface](https://github.com/SpikeInterface/spikeinterface) to simulate a recording with known ground truth units and to compute properties of those units. Others construct spike trains directly with numpy, which makes it easy to see what each view is showing. In both cases the views only require plain arrays, so they can be used with the output of any spike sorting pipeline.

## Units Table

The Units Table lists the units, with one column for each property you provide. Here we compute a few quality metrics with SpikeInterface:

```python
import numpy as np
import spikeinterface as si
import figpack_spike_sorting.views as ssv

rng = np.random.default_rng(0)
recording, sorting = si.generate_ground_truth_recording(
    durations=[60],
    num_channels=32,
    num_units=16,
    generate_sorting_kwargs={"firing_rates": rng.lognormal(1.5, 0.8, 16), "refractory_period_ms": 2.0},
    seed=4,
)
sorting_analyzer = si.create_sorting_analyzer(sorting=sorting, recording=recording)
sorting_analyzer.compute(["random_spikes", "templates", "noise_levels", "unit_locations"])
sorting_analyzer.compute("quality_metrics", metric_names=["firing_rate", "snr"])
metrics = sorting_analyzer.get_extension("quality_metrics").get_data()
depths = sorting_analyzer.get_extension("unit_locations").get_data()[:, 1]

columns = [
    ssv.UnitsTableColumn(key="firing_rate", label="Firing rate (Hz)", dtype="float"),
    ssv.UnitsTableColumn(key="snr", label="SNR", dtype="float"),
    ssv.UnitsTableColumn(key="depth", label="Depth (um)", dtype="int"),
]
rows = []
for i, unit_id in enumerate(sorting.unit_ids):
    values = {
        "firing_rate": round(metrics["firing_rate"][unit_id], 1),
        "snr": round(metrics["snr"][unit_id], 1),
        "depth": int(depths[i]),
    }
    rows.append(ssv.UnitsTableRow(unit_id=unit_id, values=values))

view = ssv.UnitsTable(columns=columns, rows=rows)
view.show(title="Units Table Example", open_in_browser=True)
```

Click a column header to sort by that column.

<iframe data-src="./spike_sorting_tutorial_units_table/index.html?embedded=1" width="100%" height="400" frameborder="0" loading="lazy"></iframe>

## Unit Metrics Graph

The Unit Metrics Graph shows the distribution of each unit metric, and the relationships between pairs of metrics. In this example the metrics are drawn at random for 200 units:

```python
import numpy as np
import figpack_spike_sorting.views as ssv

rng = np.random.default_rng(0)
num_units = 200
firing_rate = rng.lognormal(mean=1.2, sigma=0.9, size=num_units)
amplitude = rng.gamma(shape=3, scale=40, size=num_units)
snr = amplitude / rng.normal(12, 2, size=num_units)

metrics = [
    ssv.UnitMetricsGraphMetric(key="firing_rate", label="Firing rate (Hz)", dtype="float"),
    ssv.UnitMetricsGraphMetric(key="amplitude", label="Amplitude (uV)", dtype="float"),
    ssv.UnitMetricsGraphMetric(key="snr", label="SNR", dtype="float"),
]
units = [
    ssv.UnitMetricsGraphUnit(
        unit_id=i + 1,
        values={"firing_rate": firing_rate[i], "amplitude": amplitude[i], "snr": snr[i]},
    )
    for i in range(num_units)
]

view = ssv.UnitMetricsGraph(units=units, metrics=metrics, height=500)
view.show(title="Unit Metrics Graph Example", open_in_browser=True)
```

Initially a histogram is shown for each metric. Check two or more metrics on the left to see scatter plots for each pair. You can also:

- Adjust the histogram bin sizes
- Zoom into regions of interest
- Select units to highlight them in the other views of the figure

<iframe data-src="./spike_sorting_tutorial_unit_metrics_graph/index.html?embedded=1" width="100%" height="550" frameborder="0" loading="lazy"></iframe>

## Raster Plot

A raster plot shows when each unit fired. In this simulation the population switches between active and quiet periods, loosely resembling the up and down states of slow-wave sleep:

```python
import numpy as np
import figpack_spike_sorting.views as ssv

rng = np.random.default_rng(0)
duration_sec = 30
dt = 0.001
t = np.arange(0, duration_sec, dt)

# The population switches between active "up" states and quiet "down" states
up_state = np.convolve(rng.standard_normal(t.size), np.ones(700), mode="same") > 0

plots = []
for unit_id in range(1, 21):
    rate_hz = rng.lognormal(2, 0.6) * up_state + 0.5
    spike_times_sec = t[rng.random(t.size) < rate_hz * dt]
    plots.append(ssv.RasterPlotItem(unit_id=unit_id, spike_times_sec=spike_times_sec))

view = ssv.RasterPlot(start_time_sec=0, end_time_sec=duration_sec, plots=plots)
view.show(title="Raster Plot Example", open_in_browser=True)
```

<iframe data-src="./spike_sorting_tutorial_raster_plot/index.html?embedded=1" width="100%" height="450" frameborder="0" loading="lazy"></iframe>

Here's an example using real data from the DANDI Archive:

<iframe data-src="https://figures.figpack.org/figures/default/40f688d9a3b216b3eff759ca/index.html" width="100%" height="600" frameborder="0" loading="lazy"></iframe>

## Spike Amplitudes

Plotting spike amplitudes over time is a common way to assess the stability of units. In this simulation the probe drifts slowly relative to the tissue. The amplitude of each unit depends on its distance to the nearest electrode, so the drift makes some units larger and others smaller:

```python
import numpy as np
import figpack_spike_sorting.views as ssv

rng = np.random.default_rng(3)
duration_sec = 600

# Position of the probe relative to the tissue (micrometers, one value per second)
drift_um = np.cumsum(rng.normal(0, 1, duration_sec))

plots = []
for unit_id in range(1, 7):
    spike_times_sec = np.sort(rng.uniform(0, duration_sec, rng.integers(1500, 6000)))
    distance_um = rng.uniform(-30, 30) + np.interp(spike_times_sec, np.arange(duration_sec), drift_um)
    peak_amplitude = rng.uniform(80, 300)
    amplitudes = peak_amplitude * np.exp(-(distance_um / 50) ** 2) + rng.normal(0, 8, spike_times_sec.size)
    plots.append(
        ssv.SpikeAmplitudesItem(
            unit_id=unit_id,
            spike_times_sec=spike_times_sec,
            spike_amplitudes=amplitudes,
        )
    )

view = ssv.SpikeAmplitudes(start_time_sec=0, end_time_sec=duration_sec, plots=plots)
view.show(title="Spike Amplitudes Example", open_in_browser=True)
```

<iframe data-src="./spike_sorting_tutorial_spike_amplitudes/index.html?embedded=1" width="100%" height="450" frameborder="0" loading="lazy"></iframe>

Or load it from a local or remote NWB file:

```python
import figpack_spike_sorting.views as ssv

print(f"Loading from remote NWB file...")
view = ssv.SpikeAmplitudes.from_nwb_units_table(
    "https://api.dandiarchive.org/api/assets/37ca1798-b14c-4224-b8f0-037e27725336/download/",
    units_path="/units",
    include_units_selector=True,
)
view.show(title="NWB Spike Amplitudes Example")
```

<!-- This is larger, so we precompute it and host it on figpack: -->
<iframe data-src="https://figures.figpack.org/figures/default/49b633fced04b3d1778ebfaa2eea337215a3f107/index.html" width="100%" height="450" frameborder="0" loading="lazy"></iframe>

## Average Waveforms

Average waveforms show the average spike shape of each unit on each channel. The view can be created directly from a SpikeInterface sorting analyzer:

```python
import spikeinterface as si
import figpack_spike_sorting.views as ssv

recording, sorting = si.generate_ground_truth_recording(
    durations=[60], num_channels=8, num_units=9, seed=4
)
sorting_analyzer = si.create_sorting_analyzer(sorting=sorting, recording=recording)

view = ssv.AverageWaveforms.from_sorting_analyzer(sorting_analyzer)
view.show(title="Average Waveforms Example", open_in_browser=True)
```

This shows the spatial extent and amplitude of each unit across the channels, which helps to identify the primary channel of each unit and to compare waveform shapes between units.

<iframe data-src="./spike_sorting_tutorial_average_waveforms/index.html?embedded=1" width="100%" height="500" frameborder="0" loading="lazy"></iframe>

## Autocorrelograms

The autocorrelogram of a unit is a histogram of the time differences between its spikes. A dip at zero reflects the refractory period, and the rest of the shape reflects the firing pattern. Here we construct units with three kinds of firing: irregular (Poisson), bursting, and locked to an oscillation:

```python
import numpy as np
import spikeinterface as si
import figpack_spike_sorting.views as ssv

rng = np.random.default_rng(0)
duration_sec = 600
sampling_frequency = 30000

def poisson(rate_hz, refractory_sec=0.002):
    t = np.sort(rng.uniform(0, duration_sec, rng.poisson(rate_hz * duration_sec)))
    return t[np.insert(np.diff(t) > refractory_sec, 0, True)]

def bursting(burst_rate_hz, isi_sec):
    onsets = poisson(burst_rate_hz)
    sizes = rng.integers(2, 6, onsets.size)
    return np.concatenate([t0 + np.cumsum(rng.uniform(0.7, 1.3, n) * isi_sec) for t0, n in zip(onsets, sizes)])

def rhythmic(freq_hz, p_fire, jitter_sec=0.002):
    cycles = np.arange(0, duration_sec, 1 / freq_hz)
    t = cycles[rng.random(cycles.size) < p_fire]
    return t + rng.normal(0, jitter_sec, t.size)

spike_trains = {
    1: poisson(5),
    2: poisson(30, refractory_sec=0.004),
    3: bursting(2, isi_sec=0.004),
    4: bursting(1, isi_sec=0.007),
    5: rhythmic(40, p_fire=0.5),
    6: rhythmic(25, p_fire=0.3, jitter_sec=0.004),
}
sorting = si.NumpySorting.from_unit_dict(
    {u: np.sort((t * sampling_frequency).astype(int)) for u, t in spike_trains.items()},
    sampling_frequency=sampling_frequency,
)

view = ssv.Autocorrelograms.from_sorting(sorting)
view.show(title="Autocorrelograms Example", open_in_browser=True)
```

<iframe data-src="./spike_sorting_tutorial_autocorrelograms/index.html?embedded=1" width="100%" height="300" frameborder="0" loading="lazy"></iframe>

## Unit Locations

The Unit Locations view shows the estimated position of each unit relative to the electrodes of the probe. Here the locations are estimated by SpikeInterface from the average waveforms:

```python
import spikeinterface as si
import figpack_spike_sorting.views as ssv

recording, sorting = si.generate_ground_truth_recording(
    durations=[60], num_channels=32, num_units=16, seed=4
)
sorting_analyzer = si.create_sorting_analyzer(sorting=sorting, recording=recording)
sorting_analyzer.compute(["random_spikes", "templates", "unit_locations"])
unit_locations = sorting_analyzer.get_extension("unit_locations").get_data()

units = [
    ssv.UnitLocationsItem(unit_id=unit_id, x=float(loc[0]), y=float(loc[1]))
    for unit_id, loc in zip(sorting.unit_ids, unit_locations)
]
channel_locations = dict(zip(recording.channel_ids, recording.get_channel_locations()))

view = ssv.UnitLocations(units=units, channel_locations=channel_locations)
view.show(title="Unit Locations Example", open_in_browser=True)
```

<iframe data-src="./spike_sorting_tutorial_unit_locations/index.html?embedded=1" width="100%" height="500" frameborder="0" loading="lazy"></iframe>

## Cross Correlograms

Cross correlograms show the timing of the spikes of one unit relative to those of another, which can reveal synchrony or interactions between units. In this simulation unit 1 shares an input with unit 2, excites unit 3, and inhibits unit 4:

```python
import numpy as np
import spikeinterface as si
import figpack_spike_sorting.views as ssv

rng = np.random.default_rng(0)
duration_sec = 600
sampling_frequency = 30000

def poisson(rate_hz):
    return np.sort(rng.uniform(0, duration_sec, rng.poisson(rate_hz * duration_sec)))

def jitter(t, sd_sec):
    return t + rng.normal(0, sd_sec, t.size)

# Units 1 and 2 share a common input, so they tend to fire together
common = poisson(3)
u1 = np.sort(np.concatenate([poisson(6), jitter(common, 0.004)]))
u2 = np.concatenate([poisson(6), jitter(common, 0.004)])

# Unit 3 fires about 2 ms after 20% of the spikes of unit 1
u3 = np.concatenate([poisson(5), jitter(u1[rng.random(u1.size) < 0.2] + 0.002, 0.0005)])

# Unit 4 is silent for about 10 ms after each spike of unit 1
u4 = poisson(25)
since_u1 = u4 - u1[np.maximum(np.searchsorted(u1, u4) - 1, 0)]
u4 = u4[(since_u1 < 0) | (since_u1 > rng.uniform(0.006, 0.014, u4.size))]

sorting = si.NumpySorting.from_unit_dict(
    {u: np.sort((t * sampling_frequency).astype(int)) for u, t in enumerate([u1, u2, u3, u4], start=1)},
    sampling_frequency=sampling_frequency,
)

view = ssv.CrossCorrelograms.from_sorting(sorting)
view.show(title="Cross Correlograms Example", open_in_browser=True)
```

Select units in the list on the left to show the cross correlograms between them. The plot for units 1 and 2 has a broad peak centered at zero, the plot for units 1 and 3 has a narrow peak just after zero, and the plot for units 1 and 4 has a gap just after zero.

<iframe data-src="./spike_sorting_tutorial_cross_correlograms/index.html?embedded=1" width="100%" height="600" frameborder="0" loading="lazy"></iframe>

## Unit Similarity Matrix

The Unit Similarity Matrix displays a similarity score for each pair of units, which helps to identify units that may need to be merged. Here we use the similarity of the average waveforms computed by SpikeInterface, and order the units by depth so that units near each other on the probe are adjacent in the matrix:

```python
import numpy as np
import spikeinterface as si
import figpack_spike_sorting.views as ssv

recording, sorting = si.generate_ground_truth_recording(
    durations=[60], num_channels=32, num_units=16, seed=4
)
sorting_analyzer = si.create_sorting_analyzer(sorting=sorting, recording=recording)
sorting_analyzer.compute(["random_spikes", "templates", "unit_locations", "template_similarity"])
similarity = sorting_analyzer.get_extension("template_similarity").get_data()
depths = sorting_analyzer.get_extension("unit_locations").get_data()[:, 1]

order = np.argsort(depths)
unit_ids = list(sorting.unit_ids[order])
similarity = similarity[order][:, order]
similarity_scores = [
    ssv.UnitSimilarityScore(unit_id1=u1, unit_id2=u2, similarity=float(similarity[i, j]))
    for i, u1 in enumerate(unit_ids)
    for j, u2 in enumerate(unit_ids)
]

view = ssv.UnitSimilarityMatrix(unit_ids=unit_ids, similarity_scores=similarity_scores, range=(0, 1))
view.show(title="Unit Similarity Matrix Example", open_in_browser=True)
```

Click a cell to select the corresponding pair of units. The `range` argument sets the values that map to the ends of the color scale.

<iframe data-src="./spike_sorting_tutorial_unit_similarity_matrix/index.html?embedded=1" width="100%" height="500" frameborder="0" loading="lazy"></iframe>

## Spike Locations

The Spike Locations view shows the estimated position of each individual spike. Spikes from a well isolated unit form a compact cluster:

```python
import spikeinterface as si
import figpack_spike_sorting.views as ssv

recording, sorting = si.generate_ground_truth_recording(
    durations=[60], num_channels=32, num_units=16, seed=4
)
sorting_analyzer = si.create_sorting_analyzer(sorting=sorting, recording=recording)
sorting_analyzer.compute(["random_spikes", "templates"])
sorting_analyzer.compute("spike_locations", method="grid_convolution")
spike_locations = sorting_analyzer.get_extension("spike_locations").get_data(outputs="by_unit")[0]

units = []
for unit_id in sorting.unit_ids:
    units.append(
        ssv.SpikeLocationsItem(
            unit_id=unit_id,
            spike_times_sec=sorting.get_unit_spike_train(unit_id) / sorting.sampling_frequency,
            x_locations=spike_locations[unit_id]["x"],
            y_locations=spike_locations[unit_id]["y"],
        )
    )

channel_locations = recording.get_channel_locations()
view = ssv.SpikeLocations(
    units=units,
    x_range=(channel_locations[:, 0].min() - 40, channel_locations[:, 0].max() + 40),
    y_range=(channel_locations[:, 1].min() - 20, channel_locations[:, 1].max() + 20),
    channel_locations=dict(zip(recording.channel_ids, channel_locations)),
)
view.show(title="Spike Locations Example", open_in_browser=True)
```

Select units to highlight them, and use the "only show selected" option to focus on particular units.

<iframe data-src="./spike_sorting_tutorial_spike_locations/index.html?embedded=1" width="100%" height="500" frameborder="0" loading="lazy"></iframe>

## Simple Combined Layout

Views in the same figure share the unit selection. In this layout, selecting units in the table highlights them in the raster plot:

```python
import numpy as np
import figpack.views as vv
import figpack_spike_sorting.views as ssv

rng = np.random.default_rng(0)
duration_sec = 30
dt = 0.001
t = np.arange(0, duration_sec, dt)
up_state = np.convolve(rng.standard_normal(t.size), np.ones(700), mode="same") > 0

rows = []
raster_items = []
for unit_id in range(1, 21):
    rate_hz = rng.lognormal(2, 0.6) * up_state + 0.5
    spike_times_sec = t[rng.random(t.size) < rate_hz * dt]
    firing_rate = round(len(spike_times_sec) / duration_sec, 1)
    rows.append(ssv.UnitsTableRow(unit_id=unit_id, values={"firing_rate": firing_rate}))
    raster_items.append(ssv.RasterPlotItem(unit_id=unit_id, spike_times_sec=spike_times_sec))

units_table = ssv.UnitsTable(
    columns=[ssv.UnitsTableColumn(key="firing_rate", label="Rate (Hz)", dtype="float")],
    rows=rows,
)
raster_plot = ssv.RasterPlot(start_time_sec=0, end_time_sec=duration_sec, plots=raster_items)

view = vv.Splitter(
    direction="horizontal",
    item1=vv.LayoutItem(view=units_table, max_size=300, title="Units"),
    item2=vv.LayoutItem(view=raster_plot, title="Spike Times"),
    split_pos=0.25,
)
view.show(title="Spike Sorting Dashboard", open_in_browser=True)
```

<iframe data-src="./spike_sorting_tutorial_dashboard/index.html?embedded=1" width="100%" height="450" frameborder="0" loading="lazy"></iframe>

## Sorting Curation

The Sorting Curation view provides an interface for manually curating spike sorting results. You can label units as "good", "mua" (multi-unit activity), "noise", or with custom labels, and mark units to be merged. Click "Curate Figure" at the bottom of the figure to begin, then select units in the table and assign labels:

```python
import spikeinterface as si
import figpack.views as vv
import figpack_spike_sorting.views as ssv

recording, sorting = si.generate_ground_truth_recording(
    durations=[120], num_channels=8, num_units=9, seed=4
)
sorting_analyzer = si.create_sorting_analyzer(sorting=sorting, recording=recording)
sorting_analyzer.compute(["random_spikes", "templates", "noise_levels"])
sorting_analyzer.compute("quality_metrics", metric_names=["snr"])
snr = sorting_analyzer.get_extension("quality_metrics").get_data()["snr"]

units_table = ssv.UnitsTable(
    columns=[ssv.UnitsTableColumn(key="snr", label="SNR", dtype="float")],
    rows=[ssv.UnitsTableRow(unit_id=u, values={"snr": round(snr[u], 1)}) for u in sorting.unit_ids],
)
curation = ssv.SortingCuration(default_label_options=["good", "mua", "noise"])
waveforms = ssv.AverageWaveforms.from_sorting_analyzer(sorting_analyzer)

left_panel = vv.Box(
    direction="vertical",
    items=[
        vv.LayoutItem(view=units_table, title="Units"),
        vv.LayoutItem(view=curation, title="Curation"),
    ],
)
view = vv.Splitter(
    direction="horizontal",
    item1=vv.LayoutItem(view=left_panel, max_size=400),
    item2=vv.LayoutItem(view=waveforms, title="Average Waveforms"),
    split_pos=0.3,
)
view.show(title="Sorting Curation Example", open_in_browser=True)
```

<iframe data-src="./spike_sorting_tutorial_sorting_curation/index.html?embedded=1" width="100%" height="600" frameborder="0" loading="lazy"></iframe>
