"""
MatplotlibFigure view for figpack - displays matplotlib figures
"""

import io
from typing import Any, Union

import zarr

from ..core.figpack_view import FigpackView


class MatplotlibFigure(FigpackView):
    """
    A matplotlib figure visualization component
    """

    def __init__(self, fig):
        """
        Initialize a MatplotlibFigure view

        Args:
            fig: The matplotlib figure object
        """
        self.fig = fig

    def _write_to_zarr_group(self, group: zarr.Group) -> None:
        """
        Write the matplotlib figure data to a Zarr group

        Args:
            group: Zarr group to write data into
        """
        # Set the view type
        group.attrs["view_type"] = "MatplotlibFigure"

        try:
            # Convert matplotlib figure to SVG string
            svg_buffer = io.StringIO()
            self.fig.savefig(
                svg_buffer,
                format="svg",
                bbox_inches="tight",
                facecolor="white",
                edgecolor="none",
            )
            svg_string = svg_buffer.getvalue()
            svg_buffer.close()

            # Store the SVG data
            group.attrs["svg_data"] = svg_string

            # Store figure dimensions for reference
            fig_width, fig_height = self.fig.get_size_inches()
            group.attrs["figure_width_inches"] = float(fig_width)
            group.attrs["figure_height_inches"] = float(fig_height)

            # Store DPI for reference
            group.attrs["figure_dpi"] = float(self.fig.dpi)

        except Exception as e:
            # If SVG export fails, store error information
            group.attrs["svg_data"] = ""
            group.attrs["error"] = f"Failed to export matplotlib figure: {str(e)}"
            group.attrs["figure_width_inches"] = 6.0
            group.attrs["figure_height_inches"] = 4.0
            group.attrs["figure_dpi"] = 100.0
