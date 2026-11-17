"""
LinkedCurves example: simulated observers in three groups learning a detection task.

Left: each observer's percent correct per session. Right: its final psychometric
curve (fit and data) against signed contrast on a symlog axis. Hover a curve to
highlight that observer in both panels; click a group in the legend to hide it,
shift-click to show only it.
"""

import sys

import numpy as np

from figpack_experimental.views import LinkedCurves


def main():
    rng = np.random.default_rng(1)
    groups = ["Group A", "Group B", "Group C"]
    contrasts = np.array([-100, -25, -12.5, -6.25, 0, 6.25, 12.5, 25, 100])
    xs = np.sign(np.linspace(-1, 1, 101)) * 100 ** np.abs(np.linspace(-1, 1, 101))

    labels, item_groups, learning, fits, points = [], [], [], [], []
    for i in range(30):
        g = groups[i % 3]
        rate = rng.uniform(0.05, 0.3) * (1.5 if g == "Group A" else 1.0)
        sessions = np.arange(1, 41)
        perf = (
            50 + 45 * (1 - np.exp(-rate * sessions)) + rng.normal(0, 4, len(sessions))
        )
        bias, threshold, lapse = (
            rng.normal(0, 5),
            rng.uniform(8, 20),
            rng.uniform(0.02, 0.12),
        )
        curve = lambda c: 100 * (
            lapse + (1 - 2 * lapse) * (np.tanh((c - bias) / threshold) + 1) / 2
        )
        observed = curve(contrasts) + rng.normal(0, 4, len(contrasts))
        labels.append(f"observer {i + 1}")
        item_groups.append(g)
        learning.append((sessions, np.clip(perf, 0, 100)))
        fits.append((xs, curve(xs)))
        points.append((contrasts, np.clip(observed, 0, 100)))

    view = LinkedCurves(item_labels=labels, item_groups=item_groups, num_columns=2)
    p_learn = view.add_panel(
        title="Learning",
        x_label="session",
        y_label="% correct",
        y_range=(40, 100),
        legend_position="lower right",
    )
    p_psych = view.add_panel(
        title="Final psychometric curve",
        x_label="signed contrast (%)",
        y_label="% rightward choices",
        y_range=(-2, 102),
        x_scale="symlog",
        symlog_constant=5,
        x_ticks=[-100, -25, -6.25, 0, 6.25, 25, 100],
    )
    for i in range(len(labels)):
        view.add_curve(p_learn, item=i, x=learning[i][0], y=learning[i][1])
        view.add_curve(p_psych, item=i, x=fits[i][0], y=fits[i][1], series="fit")
        view.add_curve(
            p_psych,
            item=i,
            x=points[i][0],
            y=points[i][1],
            style="markers",
            marker_size=2.5,
            series="data",
        )

    if len(sys.argv) > 1 and sys.argv[1] == "--save":
        view.save(sys.argv[2], title="Linked Curves Example")
    else:
        view.show(title="Linked Curves Example", open_in_browser=True)


if __name__ == "__main__":
    main()
