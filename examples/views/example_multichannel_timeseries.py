import os
import numpy as np
import figpack.views as vv


def main():
    view = example_multichannel_timeseries()
    title = "Example Multi-Channel Timeseries"
    description_md = """
# Example Multi-Channel Timeseries

This is an example of a multi-channel timeseries view created using figpack.

The view displays multiple channels of data with:
- **Automatic channel colors**: Each channel gets a unique color
- **Vertical spacing control**: Use the toolbar buttons (-, +) to adjust spacing between channels
- **Time scrolling**: Pan and zoom through the time axis
- **Sample data**: 4 channels with different signal patterns

## Features:
- Channel 0: Sine wave at 2 Hz
- Channel 1: Sine wave at 5 Hz  
- Channel 2: Sine wave at 10 Hz
- Channel 3: Random noise + slow drift

Use the toolbar controls to:
- **Pan**: Drag to move through time
- **Zoom**: Mouse wheel or zoom buttons
- **Spacing**: Use - and + buttons to adjust vertical separation
"""

    upload = os.environ.get("FIGPACK_UPLOAD") == "1"
    _dev = os.environ.get("FIGPACK_DEV") == "1"
    view.show(
        open_in_browser=True,
        upload=upload,
        _dev=_dev,
        title=title,
        description=description_md,
    )


def example_multichannel_timeseries():
    # Generate sample multi-channel data
    sampling_freq = 1000  # Hz
    duration = 5  # seconds
    n_timepoints = int(sampling_freq * duration)
    n_channels = 4

    # Create time array
    t = np.linspace(0, duration, n_timepoints)

    # Generate data for each channel
    data = np.zeros((n_timepoints, n_channels), dtype=np.float32)

    # Channel 0: 2 Hz sine wave
    data[:, 0] = np.sin(2 * np.pi * 2 * t) + 0.1 * np.random.randn(n_timepoints)

    # Channel 1: 5 Hz sine wave
    data[:, 1] = 0.8 * np.sin(2 * np.pi * 5 * t) + 0.1 * np.random.randn(n_timepoints)

    # Channel 2: 10 Hz sine wave
    data[:, 2] = 0.6 * np.sin(2 * np.pi * 10 * t) + 0.1 * np.random.randn(n_timepoints)

    # Channel 3: Random walk with slow drift
    data[:, 3] = np.cumsum(0.02 * np.random.randn(n_timepoints)) + 0.1 * np.sin(
        2 * np.pi * 0.5 * t
    )

    # Create the view
    view = vv.MultiChannelTimeseries(
        start_time_sec=0.0,
        sampling_frequency_hz=sampling_freq,
        data=data,
        channel_ids=["Sine_2Hz", "Sine_5Hz", "Sine_10Hz", "Random_Walk"],
    )

    return view


if __name__ == "__main__":
    main()
