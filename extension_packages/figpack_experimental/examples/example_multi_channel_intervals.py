"""
Example demonstrating the MultiChannelIntervals view

This example creates synthetic multi-channel timeseries data with intervals,
useful for visualizing events or epochs in electrophysiology data.
"""

import numpy as np
from figpack_experimental.views import MultiChannelIntervals

# Set random seed for reproducibility
np.random.seed(42)

# Parameters
sampling_frequency_hz = 1000.0  # 1 kHz sampling rate
n_channels = 40
n_intervals = 200
window_duration_sec = 0.5  # 500 ms window
interval_duration_sec = 0.1  # 100 ms interval in the middle

# Calculate number of timepoints per window
n_timepoints = int(window_duration_sec * sampling_frequency_hz)

# Generate synthetic data
# We'll create intervals that appear at different times in a longer recording
recording_duration_sec = 6000.0
time_spacing = recording_duration_sec / n_intervals

# Create arrays for window and interval times
window_start_times_sec = np.array([i * time_spacing for i in range(n_intervals)])
interval_start_times_sec = (
    window_start_times_sec + (window_duration_sec - interval_duration_sec) / 2
)
interval_end_times_sec = interval_start_times_sec + interval_duration_sec

# Generate data: shape (n_intervals, n_timepoints, n_channels)
data = np.zeros((n_intervals, n_timepoints, n_channels), dtype=np.float32)

for interval_idx in range(n_intervals):
    # Time array for this window
    t = np.linspace(0, window_duration_sec, n_timepoints)

    # Calculate where the interval is within the window
    interval_start_idx = int(
        (interval_start_times_sec[interval_idx] - window_start_times_sec[interval_idx])
        * sampling_frequency_hz
    )
    interval_end_idx = int(
        (interval_end_times_sec[interval_idx] - window_start_times_sec[interval_idx])
        * sampling_frequency_hz
    )

    # Create different patterns for different interval groups
    interval_type = interval_idx % 3  # Cycle through 3 types

    for ch in range(n_channels):
        # Each channel has a different frequency sine wave
        freq = 5 + ch * 2
        baseline = 0.5 * np.sin(2 * np.pi * freq * t)

        # Add random noise
        noise = np.random.randn(n_timepoints) * 0.2

        # Add a prominent burst during the interval that varies by type
        burst = np.zeros(n_timepoints)
        interval_t = t[interval_start_idx:interval_end_idx]

        if interval_type == 0:
            # High amplitude oscillation burst
            burst[interval_start_idx:interval_end_idx] = 3.0 * np.sin(
                2 * np.pi * 40 * interval_t
            )
        elif interval_type == 1:
            # Rising ramp burst
            burst[interval_start_idx:interval_end_idx] = (
                4.0 * (interval_t - interval_t[0]) / interval_duration_sec
            )
        else:
            # Gaussian envelope burst
            center = (interval_start_idx + interval_end_idx) / 2
            width = (interval_end_idx - interval_start_idx) / 4
            envelope = np.exp(
                -((np.arange(interval_start_idx, interval_end_idx) - center) ** 2)
                / (2 * width**2)
            )
            burst[interval_start_idx:interval_end_idx] = (
                3.5 * envelope * np.sin(2 * np.pi * 35 * interval_t)
            )

        # Combine signals
        data[interval_idx, :, ch] = baseline + noise + burst

# Create channel IDs
channel_ids = [f"Channel {i+1}" for i in range(n_channels)]

# Create the view
view = MultiChannelIntervals(
    sampling_frequency_hz=sampling_frequency_hz,
    data=data,
    channel_ids=channel_ids,
    window_start_times_sec=window_start_times_sec,
    interval_start_times_sec=interval_start_times_sec,
    interval_end_times_sec=interval_end_times_sec,
)

# Display the figure
view.show(title="Multi-Channel Intervals Example", open_in_browser=True)

print(f"Created visualization with:")
print(f"  - {n_intervals} intervals")
print(f"  - {n_channels} channels")
print(f"  - {n_timepoints} timepoints per window")
print(f"  - Window duration: {window_duration_sec} sec")
print(f"  - Interval duration: {interval_duration_sec} sec")
print(f"  - Sampling frequency: {sampling_frequency_hz} Hz")
print("\nUse the Previous/Next buttons to navigate between intervals.")
print("The highlighted yellow region shows the actual interval within each window.")
