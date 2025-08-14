import numpy as np
import figpack.views as vv


def main():
    view = example_splitter_layout()
    # view.show(open_in_browser=True)
    # view.dev()
    view.upload()


def example_splitter_layout():
    """
    Create an example Splitter layout with nested views
    """
    # Create some sample timeseries graphs
    v_units_table = create_sample_graph("Units Table", color="blue")
    v_raster_plot = create_sample_graph("Raster Plot", color="red")
    v_unit_similarity_matrix = create_sample_graph(
        "Unit Similarity Matrix", color="green"
    )
    v_autocorrelograms = create_sample_graph("Autocorrelograms", color="purple")
    v_average_waveforms = create_sample_graph("Average Waveforms", color="orange")
    v_cross_correlograms = create_sample_graph("Cross Correlograms", color="brown")

    # Create the complex nested layout as shown in the task description
    view = vv.Splitter(
        direction="vertical",
        item1=(
            vv.LayoutItem(
                vv.Box(
                    direction="horizontal",
                    items=[
                        vv.LayoutItem(v_units_table, stretch=1, title="Units Table"),
                        vv.LayoutItem(v_raster_plot, stretch=2, title="Raster Plot"),
                        vv.LayoutItem(
                            v_unit_similarity_matrix,
                            min_size=100,
                            max_size=200,
                            title="Unit Similarity Matrix",
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
                                        v_autocorrelograms,
                                        min_size=300,
                                        max_size=350,
                                        title="Autocorrelograms",
                                    ),
                                    vv.LayoutItem(
                                        v_average_waveforms, title="Average Waveforms"
                                    ),
                                ],
                            ),
                            title="Left Bottom",
                        )
                    ),
                    item2=(
                        vv.LayoutItem(v_cross_correlograms, title="Cross Correlograms")
                    ),
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

    # Create different waveforms based on the name
    if "Units" in name:
        y = 5 * np.sin(2 * np.pi * t) + 2 * np.cos(4 * np.pi * t)
    elif "Raster" in name:
        y = 3 * np.sin(3 * np.pi * t) * np.exp(-t / 5)
    elif "Similarity" in name:
        y = 2 * np.sin(np.pi * t) + 3 * np.sin(2 * np.pi * t)
    elif "Autocorr" in name:
        y = 4 * np.cos(2 * np.pi * t) + np.sin(8 * np.pi * t)
    elif "Waveforms" in name:
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
