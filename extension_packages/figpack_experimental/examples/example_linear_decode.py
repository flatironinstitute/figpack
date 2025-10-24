#!/usr/bin/env python3
"""
Example demonstrating the LinearDecode view
"""

import numpy as np
from figpack_experimental.views import LinearDecode

# Create synthetic data
n_timepoints = 1000
n_positions = 50
sampling_frequency_hz = 30  # 30 Hz
start_time_sec = 0.0

# Create a linear decode heatmap with a moving "hot spot"
data = np.zeros((n_timepoints, n_positions), dtype=np.float32)
for t in range(n_timepoints):
    # Create a gaussian bump that moves across positions over time
    center = (t / n_timepoints) * n_positions
    for p in range(n_positions):
        distance = abs(p - center)
        data[t, p] = np.exp(-(distance**2) / (2 * 3**2))

# Add some noise
data += np.random.randn(n_timepoints, n_positions) * 0.1
data = np.maximum(data, 0)  # Keep non-negative

# Create position grid (uniform spacing from 0 to 100)
position_grid = np.linspace(0, 100, n_positions, dtype=np.float32)

# Create observed positions that follow the true position with some noise
true_positions = (np.arange(n_timepoints) / n_timepoints) * 100
observed_positions = true_positions + np.random.randn(n_timepoints) * 5
observed_positions = observed_positions.astype(np.float32)

# Add some NaN values to simulate gaps in observations
observed_positions[200:250] = np.nan
observed_positions[600:650] = np.nan

# Create the LinearDecode view
view = LinearDecode(
    start_time_sec=start_time_sec,
    sampling_frequency_hz=sampling_frequency_hz,
    data=data,
    observed_positions=observed_positions,
    position_grid=position_grid,
)

# Show the figure
view.show(
    title="Linear Decode Example",
    open_in_browser=True,
)
