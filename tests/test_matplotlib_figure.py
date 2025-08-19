"""
Tests for MatplotlibFigure view
"""

import tempfile
from unittest.mock import Mock, patch

import matplotlib.pyplot as plt
import numpy as np
import pytest
import zarr

from figpack.views.MatplotlibFigure import MatplotlibFigure


class TestMatplotlibFigure:
    """Test MatplotlibFigure view functionality"""

    def test_matplotlib_figure_creation(self):
        """Test basic MatplotlibFigure creation"""
        fig, ax = plt.subplots()
        ax.plot([1, 2, 3], [1, 4, 2])

        matplotlib_view = MatplotlibFigure(fig)
        assert matplotlib_view.fig == fig

        plt.close(fig)

    def test_matplotlib_figure_write_to_zarr_group_success(self):
        """Test writing MatplotlibFigure to zarr group successfully"""
        with tempfile.TemporaryDirectory() as temp_dir:
            # Create a simple matplotlib figure
            fig, ax = plt.subplots(figsize=(8, 6))
            ax.plot([1, 2, 3, 4], [1, 4, 2, 3], label="test line")
            ax.set_xlabel("X axis")
            ax.set_ylabel("Y axis")
            ax.set_title("Test Plot")
            ax.legend()

            matplotlib_view = MatplotlibFigure(fig)

            # Create zarr store and group
            store = zarr.DirectoryStore(temp_dir)
            root = zarr.group(store=store)

            # Write to zarr group
            matplotlib_view._write_to_zarr_group(root)

            # Verify attributes
            assert root.attrs["view_type"] == "MatplotlibFigure"
            assert "svg_data" in root.attrs
            assert root.attrs["svg_data"] != ""
            assert "figure_width_inches" in root.attrs
            assert "figure_height_inches" in root.attrs
            assert "figure_dpi" in root.attrs

            # Check that the SVG contains expected elements
            svg_data = root.attrs["svg_data"]
            assert "<svg" in svg_data
            assert "</svg>" in svg_data

            # Check figure dimensions
            assert root.attrs["figure_width_inches"] == 8.0
            assert root.attrs["figure_height_inches"] == 6.0
            assert root.attrs["figure_dpi"] == fig.dpi

            plt.close(fig)

    def test_matplotlib_figure_write_to_zarr_group_with_error(self):
        """Test writing MatplotlibFigure to zarr group when savefig fails"""
        with tempfile.TemporaryDirectory() as temp_dir:
            # Create a mock figure that will raise an exception on savefig
            mock_fig = Mock()
            mock_fig.savefig.side_effect = Exception("Savefig failed")
            mock_fig.get_size_inches.return_value = (6.0, 4.0)
            mock_fig.dpi = 100.0

            matplotlib_view = MatplotlibFigure(mock_fig)

            # Create zarr store and group
            store = zarr.DirectoryStore(temp_dir)
            root = zarr.group(store=store)

            # Write to zarr group - should handle the exception gracefully
            matplotlib_view._write_to_zarr_group(root)

            # Verify error handling
            assert root.attrs["view_type"] == "MatplotlibFigure"
            assert root.attrs["svg_data"] == ""
            assert "error" in root.attrs
            assert "Failed to export matplotlib figure" in root.attrs["error"]
            assert root.attrs["figure_width_inches"] == 6.0
            assert root.attrs["figure_height_inches"] == 4.0
            assert root.attrs["figure_dpi"] == 100.0

    def test_matplotlib_figure_with_complex_plot(self):
        """Test MatplotlibFigure with a more complex plot"""
        with tempfile.TemporaryDirectory() as temp_dir:
            # Create a complex matplotlib figure
            fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(10, 8))

            # First subplot
            x = np.linspace(0, 10, 100)
            y1 = np.sin(x)
            ax1.plot(x, y1, "b-", label="sin(x)")
            ax1.set_title("Sine Wave")
            ax1.legend()
            ax1.grid(True)

            # Second subplot
            y2 = np.cos(x)
            ax2.plot(x, y2, "r--", label="cos(x)")
            ax2.set_title("Cosine Wave")
            ax2.set_xlabel("X values")
            ax2.legend()
            ax2.grid(True)

            plt.tight_layout()

            matplotlib_view = MatplotlibFigure(fig)

            # Create zarr store and group
            store = zarr.DirectoryStore(temp_dir)
            root = zarr.group(store=store)

            # Write to zarr group
            matplotlib_view._write_to_zarr_group(root)

            # Verify the complex plot was saved correctly
            assert root.attrs["view_type"] == "MatplotlibFigure"
            svg_data = root.attrs["svg_data"]
            assert "<svg" in svg_data
            assert (
                "sin(x)" in svg_data or "cos(x)" in svg_data
            )  # Legend text should be in SVG

            plt.close(fig)

    def test_matplotlib_figure_custom_dpi(self):
        """Test MatplotlibFigure with custom DPI"""
        with tempfile.TemporaryDirectory() as temp_dir:
            # Create figure with custom DPI
            fig = plt.figure(figsize=(6, 4), dpi=150)
            ax = fig.add_subplot(111)
            ax.plot([1, 2, 3], [1, 4, 2])

            matplotlib_view = MatplotlibFigure(fig)

            # Create zarr store and group
            store = zarr.DirectoryStore(temp_dir)
            root = zarr.group(store=store)

            # Write to zarr group
            matplotlib_view._write_to_zarr_group(root)

            # Verify DPI is correctly stored
            assert root.attrs["figure_dpi"] == 150.0

            plt.close(fig)

    def test_matplotlib_figure_empty_plot(self):
        """Test MatplotlibFigure with empty plot"""
        with tempfile.TemporaryDirectory() as temp_dir:
            # Create empty figure
            fig, ax = plt.subplots()
            # Don't add any data to the plot

            matplotlib_view = MatplotlibFigure(fig)

            # Create zarr store and group
            store = zarr.DirectoryStore(temp_dir)
            root = zarr.group(store=store)

            # Write to zarr group
            matplotlib_view._write_to_zarr_group(root)

            # Should still work with empty plot
            assert root.attrs["view_type"] == "MatplotlibFigure"
            assert "svg_data" in root.attrs

            plt.close(fig)
