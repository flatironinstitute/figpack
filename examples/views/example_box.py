import os
import numpy as np
import figpack.views as vv


def main():
    view = example_box_layout()
    title = "Example Box Layout"
    description_md = """
# Example Box Layout

This is an example of a Box layout created using figpack, demonstrating nested TimeseriesGraph views.
"""

    view.show(open_in_browser=True, title=title, description=description_md)


def example_box_layout():
    """
    Create an example Box layout with nested TimeseriesGraph views
    """
    # Create some sample timeseries graphs
    graph1 = create_sample_graph("Graph 1", color="blue")
    graph2 = create_sample_graph("Graph 2", color="red")
    graph3 = create_sample_graph("Graph 3", color="green")
    graph4 = create_sample_graph("Graph 4", color="purple")

    # Create a nested box layout
    view = vv.Box(
        direction="vertical",
        show_titles=True,
        items=[
            vv.LayoutItem(
                vv.Box(
                    direction="horizontal",
                    show_titles=True,
                    items=[
                        vv.LayoutItem(graph1, stretch=1, title="Left Graph"),
                        vv.LayoutItem(
                            graph2, stretch=2, title="Right Graph (2x stretch)"
                        ),
                        vv.LayoutItem(
                            graph3,
                            min_size=250,
                            max_size=250,
                            title="Fixed Size Graph",
                        ),
                    ],
                ),
                title="Top Row",
                collapsible=True,
            ),
            vv.LayoutItem(
                vv.Box(
                    direction="horizontal",
                    show_titles=True,
                    items=[
                        vv.LayoutItem(
                            graph4, min_size=300, max_size=350, title="Bottom Left"
                        ),
                        vv.LayoutItem(
                            create_sample_graph("Graph 5", color="orange"),
                            stretch=1,
                            title="Bottom Right",
                        ),
                    ],
                ),
                title="Bottom Row",
                collapsible=True,
            ),
        ],
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
    )

    # Generate sample data
    n = 1000
    t = np.arange(0, n) / n * 10

    # Create different signal patterns based on the name
    if "1" in name:
        y = 5 * np.sin(2 * np.pi * t) + 2 * np.cos(4 * np.pi * t)
    elif "2" in name:
        y = 3 * np.sin(3 * np.pi * t) * np.exp(-t / 5)
    elif "3" in name:
        y = 2 * np.sin(np.pi * t) + 3 * np.sin(2 * np.pi * t)
    elif "4" in name:
        y = 4 * np.cos(2 * np.pi * t) + np.sin(8 * np.pi * t)
    else:
        y = np.sin(2 * np.pi * t) + 0.5 * np.random.randn(len(t))

    G.add_line_series(
        name=name,
        t=t.astype(np.float32),
        y=y.astype(np.float32),
        color=color,
        width=2.0,
    )

    # Add some markers
    marker_indices = np.arange(0, len(t), len(t) // 10)
    G.add_marker_series(
        name=f"{name} markers",
        t=t[marker_indices].astype(np.float32),
        y=y[marker_indices].astype(np.float32),
        color=color,
        radius=3,
        shape="circle",
    )

    return G


if __name__ == "__main__":
    main()
