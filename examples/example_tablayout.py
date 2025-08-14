import numpy as np
import figpack.views as vv


def main():
    view = example_tab_layout()
    view.show(open_in_browser=True)
    # view.dev()
    # view.upload()


def example_tab_layout():
    """
    Create an example TabLayout with multiple TimeseriesGraph views
    """
    # Create sample timeseries graphs for different tabs
    units_table = create_sample_graph("Units Table", color="blue")
    raster_plot = create_sample_graph("Raster Plot", color="red")
    autocorrelograms = create_sample_graph("Autocorrelograms", color="green")
    avg_waveforms = create_sample_graph("Average Waveforms", color="purple")
    cross_correlograms = create_sample_graph("Cross Correlograms", color="orange")
    similarity_matrix = create_sample_graph("Unit Similarity Matrix", color="brown")

    # Create the TabLayout as specified in the task
    view = vv.TabLayout(
        items=[
            vv.TabLayoutItem(label="Units table", view=units_table),
            vv.TabLayoutItem(label="Raster plot", view=raster_plot),
            vv.TabLayoutItem(label="Autocorrelograms", view=autocorrelograms),
            vv.TabLayoutItem(label="Avg waveforms", view=avg_waveforms),
            vv.TabLayoutItem(label="Cross correlograms", view=cross_correlograms),
            vv.TabLayoutItem(label="Unit similarity matrix", view=similarity_matrix),
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

    # Create different waveforms based on the name
    if "Units" in name:
        y = 5 * np.sin(2 * np.pi * t) + 2 * np.cos(4 * np.pi * t)
    elif "Raster" in name:
        y = 3 * np.sin(3 * np.pi * t) * np.exp(-t / 5)
    elif "Autocorrelograms" in name:
        y = 2 * np.sin(np.pi * t) + 3 * np.sin(2 * np.pi * t)
    elif "Waveforms" in name:
        y = 4 * np.cos(2 * np.pi * t) + np.sin(8 * np.pi * t)
    elif "Cross" in name:
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
