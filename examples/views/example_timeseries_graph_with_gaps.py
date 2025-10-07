import numpy as np
import figpack.views as vv


def main():
    view = example_timeseries_graph_with_gaps()
    title = "Example Timeseries Graph with Missing Data Segments"
    description_md = """
# Example Timeseries Graph with Missing Data Segments

This example demonstrates how to handle multi-channel timeseries data with missing segments using the `timestamps_for_inserting_nans` parameter.

## Scenario
A 3-channel sensor system recording at 100 Hz experienced several interruptions:
- **Normal recording**: 0-10 seconds
- **Gap 1**: 10-15 seconds (equipment reboot)
- **Recording resumed**: 15-30 seconds
- **Gap 2**: 30-35 seconds (data transmission failure)
- **Final recording**: 35-45 seconds
- **Gap 3**: 45-50 seconds (sensor malfunction)
- **Recording resumed**: 50-60 seconds

## Channels
- **Channel 0 (Blue)**: Primary sensor - sinusoidal signal
- **Channel 1 (Red)**: Secondary sensor - chirp signal
- **Channel 2 (Green)**: Reference sensor - low-frequency oscillation

## Key Features
The `timestamps_for_inserting_nans` parameter ensures that:
- NaN values are inserted where data is missing
- Gaps are clearly visible in the visualization
- No incorrect interpolation occurs across missing segments
- The timeline remains continuous and accurate

The **light gray intervals** show where data is missing, making it easy to identify periods of sensor downtime.
"""

    view.show(
        open_in_browser=True,
        title=title,
        description=description_md,
    )


def example_timeseries_graph_with_gaps(*, height=500):
    """
    Create a timeseries graph with multi-channel data containing missing segments
    """
    # Create the timeseries graph
    G = vv.TimeseriesGraph(
        legend_opts={"location": "northwest"},
        y_range=[-10, 10],
        hide_x_gridlines=False,
        hide_y_gridlines=True,
        y_label="Amplitude",
        hide_time_axis_labels=False,
    )

    # Parameters
    sampling_frequency_hz = 100.0  # 100 Hz sampling
    start_time_sec = 0.0

    # Define the recording segments (start, end) in seconds
    # These are the segments where we HAVE data
    recording_segments = [
        (0, 10),  # First recording
        (15, 30),  # After equipment reboot
        (35, 45),  # After transmission failure
        (50, 60),  # Final recording
    ]

    # Define gap segments for visualization
    gap_segments = [
        (10, 15),  # Equipment reboot
        (30, 35),  # Data transmission failure
        (45, 50),  # Sensor malfunction
    ]

    print("Generating multi-channel data with missing segments...")

    # Generate data for each recording segment
    all_data_segments = []
    all_timestamps = []

    for seg_start, seg_end in recording_segments:
        # Calculate number of samples in this segment
        n_samples = int((seg_end - seg_start) * sampling_frequency_hz)

        # Generate timestamps for this segment
        segment_timestamps = seg_start + np.arange(n_samples) / sampling_frequency_hz

        # Generate time array for signal generation
        t = segment_timestamps - start_time_sec  # Time relative to start

        # Channel 0: Sinusoidal signal with some variation
        channel_0 = 2.5 * np.sin(2 * np.pi * 0.5 * t) + 0.3 * np.sin(
            2 * np.pi * 2.0 * t
        )

        # Channel 1: Chirp signal (frequency sweep)
        f0, f1 = 0.2, 1.5
        chirp_freq = f0 + (f1 - f0) * (t / 60.0)  # Sweep over full duration
        channel_1 = 2.0 * np.sin(2 * np.pi * chirp_freq * t)

        # Channel 2: Low-frequency oscillation with noise
        channel_2 = 1.5 * np.sin(2 * np.pi * 0.1 * t) + 0.2 * np.random.randn(n_samples)

        # Combine channels
        segment_data = np.column_stack([channel_0, channel_1, channel_2])

        all_data_segments.append(segment_data)
        all_timestamps.append(segment_timestamps)

    # Concatenate all segments
    data = np.vstack(all_data_segments)
    timestamps = np.concatenate(all_timestamps)

    print(f"Generated data shape: {data.shape}")
    print(f"Number of timestamps: {len(timestamps)}")
    print(f"Data spans from {timestamps[0]:.2f}s to {timestamps[-1]:.2f}s")
    print(f"Total recording time: {len(timestamps) / sampling_frequency_hz:.2f}s")
    print(f"Missing time: {60 - len(timestamps) / sampling_frequency_hz:.2f}s")

    # Add the uniform series with timestamps_for_inserting_nans
    # This will insert NaNs where data is missing based on the timestamps
    G.add_uniform_series(
        name="Sensor Data",
        start_time_sec=start_time_sec,
        sampling_frequency_hz=sampling_frequency_hz,
        data=data,
        channel_names=["Primary Sensor", "Secondary Sensor", "Reference Sensor"],
        colors=["blue", "red", "green"],
        width=1.5,
        auto_channel_spacing=3.0,
        timestamps_for_inserting_nans=timestamps,
    )

    # Add interval series to highlight the missing data regions
    gap_starts = np.array([gap[0] for gap in gap_segments], dtype=np.float32)
    gap_ends = np.array([gap[1] for gap in gap_segments], dtype=np.float32)

    G.add_interval_series(
        name="Missing Data",
        t_start=gap_starts,
        t_end=gap_ends,
        color="lightblue",
        alpha=0.4,
    )

    # Add marker series to indicate segment boundaries
    segment_boundary_times = []
    for seg_start, seg_end in recording_segments:
        segment_boundary_times.extend([seg_start, seg_end])

    segment_boundary_times = np.array(segment_boundary_times, dtype=np.float32)
    segment_boundary_values = np.zeros_like(segment_boundary_times)

    G.add_marker_series(
        name="Segment Boundaries",
        t=segment_boundary_times,
        y=segment_boundary_values,
        color="black",
        radius=4,
        shape="circle",
    )

    print("Timeseries graph with gaps created successfully!")
    return G


if __name__ == "__main__":
    main()
