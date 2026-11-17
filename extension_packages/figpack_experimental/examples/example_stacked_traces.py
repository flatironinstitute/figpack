"""
StackedTraces example: synthetic LFP from 2 probes x 4 shanks x 16 bipolar pairs,
with a spike raster below sharing the time axis.

Use the channel list on the left to show/hide channels: click a row (shift-click
for a range), or type a filter (e.g. "P3 S1, P4 S2") and press Show/Hide/Only.
"""

import sys

import numpy as np

import figpack.views as fv
import figpack_experimental.views as fe


def make_data(duration_sec=120.0, fs=1000.0, seed=0):
    rng = np.random.default_rng(seed)
    n = int(duration_sec * fs)
    channel_ids = []
    colors = []
    for probe in ["P3", "P4"]:
        for shank in range(1, 5):
            for pair in range(16):
                channel_ids.append(f"{probe} S{shank} ch{pair:02d}")
                colors.append("purple" if pair >= 4 else "blue")
    m = len(channel_ids)

    # Smoothed noise per channel
    noise = rng.standard_normal((n, m)).astype(np.float32)
    kernel = np.hanning(25).astype(np.float32)
    kernel /= kernel.sum()
    for j in range(m):
        noise[:, j] = np.convolve(noise[:, j], kernel, mode="same")
    data = 300.0 * noise / noise.std()

    # Interictal-like discharges on the "cell layer" pairs (6-9) of each shank
    t_events = np.sort(rng.uniform(1, duration_sec - 1, size=int(duration_sec / 3)))
    tt = np.arange(-0.15, 0.15, 1 / fs)
    wave = (-2500 * np.exp(-((tt / 0.01) ** 2)) + 800 * np.exp(-(((tt - 0.05) / 0.04) ** 2))).astype(np.float32)
    cell_layer = [j for j, c in enumerate(channel_ids) if 6 <= int(c[-2:]) <= 9]
    for te in t_events:
        i0 = int(te * fs) + int(tt[0] * fs)
        for j in cell_layer:
            gain = rng.uniform(0.5, 1.2)
            data[i0 : i0 + len(wave), j] += gain * wave

    # A raster with units that fire more around the events
    units = []
    for u in range(40):
        rate = rng.uniform(1, 10)
        st = np.sort(rng.uniform(0, duration_sec, size=int(rate * duration_sec)))
        burst = np.concatenate([te + rng.normal(0, 0.02, size=3) for te in t_events])
        units.append(np.sort(np.concatenate([st, burst])))
    return data, fs, channel_ids, colors, units


def main():
    data, fs, channel_ids, colors, units = make_data()

    lfp = fe.StackedTraces(
        start_time_sec=0.0,
        sampling_frequency_hz=fs,
        data=data,
        channel_ids=channel_ids,
        channel_colors=colors,
    )

    raster = fv.TimeseriesGraph()
    for i, st in enumerate(units):
        raster.add_marker_series(
            name=f"unit {i}", t=st, y=np.full(len(st), i + 1.0), color="blue", radius=1
        )

    view = fv.Box(
        direction="vertical",
        items=[
            fv.LayoutItem(lfp, stretch=3),
            fv.LayoutItem(raster, stretch=1),
        ],
    )
    title = "StackedTraces example"
    if len(sys.argv) > 1:
        view.save(sys.argv[1], title=title)
    else:
        view.show(title=title, open_in_browser=True)


if __name__ == "__main__":
    main()
