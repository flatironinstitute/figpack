import numpy as np
import pytest
import zarr

from figpack.franklab.views.TrackAnimation import TrackAnimation


def test_init_basic():
    """Test basic initialization with required parameters"""
    # Create minimal test data
    n_frames = 100
    n_locations = 500
    n_track_bins = 50

    # Spatial binning parameters
    bin_height = 3.889314
    bin_width = 3.944035
    xcount = 40
    ycount = 36
    xmin = 97.68798245613134
    ymin = 62.588676470581746
    xmax = 249.53333333333183
    ymax = 200.65931372547837

    # Create test arrays
    frame_bounds = np.arange(0, n_frames, 10, dtype=np.int16)
    locations = np.random.randint(0, xcount * ycount, size=n_locations, dtype=np.uint16)
    values = np.random.randint(-1000, 1000, size=n_locations, dtype=np.int16)
    head_direction = np.random.uniform(0, 2 * np.pi, size=n_frames).astype(np.float32)
    positions = np.random.uniform(0, 100, size=(2, n_frames)).astype(np.float32)
    timestamps = np.linspace(0, n_frames / 250.0, n_frames).astype(np.float32)
    track_bin_corners = np.random.uniform(0, 100, size=(2, n_track_bins)).astype(
        np.float32
    )

    # Metadata
    sampling_frequency_hz = 250.00321869225726
    timestamp_start = 1701801356.2185924
    total_recording_frame_length = n_frames
    track_bin_height = 3.889313725490041
    track_bin_width = 3.9440350877194987

    # Create TrackAnimation
    track_anim = TrackAnimation(
        bin_height=bin_height,
        bin_width=bin_width,
        frame_bounds=frame_bounds,
        locations=locations,
        values=values,
        xcount=xcount,
        ycount=ycount,
        xmin=xmin,
        ymin=ymin,
        head_direction=head_direction,
        positions=positions,
        timestamps=timestamps,
        track_bin_corners=track_bin_corners,
        sampling_frequency_hz=sampling_frequency_hz,
        timestamp_start=timestamp_start,
        total_recording_frame_length=total_recording_frame_length,
        track_bin_height=track_bin_height,
        track_bin_width=track_bin_width,
        xmax=xmax,
        ymax=ymax,
    )

    # Verify attributes are stored correctly
    assert track_anim.bin_height == bin_height
    assert track_anim.bin_width == bin_width
    assert track_anim.xcount == xcount
    assert track_anim.ycount == ycount
    assert track_anim.xmin == xmin
    assert track_anim.ymin == ymin
    assert track_anim.xmax == xmax
    assert track_anim.ymax == ymax
    assert track_anim.sampling_frequency_hz == sampling_frequency_hz
    assert track_anim.timestamp_start == timestamp_start
    assert track_anim.total_recording_frame_length == total_recording_frame_length
    assert track_anim.track_bin_height == track_bin_height
    assert track_anim.track_bin_width == track_bin_width

    # Verify arrays are stored correctly
    assert np.array_equal(track_anim.frame_bounds, frame_bounds)
    assert np.array_equal(track_anim.locations, locations)
    assert np.array_equal(track_anim.values, values)
    assert np.array_equal(track_anim.head_direction, head_direction)
    assert np.array_equal(track_anim.positions, positions)
    assert np.array_equal(track_anim.timestamps, timestamps)
    assert np.array_equal(track_anim.track_bin_corners, track_bin_corners)


