"""
Tests for PlotlyFigure view
"""

import pytest
import numpy as np
import zarr
import tempfile
import json
from datetime import datetime, date
from unittest.mock import Mock

from figpack.views.PlotlyFigure import PlotlyFigure, CustomJSONEncoder


class TestCustomJSONEncoder:
    """Test CustomJSONEncoder functionality"""

    def test_encode_numpy_array(self):
        """Test encoding numpy arrays"""
        encoder = CustomJSONEncoder()
        arr = np.array([1, 2, 3])
        result = encoder.default(arr)
        assert result == [1, 2, 3]

    def test_encode_numpy_scalar(self):
        """Test encoding numpy scalars"""
        encoder = CustomJSONEncoder()

        # Test numpy integer
        int_val = np.int64(42)
        result = encoder.default(int_val)
        assert result == 42

        # Test numpy float
        float_val = np.float64(3.14)
        result = encoder.default(float_val)
        assert result == 3.14

    def test_encode_datetime(self):
        """Test encoding datetime objects"""
        encoder = CustomJSONEncoder()

        # Test datetime
        dt = datetime(2023, 1, 15, 10, 30, 45)
        result = encoder.default(dt)
        assert result == "2023-01-15T10:30:45"

        # Test date
        d = date(2023, 1, 15)
        result = encoder.default(d)
        assert result == "2023-01-15"

    def test_encode_numpy_datetime64(self):
        """Test encoding numpy datetime64"""
        encoder = CustomJSONEncoder()
        dt = np.datetime64("2023-01-15T10:30:45")
        result = encoder.default(dt)
        assert "2023-01-15" in result

    def test_encode_object_with_isoformat(self):
        """Test encoding objects with isoformat method"""
        encoder = CustomJSONEncoder()

        # Mock object with isoformat
        mock_obj = Mock()
        mock_obj.isoformat.return_value = "2023-01-15T10:30:45"

        result = encoder.default(mock_obj)
        assert result == "2023-01-15T10:30:45"

    def test_encode_unsupported_object(self):
        """Test encoding unsupported objects falls back to default"""
        encoder = CustomJSONEncoder()

        class UnsupportedObject:
            pass

        obj = UnsupportedObject()

        with pytest.raises(TypeError):
            encoder.default(obj)


