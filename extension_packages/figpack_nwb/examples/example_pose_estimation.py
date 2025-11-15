"""
Example script demonstrating the PoseEstimation view.

This example creates synthetic pose estimation data and displays it.
"""

import numpy as np
from figpack_nwb.views import PoseEstimation, PoseEstimationItem


def create_synthetic_pose_data():
    """Create synthetic pose estimation data for testing"""
    # Simulation parameters
    num_timepoints = 500
    num_nodes = 8
    fps = 30
    duration = num_timepoints / fps

    # Generate timestamps
    timestamps = np.linspace(0, duration, num_timepoints)

    # Create nodes with different movement patterns
    node_names = [
        "nose",
        "left_ear",
        "right_ear",
        "neck",
        "left_front_paw",
        "right_front_paw",
        "left_rear_paw",
        "right_rear_paw",
    ]

    items = []

    for node_idx, node_name in enumerate(node_names):
        # Create circular or oscillating movement patterns
        # Base position depends on node
        base_x = 50 + (node_idx % 4) * 30
        base_y = 50 + (node_idx // 4) * 30

        # Add sinusoidal movement
        freq = 0.5 + node_idx * 0.1
        x_positions = base_x + 20 * np.sin(2 * np.pi * freq * timestamps)
        y_positions = base_y + 20 * np.cos(2 * np.pi * freq * timestamps)

        # Add some random noise
        x_positions += np.random.randn(num_timepoints) * 2
        y_positions += np.random.randn(num_timepoints) * 2

        # Stack into (T, 2) array
        data = np.stack([x_positions, y_positions], axis=1)

        item = PoseEstimationItem(
            name=node_name,
            start_time=0,
            rate=fps,
            data=data,
            description=f"Synthetic {node_name} position data",
        )
        items.append(item)

    return items


def example_with_synthetic_data():
    """Example using synthetic data"""
    print("Creating synthetic pose estimation data...")
    items = create_synthetic_pose_data()

    print(f"Created {len(items)} nodes with synthetic data.")

    # Create the view
    view = PoseEstimation(
        description="Synthetic pose estimation example - watch the nodes move!",
        items=items,
    )

    # Show the visualization
    view.show(title="Pose Estimation Example (Synthetic Data)", open_in_browser=True)


def example_with_nwb_data():
    """
    Example loading from NWB file.
    This requires a valid NWB file with PoseEstimationSeries data.
    """
    # Example URL (replace with actual NWB file containing pose estimation data)
    nwb_url = "https://api.dandiarchive.org/api/assets/37ca1798-b14c-4224-b8f0-037e27725336/download/"
    path = "/processing/behavior/PoseEstimationLeftCamera"

    print(f"Loading pose estimation data from NWB file...")
    print(f"URL: {nwb_url}")
    print(f"Path: {path}")

    try:
        view = PoseEstimation(nwb=nwb_url, path=path, use_local_cache=True)
        view.show(title="Pose Estimation from NWB", open_in_browser=True)
    except Exception as e:
        print(f"Error loading from NWB: {e}")
        print("This example requires a valid NWB file with PoseEstimationSeries data.")


if __name__ == "__main__":
    import sys

    has_nwb_flag = "--nwb" in sys.argv

    if has_nwb_flag:
        # Try to load from NWB
        print("Running NWB data example...")
        example_with_nwb_data()
    else:
        # Use synthetic data
        example_with_synthetic_data()
