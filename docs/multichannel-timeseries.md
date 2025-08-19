# MultiChannelTimeseries

Display multi-channel timeseries data with interactive navigation and automatic downsampling for efficient visualization.

## Overview

`MultiChannelTimeseries` visualizes multiple channels of time-series data with features like automatic channel colors, vertical spacing control, time scrolling, and efficient rendering through automatic downsampling.

## Basic Usage

```python
import numpy as np
import figpack.views as vv

# Generate sample data
sampling_freq = 1000  # Hz
duration = 5  # seconds
n_timepoints = int(sampling_freq * duration)
t = np.linspace(0, duration, n_timepoints)

# Create multi-channel data (timepoints × channels)
data = np.zeros((n_timepoints, 3), dtype=np.float32)
data[:, 0] = np.sin(2 * np.pi * 2 * t)  # 2 Hz sine wave
data[:, 1] = np.sin(2 * np.pi * 5 * t)  # 5 Hz sine wave
data[:, 2] = np.random.randn(n_timepoints)  # Random noise

# Create the view
view = vv.MultiChannelTimeseries(
    start_time_sec=0.0,
    sampling_frequency_hz=sampling_freq,
    data=data,
    channel_ids=["Channel_1", "Channel_2", "Channel_3"]
)

view.show(open_in_browser=True, title="Multi-Channel Timeseries Example")
```

## Constructor Parameters

- `start_time_sec` (float): Starting time in seconds
- `sampling_frequency_hz` (float): Sampling rate in Hz
- `data` (np.ndarray): 2D array with shape (timepoints, channels)
- `channel_ids` (list, optional): List of channel identifiers. If None, defaults to "ch_0", "ch_1", etc.

## Features

- **Interactive Navigation**: Pan and zoom through time
- **Vertical Spacing Control**: Adjust spacing between channels with toolbar buttons
- **Automatic Downsampling**: Efficient rendering of large datasets through pyramid downsampling
- **Channel Colors**: Each channel gets a unique color automatically
- **Optimized Storage**: Uses Zarr with compression for efficient data storage

## Example

See [example_multichannel_timeseries.py](../examples/example_multichannel_timeseries.py) for a complete demonstration with various signal types.