class TestPlotlyFigure:
    """Test PlotlyFigure view functionality"""

    def test_plotly_figure_creation(self):
        """Test basic PlotlyFigure creation"""
        # Create a mock plotly figure
        mock_fig = Mock()
        mock_fig.to_dict.return_value = {"data": [], "layout": {}}

        plotly_view = PlotlyFigure(mock_fig)
        assert plotly_view.fig == mock_fig

    def test_plotly_figure_write_to_zarr_group(self):
        """Test writing PlotlyFigure to zarr group"""
        with tempfile.TemporaryDirectory() as temp_dir:
            # Create a mock plotly figure with sample data
            mock_fig = Mock()
            fig_dict = {
                "data": [
                    {
                        "x": [1, 2, 3, 4],
                        "y": [10, 11, 12, 13],
                        "type": "scatter",
                        "mode": "lines",
                        "name": "Test Line",
                    }
                ],
                "layout": {
                    "title": "Test Plot",
                    "xaxis": {"title": "X Axis"},
                    "yaxis": {"title": "Y Axis"},
                },
            }
            mock_fig.to_dict.return_value = fig_dict

            plotly_view = PlotlyFigure(mock_fig)

            # Create zarr store and group
            store = zarr.DirectoryStore(temp_dir)
            root = zarr.group(store=store)

            # Write to zarr group
            plotly_view._write_to_zarr_group(root)

            # Verify attributes
            assert root.attrs["view_type"] == "PlotlyFigure"
            assert "figure_data" in root.attrs

            # Parse the stored JSON data
            stored_data = json.loads(root.attrs["figure_data"])
            assert stored_data == fig_dict

    def test_plotly_figure_with_numpy_data(self):
        """Test PlotlyFigure with numpy arrays in data"""
        with tempfile.TemporaryDirectory() as temp_dir:
            # Create a mock plotly figure with numpy data
            mock_fig = Mock()
            fig_dict = {
                "data": [
                    {
                        "x": np.array([1, 2, 3, 4]),
                        "y": np.array([10.5, 11.2, 12.8, 13.1]),
                        "type": "scatter",
                        "mode": "markers",
                    }
                ],
                "layout": {"title": "Numpy Data Plot"},
            }
            mock_fig.to_dict.return_value = fig_dict

            plotly_view = PlotlyFigure(mock_fig)

            # Create zarr store and group
            store = zarr.DirectoryStore(temp_dir)
            root = zarr.group(store=store)

            # Write to zarr group
            plotly_view._write_to_zarr_group(root)

            # Verify the numpy arrays were converted to lists
            stored_data = json.loads(root.attrs["figure_data"])
            assert stored_data["data"][0]["x"] == [1, 2, 3, 4]
            assert stored_data["data"][0]["y"] == [10.5, 11.2, 12.8, 13.1]

    def test_plotly_figure_with_datetime_data(self):
        """Test PlotlyFigure with datetime data"""
        with tempfile.TemporaryDirectory() as temp_dir:
            # Create a mock plotly figure with datetime data
            mock_fig = Mock()
            fig_dict = {
                "data": [
                    {
                        "x": [datetime(2023, 1, 1), datetime(2023, 1, 2)],
                        "y": [10, 20],
                        "type": "scatter",
                    }
                ],
                "layout": {"title": "Time Series Plot"},
            }
            mock_fig.to_dict.return_value = fig_dict

            plotly_view = PlotlyFigure(mock_fig)

            # Create zarr store and group
            store = zarr.DirectoryStore(temp_dir)
            root = zarr.group(store=store)

            # Write to zarr group
            plotly_view._write_to_zarr_group(root)

            # Verify the datetime objects were converted to ISO format
            stored_data = json.loads(root.attrs["figure_data"])
            assert stored_data["data"][0]["x"] == [
                "2023-01-01T00:00:00",
                "2023-01-02T00:00:00",
            ]

    def test_plotly_figure_with_complex_layout(self):
        """Test PlotlyFigure with complex layout"""
        with tempfile.TemporaryDirectory() as temp_dir:
            # Create a mock plotly figure with complex layout
            mock_fig = Mock()
            fig_dict = {
                "data": [
                    {"x": [1, 2, 3], "y": [4, 5, 6], "type": "bar", "name": "Bar Chart"}
                ],
                "layout": {
                    "title": {"text": "Complex Layout", "font": {"size": 20}},
                    "xaxis": {
                        "title": "X Axis",
                        "showgrid": True,
                        "gridcolor": "lightgray",
                    },
                    "yaxis": {"title": "Y Axis", "range": [0, 10]},
                    "showlegend": True,
                    "legend": {"x": 0.8, "y": 0.9},
                },
            }
            mock_fig.to_dict.return_value = fig_dict

            plotly_view = PlotlyFigure(mock_fig)

            # Create zarr store and group
            store = zarr.DirectoryStore(temp_dir)
            root = zarr.group(store=store)

            # Write to zarr group
            plotly_view._write_to_zarr_group(root)

            # Verify the complex layout was preserved
            stored_data = json.loads(root.attrs["figure_data"])
            assert stored_data["layout"]["title"]["text"] == "Complex Layout"
            assert stored_data["layout"]["xaxis"]["showgrid"] is True
            assert stored_data["layout"]["legend"]["x"] == 0.8

    def test_plotly_figure_empty_figure(self):
        """Test PlotlyFigure with empty figure"""
        with tempfile.TemporaryDirectory() as temp_dir:
            # Create a mock empty plotly figure
            mock_fig = Mock()
            fig_dict = {"data": [], "layout": {}}
            mock_fig.to_dict.return_value = fig_dict

            plotly_view = PlotlyFigure(mock_fig)

            # Create zarr store and group
            store = zarr.DirectoryStore(temp_dir)
            root = zarr.group(store=store)

            # Write to zarr group
            plotly_view._write_to_zarr_group(root)

            # Verify empty figure is handled correctly
            assert root.attrs["view_type"] == "PlotlyFigure"
            stored_data = json.loads(root.attrs["figure_data"])
            assert stored_data == {"data": [], "layout": {}}

    def test_plotly_figure_with_multiple_traces(self):
        """Test PlotlyFigure with multiple traces"""
        with tempfile.TemporaryDirectory() as temp_dir:
            # Create a mock plotly figure with multiple traces
            mock_fig = Mock()
            fig_dict = {
                "data": [
                    {
                        "x": [1, 2, 3],
                        "y": [1, 4, 2],
                        "type": "scatter",
                        "mode": "lines",
                        "name": "Line 1",
                    },
                    {
                        "x": [1, 2, 3],
                        "y": [2, 3, 1],
                        "type": "scatter",
                        "mode": "markers",
                        "name": "Points 1",
                    },
                    {"x": [1, 2, 3], "y": [3, 1, 4], "type": "bar", "name": "Bars 1"},
                ],
                "layout": {"title": "Multiple Traces"},
            }
            mock_fig.to_dict.return_value = fig_dict

            plotly_view = PlotlyFigure(mock_fig)

            # Create zarr store and group
            store = zarr.DirectoryStore(temp_dir)
            root = zarr.group(store=store)

            # Write to zarr group
            plotly_view._write_to_zarr_group(root)

            # Verify all traces were preserved
            stored_data = json.loads(root.attrs["figure_data"])
            assert len(stored_data["data"]) == 3
            assert stored_data["data"][0]["name"] == "Line 1"
            assert stored_data["data"][1]["name"] == "Points 1"
            assert stored_data["data"][2]["name"] == "Bars 1"
