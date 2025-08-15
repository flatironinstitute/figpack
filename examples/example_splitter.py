import os
import numpy as np
import figpack.views as vv


def main():
    view = example_splitter_layout()
    upload = os.environ.get("FIGPACK_UPLOAD") == "1"
    view.show(open_in_browser=True, upload=upload)


def example_splitter_layout():
    """
    Create an example Splitter layout with nested views
    """
    # Create some sample timeseries graphs
    v_signal_a = create_sample_graph("Signal A", color="blue")
    v_signal_b = create_sample_graph("Signal B", color="red")
    v_signal_c = create_sample_graph("Signal C", color="green")
    v_signal_d = create_sample_graph("Signal D", color="purple")
    v_signal_e = create_sample_graph("Signal E", color="orange")
    v_signal_f = create_sample_graph("Signal F", color="brown")

    # Create the complex nested layout as shown in the task description
    view = vv.Splitter(
        direction="vertical",
        item1=(
            vv.LayoutItem(
                vv.Box(
                    direction="horizontal",
                    items=[
                        vv.LayoutItem(v_signal_a, stretch=1, title="Signal A"),
                        vv.LayoutItem(v_signal_b, stretch=2, title="Signal B"),
                        vv.LayoutItem(
                            v_signal_c,
                            min_size=100,
                            max_size=200,
                            title="Signal C",
                        ),
                    ],
                ),
                title="Top Section",
            )
        ),
        item2=(
            vv.LayoutItem(
                vv.Splitter(
                    direction="horizontal",
                    item1=(
                        vv.LayoutItem(
                            vv.Box(
                                direction="horizontal",
                                items=[
                                    vv.LayoutItem(
                                        v_signal_d,
                                        min_size=300,
                                        max_size=350,
                                        title="Signal D",
                                    ),
                                    vv.LayoutItem(v_signal_e, title="Signal E"),
                                ],
                            ),
                            title="Left Bottom",
                        )
                    ),
                    item2=(vv.LayoutItem(v_signal_f, title="Signal F")),
                ),
                title="Bottom Section",
            )
        ),
        split_pos=0.6,  # 60% for top, 40% for bottom
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

    # Generate sample data
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
        y = np.sin(2 * np.pi * t) + 0.5 * np.random.randn(len(t))
    else:
        y = 2 * np.cos(3 * np.pi * t) + np.sin(5 * np.pi * t)

    G.add_line_series(
        name=name,
        t=t.astype(np.float32),
        y=y.astype(np.float32),
        color=color,
        width=2.0,
    )

    # Add some markers
    marker_indices = np.arange(0, len(t), len(t) // 8)
    G.add_marker_series(
        name=f"{name} markers",
        t=t[marker_indices].astype(np.float32),
        y=y[marker_indices].astype(np.float32),
        color=color,
        radius=2,
        shape="circle",
    )

    return G


if __name__ == "__main__":
    main()
