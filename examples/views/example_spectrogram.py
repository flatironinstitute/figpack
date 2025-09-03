"""
Example of creating a Spectrogram view
"""

import numpy as np
import figpack.views as vv

# Generate synthetic spectrogram data
duration_sec = 60.0
sampling_freq_hz = 100.0  # Reduced for efficiency with longer duration
n_timepoints = int(duration_sec * sampling_freq_hz)

# Frequency parameters
freq_min_hz = 5.0
freq_max_hz = 1000.0
freq_delta_hz = 10.0
n_frequencies = int((freq_max_hz - freq_min_hz) / freq_delta_hz) + 1

# Create synthetic spectrogram data
np.random.seed(42)
data = np.zeros((n_timepoints, n_frequencies), dtype=np.float32)

# Add some synthetic spectral features
time_axis = np.linspace(0, duration_sec, n_timepoints)
freq_axis = np.linspace(freq_min_hz, freq_max_hz, n_frequencies)

for i, t in enumerate(time_axis):
    for j, f in enumerate(freq_axis):
        # Base noise level (1/f noise characteristic)
        data[i, j] = 0.05 * np.random.random() / np.sqrt(f + 1)

        # Feature 1: Linear chirp (5-500 Hz over 60 seconds)
        chirp_freq = 50 + 400 * (t / duration_sec)
        if abs(f - chirp_freq) < 15:
            data[i, j] += 0.9 * np.exp(-(((f - chirp_freq) / 8) ** 2))

        # Feature 2: Harmonic series at 100 Hz with time-varying amplitude
        for harmonic in [1, 2, 3, 4]:
            harmonic_freq = 100 * harmonic
            if abs(f - harmonic_freq) < 8:
                amplitude = 0.7 / harmonic * (1 + 0.5 * np.sin(2 * np.pi * 0.1 * t))
                data[i, j] += amplitude * np.exp(-(((f - harmonic_freq) / 5) ** 2))

        # Feature 3: Frequency modulated signal around 300 Hz
        fm_center = 300
        fm_deviation = 50 * np.sin(2 * np.pi * 0.2 * t)
        fm_freq = fm_center + fm_deviation
        if abs(f - fm_freq) < 12:
            data[i, j] += 0.6 * np.exp(-(((f - fm_freq) / 6) ** 2))

        # Feature 4: Broadband bursts every 10 seconds
        for burst_time in np.arange(5, duration_sec, 10):
            if abs(t - burst_time) < 0.5:
                burst_strength = 0.5 * np.exp(-(((t - burst_time) / 0.2) ** 2))
                data[i, j] += burst_strength * np.exp(-(((f - 200) / 100) ** 2))

        # Feature 5: High frequency transients
        for transient_time in [15, 25, 35, 45, 55]:
            if abs(t - transient_time) < 0.1:
                if f > 600:
                    data[i, j] += 0.8 * np.exp(-(((t - transient_time) / 0.05) ** 2))

        # Feature 6: Low frequency oscillation (alpha-like rhythm)
        alpha_freq = 10
        if abs(f - alpha_freq) < 3:
            alpha_amplitude = 0.4 * (1 + np.sin(2 * np.pi * 0.05 * t))
            data[i, j] += alpha_amplitude * np.exp(-(((f - alpha_freq) / 2) ** 2))

        # Feature 7: Stepped frequency pattern
        step_duration = 8  # seconds per step
        step_number = int(t / step_duration)
        step_freq = 150 + (step_number % 5) * 50  # Steps: 150, 200, 250, 300, 350 Hz
        if abs(f - step_freq) < 8:
            data[i, j] += 0.5 * np.exp(-(((f - step_freq) / 4) ** 2))

# Create the spectrogram view
view = vv.Spectrogram(
    start_time_sec=0.0,
    sampling_frequency_hz=sampling_freq_hz,
    frequency_min_hz=freq_min_hz,
    frequency_delta_hz=freq_delta_hz,
    data=data,
)

# Display the spectrogram
view.show(title="Spectrogram Example", open_in_browser=True)
