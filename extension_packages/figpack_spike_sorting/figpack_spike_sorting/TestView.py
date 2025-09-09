import figpack
from .spike_sorting_extension import spike_sorting_extension


class TestView(figpack.ExtensionView):
    """
    A test view for the spike sorting extension
    """

    def __init__(self):
        """
        Initialize a TestView for the spike sorting extension
        """
        super().__init__(extension=spike_sorting_extension)

    def _write_to_zarr_group(self, group: figpack.Group) -> None:
        """
        Write the view data to a Zarr group

        Args:
            group: Zarr group to write data into
        """
        # Set view type
        group.attrs["view_type"] = "TestView"
