import os
import numpy as np
import figpack.views as vv


def main():
    view = example_multichannel_timeseries_large()
    title = "Large Multi-Channel Timeseries (Performance Test)"
    description_md = """
# Large Multi-Channel Timeseries - Performance Test

This is a performance test example of a multi-channel timeseries view with:
- **15 channels** of data
- **5,000,000 timepoints** (5000 seconds at 1kHz sampling)
- **Various signal types** to test rendering performance

## Dataset Details:
- **Sampling Rate**: 1000 Hz
- **Duration**: 5000 seconds (~1.4 hours)
- **Total Data Points**: 75 million (15 channels × 5M timepoints)
- **Memory Usage**: ~300 MB (float32)
"""

    view.show(
        open_in_browser=True,
        title=title,
        description=description_md,
    )


def example_multichannel_timeseries_large():
    """
    Generate a large multi-channel timeseries dataset for performance testing

    Returns:
        MultiChannelTimeseries view with 15 channels and 5,000,000 timepoints
    """
    # Dataset parameters
    sampling_freq = 1000  # Hz
    duration = (
        5000  # seconds (5000 seconds = ~1.4 hours for serious performance testing)
    )
    n_timepoints = int(sampling_freq * duration)  # 5,000,000 timepoints
    n_channels = 15  # 15 channels instead of 4

    print(
        f"Generating large dataset: {n_channels} channels × {n_timepoints:,} timepoints"
    )
    print(f"Total data points: {n_channels * n_timepoints:,}")
    print(f"Estimated memory: {n_channels * n_timepoints * 4 / 1024 / 1024:.1f} MB")

    # Create time array
    t = np.linspace(0, duration, n_timepoints)

    # Initialize data array
    data = np.zeros((n_timepoints, n_channels), dtype=np.float32)

    # Generate different types of signals for performance testing

    # Channels 0-4: Sine waves at different frequencies
    for i in range(5):
        freq = i + 1  # 1, 2, 3, 4, 5 Hz
        amplitude = 1.0 - i * 0.1  # Decreasing amplitude
        noise_level = 0.05
        data[:, i] = amplitude * np.sin(
            2 * np.pi * freq * t
        ) + noise_level * np.random.randn(n_timepoints)

    # Channels 5-9: Chirp signals (frequency sweeps)
    for i in range(5, 10):
        f0 = 0.5  # Start frequency
        f1 = 10.0  # End frequency
        amplitude = 0.8
        noise_level = 0.03
        # Linear chirp from f0 to f1 over the duration
        data[:, i] = amplitude * np.sin(
            2 * np.pi * (f0 + (f1 - f0) * t / duration) * t
        ) + noise_level * np.random.randn(n_timepoints)

    # Channels 10-11: Amplitude modulated signals
    for i in range(10, 12):
        carrier_freq = 8.0 + i * 2  # 8, 10 Hz
        mod_freq = 0.2 + i * 0.1  # 0.2, 0.3 Hz modulation
        mod_depth = 0.7
        amplitude = 1.2
        noise_level = 0.02
        # AM signal: carrier * (1 + mod_depth * modulator)
        carrier = np.sin(2 * np.pi * carrier_freq * t)
        modulator = np.sin(2 * np.pi * mod_freq * t)
        data[:, i] = amplitude * carrier * (
            1 + mod_depth * modulator
        ) + noise_level * np.random.randn(n_timepoints)

    # Channel 12: Sawtooth wave with harmonics
    fundamental_freq = 2.0
    amplitude = 1.0
    noise_level = 0.03
    # Generate sawtooth using Fourier series (first 10 harmonics)
    sawtooth = np.zeros(n_timepoints)
    for harmonic in range(1, 11):
        sawtooth += (
            ((-1) ** (harmonic + 1))
            / harmonic
            * np.sin(2 * np.pi * harmonic * fundamental_freq * t)
        )
    data[:, 12] = amplitude * sawtooth + noise_level * np.random.randn(n_timepoints)

    # Channel 13: Square wave with varying duty cycle
    base_freq = 1.5
    amplitude = 1.1
    noise_level = 0.02
    # Duty cycle varies from 10% to 90% over time
    duty_cycle = 0.1 + 0.8 * (1 + np.sin(2 * np.pi * 0.05 * t)) / 2
    square_wave = np.zeros(n_timepoints)
    for i_t, time_val in enumerate(t):
        phase = (base_freq * time_val) % 1.0
        square_wave[i_t] = 1.0 if phase < duty_cycle[i_t] else -1.0
    data[:, 13] = amplitude * square_wave + noise_level * np.random.randn(n_timepoints)

    # Channel 14: Burst activity (simulating neural spikes)
    amplitude = 2.0
    noise_level = 0.1
    burst_signal = noise_level * np.random.randn(n_timepoints)
    # Add bursts at random intervals
    n_bursts = 200
    burst_times = np.random.uniform(0, duration, n_bursts)
    for burst_time in burst_times:
        burst_start = int(burst_time * sampling_freq)
        burst_duration = np.random.randint(50, 200)  # 50-200 ms bursts
        burst_end = min(burst_start + burst_duration, n_timepoints)
        if burst_start < n_timepoints:
            # Generate burst with exponential decay
            burst_length = burst_end - burst_start
            decay = np.exp(-np.arange(burst_length) / (burst_length * 0.3))
            burst_pattern = (
                amplitude * decay * (0.5 + 0.5 * np.random.randn(burst_length))
            )
            burst_signal[burst_start:burst_end] += burst_pattern
    data[:, 14] = burst_signal

    # Create descriptive channel IDs
    channel_ids = []

    # Sine wave channels
    for i in range(5):
        channel_ids.append(f"Sine_{i+1}Hz")

    # Chirp channels
    for i in range(5, 10):
        channel_ids.append(f"Chirp_{i-4}")

    # Amplitude modulated channels
    for i in range(10, 12):
        carrier_freq = 8 + i * 2
        mod_freq = 0.2 + i * 0.1
        channel_ids.append(f"AM_{carrier_freq}Hz_mod{mod_freq:.1f}Hz")

    # Complex waveform channels
    channel_ids.append("Sawtooth_2Hz")
    channel_ids.append("Square_VarDuty")
    channel_ids.append("BurstActivity")

    print("Dataset generation complete!")
    print(f"Data shape: {data.shape}")
    print(f"Data type: {data.dtype}")
    print(f"Memory usage: {data.nbytes / 1024 / 1024:.1f} MB")

    # Create the view
    view = vv.MultiChannelTimeseries(
        start_time_sec=0.0,
        sampling_frequency_hz=sampling_freq,
        data=data,
        channel_ids=channel_ids,
    )

    return view


if __name__ == "__main__":
    main()
