"""
Custom view examples that users can extend.
Add your own custom figpack views here.
"""

import numpy as np
import figpack.views as fpv


def figpack_view_example_1():
    """Example custom view: damped sine wave."""
    # Create a simple timeseries
    graph = fpv.TimeseriesGraph(y_label="Amplitude")

    # Generate data
    t = np.linspace(0, 10, 500)
    y = np.sin(2 * np.pi * t) * np.exp(-t / 5)

    # Add line series
    graph.add_line_series(
        name="Damped Sine", t=t.astype(np.float32), y=y.astype(np.float32), color="blue"
    )

    return graph


# Registry of custom views that can be referenced by name
CUSTOM_VIEWS = {
    "example-1": figpack_view_example_1,
}


def get_custom_view(name: str):
    """Get a custom view by name."""
    if name not in CUSTOM_VIEWS:
        raise ValueError(
            f"Unknown custom view: {name}. Available: {list(CUSTOM_VIEWS.keys())}"
        )
    return CUSTOM_VIEWS[name]()
