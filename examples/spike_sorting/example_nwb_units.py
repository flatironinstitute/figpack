import figpack_spike_sorting.views as ssv
from figpack.views import Box, Splitter, LayoutItem
import lindi


def example_nwb_units():
    print(f"Loading from remote NWB file...")

    # Load NWB file once and share between views
    nwb_file = lindi.LindiH5pyFile.from_hdf5_file(
        "https://api.dandiarchive.org/api/assets/37ca1798-b14c-4224-b8f0-037e27725336/download/"
    )
    units_path = "/units"

    # Create units selector table
    columns = [ssv.UnitsTableColumn(key="unitId", label="Unit", dtype="int")]
    rows = []
    for unit_id in nwb_file[units_path]["id"]:
        rows.append(
            ssv.UnitsTableRow(
                unit_id=str(unit_id),
                values={},
            )
        )
    units_table = ssv.UnitsTable(
        columns=columns,
        rows=rows,
    )

    # Create raster plot without its own units selector
    raster_plot = ssv.RasterPlot.from_nwb_units_table(
        nwb_file,
        units_path=units_path,
        include_units_selector=False,
    )

    # Create spike amplitudes plot without its own units selector
    spike_amplitudes = ssv.SpikeAmplitudes.from_nwb_units_table(
        nwb_file,
        units_path=units_path,
        include_units_selector=False,
    )

    # Create vertical splitter for raster and amplitudes
    right_splitter = Splitter(
        direction="vertical",
        item1=LayoutItem(view=raster_plot, title="Raster Plot"),
        item2=LayoutItem(view=spike_amplitudes, title="Spike Amplitudes"),
        split_pos=0.5,  # Equal space for both views
    )

    # Create horizontal box layout for units table and splitter
    layout = Box(
        direction="horizontal",
        items=[
            LayoutItem(
                view=units_table, max_size=150, title="Units"
            ),  # Fixed width for units table
            LayoutItem(view=right_splitter),  # Takes remaining space
        ],
    )

    layout.show(title="NWB Units Example")


if __name__ == "__main__":
    example_nwb_units()
