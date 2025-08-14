#!/usr/bin/env python3
"""
Test script for the figpack upload functionality
"""

import os
import numpy as np
from figpack.views import TimeseriesGraph


def test_upload():
    """Test the upload functionality"""

    # Check if passcode is set
    if not os.environ.get("FIGPACK_UPLOAD_PASSCODE"):
        print("Error: FIGPACK_UPLOAD_PASSCODE environment variable not set")
        print("Please set it before running this test:")
        print("export FIGPACK_UPLOAD_PASSCODE=your_passcode_here")
        return

    # Create a simple timeseries graph
    print("Creating test timeseries graph...")

    # Generate some sample data
    t = np.linspace(0, 10, 100)
    y1 = np.sin(t)
    y2 = np.cos(t) * 0.5

    # Create the graph
    graph = TimeseriesGraph(legend_opts={"location": "northwest"}, y_range=[-1.5, 1.5])

    # Add some series
    graph.add_line_series(name="sine wave", t=t, y=y1, color="blue", width=2.0)

    graph.add_line_series(
        name="cosine wave", t=t, y=y2, color="red", width=1.5, dash=[5, 3]
    )

    # Add some markers
    marker_t = np.array([2, 4, 6, 8])
    marker_y = np.sin(marker_t)
    graph.add_marker_series(
        name="markers", t=marker_t, y=marker_y, color="green", radius=4.0
    )

    print("Test graph created successfully!")

    try:
        # Test the upload
        print("\nTesting upload functionality...")
        url = graph.upload()
        print(f"\nSuccess! Graph uploaded to: {url}")

    except Exception as e:
        print(f"\nUpload failed: {e}")
        return False

    return True


if __name__ == "__main__":
    test_upload()
