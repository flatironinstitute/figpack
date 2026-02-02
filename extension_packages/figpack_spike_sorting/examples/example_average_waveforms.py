"""
Example demonstrating the AverageWaveforms view with waveform_std_dev and waveform_percentiles
"""

import numpy as np
from figpack_spike_sorting.views import AverageWaveforms, AverageWaveformItem


def main():
    # Set random seed for reproducibility
    rng = np.random.default_rng(42)

    # Define dimensions
    num_units = 4
    num_samples = 82  # Typical spike waveform length
    num_channels = 8

    # Create sample average waveforms for multiple units
    average_waveform_items = []

    for unit_idx in range(num_units):
        unit_id = f"unit_{unit_idx + 1}"
        channel_ids = [f"ch_{i}" for i in range(num_channels)]

        # Create a realistic-looking waveform template
        # Use different peak channels for different units
        peak_channel = unit_idx * 2

        waveform = np.zeros((num_samples, num_channels), dtype=np.float32)

        # Generate waveform with peak around sample 20-30
        t = np.arange(num_samples)
        peak_time = 25

        for ch_idx in range(num_channels):
            # Distance-based amplitude decay
            distance = abs(ch_idx - peak_channel)
            amplitude = 100 * np.exp(-distance / 2.0)

            # Create biphasic spike shape
            # Negative peak followed by positive peak
            negative_phase = -amplitude * np.exp(-((t - peak_time) ** 2) / 20.0)
            positive_phase = (amplitude * 0.3) * np.exp(
                -((t - peak_time - 10) ** 2) / 30.0
            )

            waveform[:, ch_idx] = negative_phase + positive_phase

            # Add some baseline noise
            waveform[:, ch_idx] += rng.normal(0, 2, num_samples)

        # Create standard deviation (simulating variability across spikes)
        # Higher std_dev near the peak
        waveform_std_dev = np.zeros((num_samples, num_channels), dtype=np.float32)
        for ch_idx in range(num_channels):
            distance = abs(ch_idx - peak_channel)
            base_std = 5 * np.exp(-distance / 2.0)

            # Higher variability near the peak
            time_factor = 1 + 2 * np.exp(-((t - peak_time) ** 2) / 50.0)
            waveform_std_dev[:, ch_idx] = base_std * time_factor

        # Create percentile waveforms (10th and 90th percentiles)
        # These show the spread of individual spike waveforms
        percentile_10 = waveform - 1.28 * waveform_std_dev  # ~10th percentile
        percentile_90 = waveform + 1.28 * waveform_std_dev  # ~90th percentile

        waveform_percentiles = [
            percentile_10.astype(np.float32),
            percentile_90.astype(np.float32),
        ]

        # Create the average waveform item
        average_waveform_items.append(
            AverageWaveformItem(
                unit_id=unit_id,
                channel_ids=channel_ids,
                waveform=waveform,
                waveform_std_dev=waveform_std_dev,
                waveform_percentiles=waveform_percentiles,
            )
        )

    # Create channel locations (linear probe geometry)
    channel_locations = {}
    for i in range(num_channels):
        channel_locations[f"ch_{i}"] = [0.0, float(i * 25)]  # Linear vertical spacing

    # Create the view
    view = AverageWaveforms(
        average_waveforms=average_waveform_items,
        channel_locations=channel_locations,
    )

    # Show the view
    view.show(title="Average Waveforms Example", open_in_browser=True)


if __name__ == "__main__":
    main()
