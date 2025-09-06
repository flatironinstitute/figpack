import os
import numpy as np
import figpack.views as vv


def main():
    view = example_timeseries_graph_uniform()
    title = "Example Timeseries Graph with Uniform Series"
    description_md = """
# Example Timeseries Graph with Uniform Series

This example demonstrates the uniform timeseries functionality in figpack, which is optimized for large datasets with regular sampling intervals.

## Uniform Series (4 channels, 2M timepoints each)
- **Channel 0 (Blue)**: Sinusoidal wave with slowly increasing frequency
- **Channel 1 (Red)**: Exponentially decaying oscillation
- **Channel 2 (Green)**: Chirp signal (frequency sweep)
- **Channel 3 (Orange)**: Random walk with trend

The uniform series uses efficient downsampling for smooth visualization even with millions of data points.

## Additional Series for Comparison
- **Purple markers**: Sparse event markers at key timepoints
- **Gray dashed line**: Reference baseline
- **Light blue intervals**: Highlighted time regions of interest

You can zoom and pan to explore the data at different time scales. The uniform series will automatically show appropriate detail levels based on the zoom level.
"""

    view.show(
        open_in_browser=True,
        title=title,
        description=description_md,
    )


def example_timeseries_graph_uniform(*, height=500):
    # Create the timeseries graph
    G = vv.TimeseriesGraph(
        legend_opts={"location": "northwest"},
        y_range=[-15, 15],
        hide_x_gridlines=False,
        hide_y_gridlines=True,
        y_label="Amplitude",
        # hide_nav_toolbar=True,
        hide_time_axis_labels=True,
    )

    # Parameters for the uniform series
    n_timepoints = 4_000_000
    sampling_frequency_hz = 1000.0  # 1 kHz sampling
    start_time_sec = 0.0
    duration_sec = n_timepoints / sampling_frequency_hz  # 4000 seconds

    # Generate time array for signal generation
    t = np.linspace(0, duration_sec, n_timepoints, dtype=np.float32)

    # Generate 4 different types of signals with offsets
    print("Generating uniform series data...")

    # Define channel offsets for better visualization
    channel_offsets = [6, 2, -2, -6]  # Vertical offsets

    # Channel 0: Sinusoidal with slowly increasing frequency
    freq_sweep = 0.1 + 0.05 * t / duration_sec  # 0.1 to 0.15 Hz
    channel_0 = 2 * np.sin(2 * np.pi * freq_sweep * t) + channel_offsets[0]

    # Channel 1: Exponentially decaying oscillation
    decay_rate = 0.001
    channel_1 = (
        3 * np.exp(-decay_rate * t) * np.cos(2 * np.pi * 0.2 * t) + channel_offsets[1]
    )

    # Channel 2: Chirp signal (frequency sweep)
    f0, f1 = 0.05, 0.5  # Start and end frequencies
    chirp_freq = f0 + (f1 - f0) * t / duration_sec
    channel_2 = 2.5 * np.sin(2 * np.pi * chirp_freq * t) + channel_offsets[2]

    # Channel 3: Random walk with trend
    np.random.seed(42)  # For reproducibility
    # Generate in chunks to avoid memory issues
    chunk_size = 100_000
    channel_3 = np.zeros(n_timepoints, dtype=np.float32)
    current_value = 0.0

    for i in range(0, n_timepoints, chunk_size):
        end_idx = min(i + chunk_size, n_timepoints)
        chunk_length = end_idx - i

        # Random walk component (reduced amplitude)
        random_steps = np.random.normal(0, 0.005, chunk_length)

        # Add trend component (reduced)
        trend = 0.001 * np.arange(chunk_length) / sampling_frequency_hz

        # Accumulate the walk
        for j in range(chunk_length):
            current_value += random_steps[j]
            channel_3[i + j] = current_value + trend[j] + channel_offsets[3]

    # Combine channels into 2D array
    uniform_data = np.column_stack([channel_0, channel_1, channel_2, channel_3])

    print(f"Generated uniform data shape: {uniform_data.shape}")

    # Add the uniform series
    G.add_uniform_series(
        name="Multi-channel Signal",
        start_time_sec=start_time_sec,
        sampling_frequency_hz=sampling_frequency_hz,
        data=uniform_data,
        channel_names=["Sine Sweep", "Decay Osc", "Chirp", "Random Walk"],
        colors=["blue", "red", "green", "orange"],
        width=1.0,
    )

    # Add some sparse marker series for comparison
    marker_times = np.array([100, 300, 500, 800, 1200, 1600, 1900], dtype=np.float32)
    marker_values = np.array([8, -6, 9, -7, 7, -8, 6], dtype=np.float32)

    G.add_marker_series(
        name="Event Markers",
        t=marker_times,
        y=marker_values,
        color="purple",
        radius=6,
        shape="circle",
    )

    # Add a reference line
    ref_times = np.array([0, duration_sec], dtype=np.float32)
    ref_values = np.array([0, 0], dtype=np.float32)

    G.add_line_series(
        name="Baseline",
        t=ref_times,
        y=ref_values,
        color="gray",
        width=2,
        dash=[10, 5],
    )

    # Add some interval series to highlight regions of interest
    interval_starts = np.array([200, 600, 1000, 1400], dtype=np.float32)
    interval_ends = np.array([250, 650, 1100, 1500], dtype=np.float32)

    G.add_interval_series(
        name="Regions of Interest",
        t_start=interval_starts,
        t_end=interval_ends,
        color="lightblue",
        alpha=0.3,
    )

    print("Timeseries graph created successfully!")
    return G


if __name__ == "__main__":
    main()
