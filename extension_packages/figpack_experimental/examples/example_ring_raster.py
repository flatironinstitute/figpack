"""
RingRaster example: 16 simulated head-direction cells on a ring at their preferred
directions. The direction wanders slowly for the first minute, with a tracked head
direction shown as a needle, and faster without one for the second, as in sleep.
Click a time in the graph to show the ring at that moment, or press Play.
"""

import sys

import numpy as np
import figpack.views as vv

from figpack_experimental.views import RingRaster


def main():
    rng = np.random.default_rng(0)
    dt, T = 0.01, 120.0
    t = np.arange(0, T, dt)
    speed = np.where(t < 60, 1.0, 2.0)  # s.d. of the random walk, radians per root second
    theta = np.cumsum(rng.normal(0, 1, len(t)) * speed * np.sqrt(dt)) % (2 * np.pi)

    prefs = np.arange(16) * 360 / 16
    spikes = []
    for p in np.radians(prefs):
        rate = 1 + 40 * np.exp(3 * (np.cos(theta - p) - 1))  # Hz
        spikes.append(t[rng.random(len(t)) < rate * dt] + rng.uniform(0, dt))

    ring = RingRaster(
        unit_ids=[f"cell {i}" for i in range(16)],
        angles_deg=prefs,
        spike_times_sec=spikes,
        start_time_sec=0,
        end_time_sec=T,
    )
    awake = t < 60
    ring.add_needle(
        name="head direction", t=t[awake], angle_deg=np.degrees(theta[awake])
    )

    graph = vv.TimeseriesGraph(y_label="direction (deg)", y_range=[0, 360])
    graph.add_marker_series(
        name="direction", t=t[::5], y=np.degrees(theta[::5]), radius=1.5
    )
    view = vv.Box(
        direction="horizontal",
        items=[
            vv.LayoutItem(
                ring, max_size=420, title="Cells at their preferred directions"
            ),
            vv.LayoutItem(graph, title="Direction (click to set the time)"),
        ],
    )
    upload = "--upload" in sys.argv
    view.show(title="Ring Raster Example", open_in_browser=not upload, upload=upload)


if __name__ == "__main__":
    main()
