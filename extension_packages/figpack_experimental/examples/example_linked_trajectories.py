"""
LinkedTrajectories example: damped pendulums released from different angles.

Left: each pendulum in phase space (angle, angular velocity). Right: the position
of its bob. The time slider (with playback) moves a marker along every
trajectory; hover a curve to highlight that pendulum in both panels, click to
select it, shift-click to add more.
"""

import sys

import numpy as np

from figpack_experimental.views import LinkedTrajectories, TrajectoryPanel


def simulate(
    theta0, duration_sec=10.0, dt=0.001, every=50, g_over_l=9.81, damping=0.15
):
    theta = np.array(theta0, dtype=float)
    omega = np.zeros_like(theta)
    n_steps = int(round(duration_sec / dt))
    samples = []
    for step in range(n_steps + 1):
        if step % every == 0:
            samples.append(np.stack([theta, omega], axis=-1))
        # semi-implicit Euler
        omega = omega + dt * (-g_over_l * np.sin(theta) - damping * omega)
        theta = theta + dt * omega
    times = np.arange(len(samples)) * dt * every
    return times, np.stack(samples, axis=1)  # pendulums x times x 2


def main():
    theta0 = np.radians(np.linspace(-170, 170, 24))
    times, phase = simulate(theta0)
    bob = np.stack([np.sin(phase[..., 0]), -np.cos(phase[..., 0])], axis=-1)

    view = LinkedTrajectories(
        times=times,
        panels=[
            TrajectoryPanel(
                data=phase,
                title="Phase space",
                x_label="angle (rad)",
                y_label="angular velocity (rad/s)",
                equal_aspect=False,
            ),
            TrajectoryPanel(
                data=bob, title="Bob position", x_label="x (m)", y_label="y (m)"
            ),
        ],
        item_labels=[f"released at {d:+.0f} deg" for d in np.degrees(theta0)],
        item_colors=[
            f"hsl({h:.0f}, 70%, 45%)" for h in np.linspace(0, 300, len(theta0))
        ],
        time_label="s",
        tail_length=1.0,
        initial_time=2.0,
    )
    if len(sys.argv) > 1 and sys.argv[1] == "--save":
        view.save(sys.argv[2], title="Linked Trajectories Example")
    else:
        view.show(title="Linked Trajectories Example", open_in_browser=True)


if __name__ == "__main__":
    main()