def test_zarr_storage():
    """Test writing TrackAnimation data to Zarr storage"""
    # Create test data
    n_frames = 50
    n_locations = 100
    n_track_bins = 25

    bin_height = 3.889314
    bin_width = 3.944035
    xcount = 40
    ycount = 36
    xmin = 97.68798245613134
    ymin = 62.588676470581746
    xmax = 249.53333333333183
    ymax = 200.65931372547837

    frame_bounds = np.arange(0, n_frames, 5, dtype=np.int16)
    locations = np.random.randint(0, xcount * ycount, size=n_locations, dtype=np.uint16)
    values = np.random.randint(-1000, 1000, size=n_locations, dtype=np.int16)
    head_direction = np.random.uniform(0, 2 * np.pi, size=n_frames).astype(np.float32)
    positions = np.random.uniform(0, 100, size=(2, n_frames)).astype(np.float32)
    timestamps = np.linspace(0, n_frames / 250.0, n_frames).astype(np.float32)
    track_bin_corners = np.random.uniform(0, 100, size=(2, n_track_bins)).astype(
        np.float32
    )

    sampling_frequency_hz = 250.00321869225726
    timestamp_start = 1701801356.2185924
    total_recording_frame_length = n_frames
    track_bin_height = 3.889313725490041
    track_bin_width = 3.9440350877194987

    # Create TrackAnimation
    track_anim = TrackAnimation(
        bin_height=bin_height,
        bin_width=bin_width,
        frame_bounds=frame_bounds,
        locations=locations,
        values=values,
        xcount=xcount,
        ycount=ycount,
        xmin=xmin,
        ymin=ymin,
        head_direction=head_direction,
        positions=positions,
        timestamps=timestamps,
        track_bin_corners=track_bin_corners,
        sampling_frequency_hz=sampling_frequency_hz,
        timestamp_start=timestamp_start,
        total_recording_frame_length=total_recording_frame_length,
        track_bin_height=track_bin_height,
        track_bin_width=track_bin_width,
        xmax=xmax,
        ymax=ymax,
    )

    # Write to Zarr
    store = zarr.storage.TempStore()
    root = zarr.group(store=store)
    group = root.create_group("test")
    track_anim._write_to_zarr_group(group)

    # Verify view type
    assert group.attrs["view_type"] == "TrackAnimation"

    # Verify spatial binning attributes
    assert group.attrs["bin_height"] == bin_height
    assert group.attrs["bin_width"] == bin_width
    assert group.attrs["xcount"] == xcount
    assert group.attrs["ycount"] == ycount
    assert group.attrs["xmin"] == xmin
    assert group.attrs["ymin"] == ymin
    assert group.attrs["xmax"] == xmax
    assert group.attrs["ymax"] == ymax

    # Verify metadata attributes
    assert group.attrs["sampling_frequency_hz"] == sampling_frequency_hz
    assert group.attrs["timestamp_start"] == timestamp_start
    assert group.attrs["total_recording_frame_length"] == total_recording_frame_length
    assert group.attrs["track_bin_height"] == track_bin_height
    assert group.attrs["track_bin_width"] == track_bin_width

    # Verify datasets
    assert np.array_equal(group["frame_bounds"][:], frame_bounds)
    assert np.array_equal(group["locations"][:], locations)
    assert np.array_equal(group["values"][:], values)
    assert np.array_equal(group["head_direction"][:], head_direction)
    assert np.array_equal(group["positions"][:], positions)
    assert np.array_equal(group["timestamps"][:], timestamps)
    assert np.array_equal(group["track_bin_corners"][:], track_bin_corners)


def test_data_types():
    """Test that data types are preserved correctly"""
    n_frames = 10
    n_locations = 20
    n_track_bins = 5

    frame_bounds = np.array([0, 5, 10], dtype=np.int16)
    locations = np.array(range(n_locations), dtype=np.uint16)
    values = np.array(range(n_locations), dtype=np.int16)
    head_direction = np.array(range(n_frames), dtype=np.float32)
    positions = np.array([[i, i + 1] for i in range(n_frames)], dtype=np.float32).T
    timestamps = np.array(range(n_frames), dtype=np.float32)
    track_bin_corners = np.array(
        [[i, i + 1] for i in range(n_track_bins)], dtype=np.float32
    ).T

    track_anim = TrackAnimation(
        bin_height=1.0,
        bin_width=1.0,
        frame_bounds=frame_bounds,
        locations=locations,
        values=values,
        xcount=10,
        ycount=10,
        xmin=0.0,
        ymin=0.0,
        head_direction=head_direction,
        positions=positions,
        timestamps=timestamps,
        track_bin_corners=track_bin_corners,
        sampling_frequency_hz=250.0,
        timestamp_start=0.0,
        total_recording_frame_length=n_frames,
        track_bin_height=1.0,
        track_bin_width=1.0,
        xmax=10.0,
        ymax=10.0,
    )

    # Verify data types are preserved
    assert track_anim.frame_bounds.dtype == np.int16
    assert track_anim.locations.dtype == np.uint16
    assert track_anim.values.dtype == np.int16
    assert track_anim.head_direction.dtype == np.float32
    assert track_anim.positions.dtype == np.float32
    assert track_anim.timestamps.dtype == np.float32
    assert track_anim.track_bin_corners.dtype == np.float32
