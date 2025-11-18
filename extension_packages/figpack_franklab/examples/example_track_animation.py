import numpy as np
import figpack_franklab.views as fv


def main():
    view = example_track_animation()
    title = "Example Track Animation"
    description_md = """
# Example Track Animation

This is an example of a track animation visualization for animal tracking data.

The visualization shows:
- **Track layout**: The spatial environment (shown as light gray bins)
- **Animal trajectory**: The path taken by the animal (blue line with direction indicator)
- **Probability field**: A heatmap showing decoded position probabilities or other spatial values
- **Current position**: Red circle showing the animal's current location

## Interactive Controls

- **Play/Pause button**: Start or stop the animation
- **Speed selector**: Control playback speed (0.05x to 50x)
- **Brightness slider**: Adjust the intensity of the probability heatmap
- **Colormap selector**: Choose different color schemes for the heatmap
- **Time bar**: Click to jump to any point in the recording

This example uses synthetic data simulating an animal running in a circular pattern
within a square arena, with a probability field that follows the animal's position.
"""

    view.show(
        open_in_browser=True,
        title=title,
        description=description_md,
    )


def example_track_animation():
    """
    Create a TrackAnimation view with synthetic tracking data.

    This generates a simulation of an animal moving in a circular pattern
    within a square arena.
    """

    # Set random seed for reproducibility
    np.random.seed(42)

    # Define spatial bounds
    xmin, xmax = 0.0, 100.0
    ymin, ymax = 0.0, 100.0

    # Spatial binning parameters
    xcount, ycount = 20, 20
    bin_width = (xmax - xmin) / xcount
    bin_height = (ymax - ymin) / ycount

    # Temporal parameters
    sampling_frequency_hz = 30.0  # 30 Hz sampling
    duration_sec = 20.0  # 20 seconds of data
    num_timestamps = int(duration_sec * sampling_frequency_hz)
    timestamps = np.arange(num_timestamps) / sampling_frequency_hz

    # Generate circular trajectory
    center_x, center_y = 50.0, 50.0
    radius = 35.0
    angular_velocity = 2 * np.pi / 10.0  # Complete circle every 10 seconds

    # Add some noise to make it more realistic
    noise_scale = 2.0
    angles = angular_velocity * timestamps
    positions_x = (
        center_x
        + radius * np.cos(angles)
        + np.random.randn(num_timestamps) * noise_scale
    )
    positions_y = (
        center_y
        + radius * np.sin(angles)
        + np.random.randn(num_timestamps) * noise_scale
    )

    # Clip positions to stay within bounds
    positions_x = np.clip(positions_x, xmin + 5, xmax - 5)
    positions_y = np.clip(positions_y, ymin + 5, ymax - 5)

    # Combine into positions array (2, N)
    positions = np.array([positions_x, positions_y], dtype=np.float32)

    # Calculate head direction (tangent to the circular path)
    head_direction = np.arctan2(
        np.gradient(positions_y), np.gradient(positions_x)
    ).astype(np.float32)

    # Create track bin corners (define the circular track where the animal moves)
    # track_bin_corners stores the lower-left corner of each track bin
    # Format: flattened as [x1, x2, ..., xN, y1, y2, ..., yN]
    track_bin_x = []
    track_bin_y = []

    # Create a ring of bins following the circular path
    num_track_bins_angle = 36  # Number of bins around the circle
    track_width_bins = 3  # Width of the track in bins (radial direction)

    for angle_idx in range(num_track_bins_angle):
        angle = 2 * np.pi * angle_idx / num_track_bins_angle

        # Create bins at different radii to form a track of certain width
        for radius_offset in range(-track_width_bins // 2, track_width_bins // 2 + 1):
            bin_radius = radius + radius_offset * bin_width
            bin_x = center_x + bin_radius * np.cos(angle)
            bin_y = center_y + bin_radius * np.sin(angle)

            # Round to nearest bin corner (lower-left corner)
            bin_corner_x = np.floor((bin_x - xmin) / bin_width) * bin_width + xmin
            bin_corner_y = np.floor((bin_y - ymin) / bin_height) * bin_height + ymin

            # Avoid duplicates and ensure within bounds
            if (
                xmin <= bin_corner_x < xmax - bin_width
                and ymin <= bin_corner_y < ymax - bin_height
            ):
                track_bin_x.append(bin_corner_x)
                track_bin_y.append(bin_corner_y)

    # Remove duplicates by converting to set of tuples and back
    track_bins_set = set(zip(track_bin_x, track_bin_y))
    track_bin_x = [x for x, y in sorted(track_bins_set)]
    track_bin_y = [y for x, y in sorted(track_bins_set)]

    # Flatten to required format: [x1, x2, ..., xN, y1, y2, ..., yN]
    track_bin_corners = np.array(track_bin_x + track_bin_y, dtype=np.float32)

    # Generate spatial probability field data
    # For each timestamp frame, create a probability distribution that follows the animal
    # We'll create a probability field for each timestamp
    locations = []
    values = []
    frame_lengths = []  # Store the number of entries for each frame

    for timestamp_idx in range(num_timestamps):
        animal_x = positions_x[timestamp_idx]
        animal_y = positions_y[timestamp_idx]

        frame_entries = 0

        # Create a Gaussian probability field centered on the animal's position
        # Only include bins with significant probability (> threshold) to keep data sparse
        threshold = 0.05
        for i in range(xcount):
            for j in range(ycount):
                bin_center_x = xmin + (i + 0.5) * bin_width
                bin_center_y = ymin + (j + 0.5) * bin_height

                # Calculate distance from animal position
                dist_sq = (bin_center_x - animal_x) ** 2 + (
                    bin_center_y - animal_y
                ) ** 2

                # Gaussian probability
                sigma = 10.0
                prob = np.exp(-dist_sq / (2 * sigma**2))

                if prob > threshold:
                    # Add small noise
                    prob += np.random.rand() * 0.05

                    # Linear index for this bin
                    location = j * xcount + i
                    locations.append(location)
                    values.append(prob)
                    frame_entries += 1

        # Store the number of entries for this frame
        frame_lengths.append(frame_entries)

    # frame_bounds is an array of lengths (number of entries per frame), not indices
    frame_bounds = np.array(frame_lengths, dtype=np.int32)
    locations = np.array(locations, dtype=np.int32)
    values = np.array(values, dtype=np.float32)

    # Create the TrackAnimation view
    view = fv.TrackAnimation(
        bin_height=bin_height,
        bin_width=bin_width,
        frame_bounds=frame_bounds,
        locations=locations,
        values=values,
        xcount=xcount,
        ycount=ycount,
        xmin=xmin,
        ymin=ymin,
        xmax=xmax,
        ymax=ymax,
        head_direction=head_direction,
        positions=positions,
        timestamps=timestamps,
        track_bin_corners=track_bin_corners,
        sampling_frequency_hz=sampling_frequency_hz,
        timestamp_start=0.0,
        total_recording_frame_length=num_timestamps,
        track_bin_height=bin_height,
        track_bin_width=bin_width,
    )

    return view


if __name__ == "__main__":
    main()
