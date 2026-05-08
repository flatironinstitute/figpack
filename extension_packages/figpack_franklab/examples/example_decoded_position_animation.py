"""
Example for DecodedPositionAnimation view.

Generates synthetic decoded-position data (with NaN gaps) on a tiled-grid
background and shows the resulting animation in the browser.
"""

import numpy as np
from matplotlib import pyplot as plt
from matplotlib.patches import Rectangle

import figpack_franklab.views as fv


def main():
    view = example_decoded_position_animation()
    title = "Example Decoded Position Animation"
    description_md = """
# Example Decoded Position Animation

Synthetic decoded position scatter points cycling around a circular trajectory,
overlaid on a static grid background, with the animal's actual position and
heading drawn as an arrow.

Each decoded point persists for several frames as a fading trail, and NaN
gaps in `decode_x`/`decode_y` produce frames with no decoded point.

Use the play button and scrub bar to step through the animation. The view
shares a time-selection context with other views in the same figure, so you
can scrub from any compatible view.
"""

    view.show(
        open_in_browser=True,
        title=title,
        description=description_md,
    )


def example_decoded_position_animation():
    n_timepoints = 200
    t = np.linspace(0, 10, n_timepoints)

    # Background: tiled grid covering the space
    grid_x = np.arange(-15, 16, 3)
    grid_y = np.arange(-15, 16, 3)
    base_patches = [
        Rectangle((x - 1.5, y - 1.5), 3, 3) for x in grid_x for y in grid_y
    ]

    # Decoded positions: cycle around a circle with NaN gaps between cycles
    cycle_len = 40
    gap_len = 5

    decode_x = np.full(n_timepoints, np.nan, dtype=np.float32)
    decode_y = np.full(n_timepoints, np.nan, dtype=np.float32)
    decode_colors = np.full((n_timepoints, 4), np.nan, dtype=np.float32)
    cmap = plt.cm.viridis

    i = 0
    while i < n_timepoints:
        active_end = min(i + cycle_len - gap_len, n_timepoints)
        gap_end = min(i + cycle_len, n_timepoints)
        n_active = active_end - i

        phase = np.linspace(0, 2 * np.pi, n_active)
        decode_x[i:active_end] = np.cos(phase) * 10
        decode_y[i:active_end] = np.sin(phase) * 10
        decode_colors[i:active_end] = cmap(np.linspace(0, 1, n_active))

        i = gap_end

    # Animal position and head direction
    pos_x = (np.cos(t * 0.3) * 5).astype(np.float32)
    pos_y = (np.sin(t * 0.3) * 5).astype(np.float32)
    head_dir = (t % (2 * np.pi)).astype(np.float32)

    # Vary scatter size sinusoidally for demo purposes
    decode_sizes = (40 + 20 * np.sin(t * 1.5)).astype(np.float32)

    view = fv.DecodedPositionAnimation(
        decode_x=decode_x,
        decode_y=decode_y,
        decode_colors=decode_colors,
        pos_x=pos_x,
        pos_y=pos_y,
        head_dir=head_dir,
        time=t,
        base_patches=base_patches,
        patch_face_color="lightgray",
        patch_edge_color="lightgray",
        trail_len=8,
        decode_sizes=decode_sizes,
        arrow_length=2.0,
    )
    return view


if __name__ == "__main__":
    main()
