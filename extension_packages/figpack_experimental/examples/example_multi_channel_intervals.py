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
recording_duration_sec = 20.0
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

    for ch in range(n_channels):
        # Each channel has a different frequency sine wave
        freq = 5 + ch * 3  # 5, 8, 11, 14 Hz
        baseline = np.sin(2 * np.pi * freq * t)

        # Add random noise
        noise = np.random.randn(n_timepoints) * 0.2

        # Add a burst during the interval
        burst = np.zeros(n_timepoints)
        burst[interval_start_idx:interval_end_idx] = (
            np.sin(2 * np.pi * 20 * t[interval_start_idx:interval_end_idx]) * 2
        )

        # Combine signals with channel offset for visualization
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
