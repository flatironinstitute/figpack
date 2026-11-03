import numpy as np
import figpack.views as vv


def main():
    view = example_timeseries_graph_annotation()
    title = "Example Timeseries Graph with Manual Annotation"
    description_md = """
# Example Timeseries Graph with Manual Annotation

Synthetic 4-channel LFP with two seizures and scattered spikes. The lower panel shows detections from a (simulated) algorithm, with some misses and false positives, for comparison against manual annotation.

To annotate the LFP panel:

- Click ✏️ Annotate in its toolbar
- Double-click to place a time point (e.g. a spike); drag to mark an interval (e.g. a seizure)
- Click an annotation to select it; Delete removes the selection, Ctrl+Z undoes
- Export CSV downloads `label,start_time,end_time` (end_time is empty for time points)

Annotations are saved in your browser, so they persist across reloads of this figure.
"""

    view.show(
        open_in_browser=True,
        title=title,
        description=description_md,
    )


def example_timeseries_graph_annotation():
    rng = np.random.default_rng(0)
    fs = 200
    duration = 120
    t = np.arange(0, duration, 1 / fs)
    n_channels = 4
    channel_spacing = 12

    seizures = [(30.0, 42.0), (85.0, 95.0)]
    spike_times = np.sort(rng.uniform(2, duration - 2, size=25))
    spike_times = np.array(
        [s for s in spike_times if not any(a - 1 < s < b + 1 for a, b in seizures)]
    )

    lfp_graph = vv.TimeseriesGraph(allow_annotation=True)
    for ch in range(n_channels):
        y = rng.normal(0, 1, len(t))
        for a, b in seizures:
            mask = (t > a) & (t < b)
            y[mask] += 4 * np.sin(2 * np.pi * 6 * t[mask] + ch)
        for s in spike_times:
            y += 6 * np.exp(-(((t - s) / 0.02) ** 2))
        lfp_graph.add_line_series(
            name=f"ch{ch}",
            t=t,
            y=(y + ch * channel_spacing).astype(np.float32),
            color="black",
            width=1,
        )

    # Simulated detections: one seizure boundary is off, one seizure is a
    # false positive, some spikes are missed and some are spurious
    detected_seizures = [(31.0, 40.5), (60.0, 63.0)]
    detected_spikes = np.sort(
        np.concatenate([spike_times[::2], rng.uniform(2, duration - 2, size=4)])
    )
    detection_graph = vv.TimeseriesGraph(y_range=[-1, 1], hide_y_gridlines=True)
    detection_graph.add_interval_series(
        name="detected seizure",
        t_start=np.array([a for a, _ in detected_seizures]),
        t_end=np.array([b for _, b in detected_seizures]),
        color="red",
    )
    detection_graph.add_marker_series(
        name="detected spike",
        t=detected_spikes,
        y=np.zeros(len(detected_spikes), dtype=np.float32),
        color="green",
        radius=4,
    )

    view = vv.Box(
        direction="vertical",
        show_titles=True,
        items=[
            vv.LayoutItem(lfp_graph, stretch=4, title="LFP (annotate here)"),
            vv.LayoutItem(detection_graph, stretch=1, title="Algorithm detections"),
        ],
    )
    return view


if __name__ == "__main__":
    main()
