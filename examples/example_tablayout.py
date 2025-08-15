import os
import numpy as np
import figpack.views as vv


def main():
    view = example_tab_layout()
    upload = os.environ.get("FIGPACK_UPLOAD") == "1"
    view.show(open_in_browser=True, upload=upload)


def example_tab_layout():
    """
    Create an example TabLayout with multiple TimeseriesGraph views
    """
    # Create sample timeseries graphs for different tabs
    signal_a = create_sample_graph("Signal A", color="blue")
    signal_b = create_sample_graph("Signal B", color="red")
    signal_c = create_sample_graph("Signal C", color="green")
    signal_d = create_sample_graph("Signal D", color="purple")
    signal_e = create_sample_graph("Signal E", color="orange")
    signal_f = create_sample_graph("Signal F", color="brown")

    # Create the TabLayout as specified in the task
    view = vv.TabLayout(
        items=[
            vv.TabLayoutItem(label="Signal A", view=signal_a),
            vv.TabLayoutItem(label="Signal B", view=signal_b),
            vv.TabLayoutItem(label="Signal C", view=signal_c),
            vv.TabLayoutItem(label="Signal D", view=signal_d),
            vv.TabLayoutItem(label="Signal E", view=signal_e),
            vv.TabLayoutItem(label="Signal F", view=signal_f),
        ]
    )

    return view


def create_sample_graph(name: str, color: str = "blue"):
    """
    Create a sample TimeseriesGraph for testing
    """
    G = vv.TimeseriesGraph(
        legend_opts={"location": "northwest"},
        y_range=[-10, 10],
        hide_x_gridlines=False,
        hide_y_gridlines=True,
        y_label=name,
    )

    # Generate sample data with different patterns for each graph
    n = 1000
    t = np.arange(0, n) / n * 10

    # Create different signal patterns based on the name
    if "Signal A" in name:
        y = 5 * np.sin(2 * np.pi * t) + 2 * np.cos(4 * np.pi * t)
    elif "Signal B" in name:
        y = 3 * np.sin(3 * np.pi * t) * np.exp(-t / 5)
    elif "Signal C" in name:
        y = 2 * np.sin(np.pi * t) + 3 * np.sin(2 * np.pi * t)
    elif "Signal D" in name:
        y = 4 * np.cos(2 * np.pi * t) + np.sin(8 * np.pi * t)
    elif "Signal E" in name:
        y = np.sin(4 * np.pi * t) + 2 * np.cos(6 * np.pi * t)
    else:
        y = np.sin(2 * np.pi * t) + 0.5 * np.random.randn(len(t))

    G.add_line_series(
        name=name,
        t=t.astype(np.float32),
        y=y.astype(np.float32),
        color=color,
        width=2.0,
    )

    # Add some markers for visual interest
    marker_indices = np.arange(0, len(t), len(t) // 8)
    G.add_marker_series(
        name=f"{name} markers",
        t=t[marker_indices].astype(np.float32),
        y=y[marker_indices].astype(np.float32),
        color=color,
        radius=4,
        shape="circle",
    )

    return G


if __name__ == "__main__":
    main()
