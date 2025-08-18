"""
Tests for TimeseriesGraph view
"""

import pytest
import numpy as np
import zarr
import tempfile

from figpack.views.TimeseriesGraph import (
    TimeseriesGraph,
    TGLineSeries,
    TGMarkerSeries,
    TGIntervalSeries,
)


class TestTimeseriesGraph:
    """Test TimeseriesGraph view functionality"""

    def test_timeseries_graph_creation_default(self):
        """Test basic TimeseriesGraph creation with defaults"""
        graph = TimeseriesGraph()

        assert graph.legend_opts == {}
        assert graph.y_range is None
        assert graph.hide_x_gridlines is False
        assert graph.hide_y_gridlines is False
        assert graph.y_label == ""
        assert graph._series == []

    def test_timeseries_graph_creation_with_options(self):
        """Test TimeseriesGraph creation with custom options"""
        legend_opts = {"location": "northwest"}
        y_range = [0, 100]

        graph = TimeseriesGraph(
            legend_opts=legend_opts,
            y_range=y_range,
            hide_x_gridlines=True,
            hide_y_gridlines=True,
            y_label="Voltage (mV)",
        )

        assert graph.legend_opts == legend_opts
        assert graph.y_range == y_range
        assert graph.hide_x_gridlines is True
        assert graph.hide_y_gridlines is True
        assert graph.y_label == "Voltage (mV)"

    def test_add_line_series(self):
        """Test adding line series to graph"""
        graph = TimeseriesGraph()

        t = np.array([1, 2, 3, 4, 5])
        y = np.array([10, 20, 15, 25, 30])

        graph.add_line_series(
            name="test_line", t=t, y=y, color="red", width=2.0, dash=[5, 2]
        )

        assert len(graph._series) == 1
        series = graph._series[0]
        assert isinstance(series, TGLineSeries)
        assert series.name == "test_line"
        assert np.array_equal(series.t, t)
        assert np.array_equal(series.y, y)
        assert series.color == "red"
        assert series.width == 2.0
        assert series.dash == [5, 2]

    def test_add_marker_series(self):
        """Test adding marker series to graph"""
        graph = TimeseriesGraph()

        t = np.array([1, 3, 5])
        y = np.array([10, 20, 30])

        graph.add_marker_series(
            name="test_markers", t=t, y=y, color="blue", radius=5.0, shape="square"
        )

        assert len(graph._series) == 1
        series = graph._series[0]
        assert isinstance(series, TGMarkerSeries)
        assert series.name == "test_markers"
        assert np.array_equal(series.t, t)
        assert np.array_equal(series.y, y)
        assert series.color == "blue"
        assert series.radius == 5.0
        assert series.shape == "square"

    def test_add_interval_series(self):
        """Test adding interval series to graph"""
        graph = TimeseriesGraph()

        t_start = np.array([1, 3, 5])
        t_end = np.array([2, 4, 6])

        graph.add_interval_series(
            name="test_intervals",
            t_start=t_start,
            t_end=t_end,
            color="green",
            alpha=0.3,
        )

        assert len(graph._series) == 1
        series = graph._series[0]
        assert isinstance(series, TGIntervalSeries)
        assert series.name == "test_intervals"
        assert np.array_equal(series.t_start, t_start)
        assert np.array_equal(series.t_end, t_end)
        assert series.color == "green"
        assert series.alpha == 0.3

    def test_multiple_series(self):
        """Test adding multiple series to graph"""
        graph = TimeseriesGraph()

        # Add line series
        t1 = np.array([1, 2, 3])
        y1 = np.array([10, 20, 15])
        graph.add_line_series(name="line1", t=t1, y=y1)

        # Add marker series
        t2 = np.array([1.5, 2.5])
        y2 = np.array([15, 18])
        graph.add_marker_series(name="markers1", t=t2, y=y2)

        # Add interval series
        t_start = np.array([0.5])
        t_end = np.array([3.5])
        graph.add_interval_series(name="interval1", t_start=t_start, t_end=t_end)

        assert len(graph._series) == 3
        assert isinstance(graph._series[0], TGLineSeries)
        assert isinstance(graph._series[1], TGMarkerSeries)
        assert isinstance(graph._series[2], TGIntervalSeries)

    def test_write_to_zarr_group(self):
        """Test writing TimeseriesGraph to zarr group"""
        with tempfile.TemporaryDirectory() as temp_dir:
            graph = TimeseriesGraph(
                legend_opts={"location": "northeast"},
                y_range=[0, 50],
                hide_x_gridlines=True,
                y_label="Test Y Label",
            )

            # Add some series
            t = np.array([1, 2, 3, 4])
            y = np.array([10, 20, 15, 25])
            graph.add_line_series(name="test_line", t=t, y=y, color="red")

            t_markers = np.array([1.5, 2.5, 3.5])
            y_markers = np.array([12, 18, 22])
            graph.add_marker_series(name="test_markers", t=t_markers, y=y_markers)

            # Create zarr store and group
            store = zarr.DirectoryStore(temp_dir)
            root = zarr.group(store=store)

            # Write to zarr group
            graph._write_to_zarr_group(root)

            # Verify main attributes
            assert root.attrs["view_type"] == "TimeseriesGraph"
            assert root.attrs["legend_opts"] == {"location": "northeast"}
            assert root.attrs["y_range"] == [0, 50]
            assert root.attrs["hide_x_gridlines"] is True
            assert root.attrs["hide_y_gridlines"] is False
            assert root.attrs["y_label"] == "Test Y Label"
            assert root.attrs["series_names"] == ["test_line", "test_markers"]

            # Verify series groups were created
            assert "test_line" in root
            assert "test_markers" in root


class TestTGLineSeries:
    """Test TGLineSeries functionality"""

    def test_line_series_creation(self):
        """Test basic line series creation"""
        t = np.array([1, 2, 3, 4])
        y = np.array([10, 20, 15, 25])

        series = TGLineSeries(
            name="test", t=t, y=y, color="blue", width=1.5, dash=[3, 1]
        )

        assert series.name == "test"
        assert np.array_equal(series.t, t)
        assert np.array_equal(series.y, y)
        assert series.color == "blue"
        assert series.width == 1.5
        assert series.dash == [3, 1]

    def test_line_series_validation(self):
        """Test line series input validation"""
        # Test 2D time array
        with pytest.raises(AssertionError, match="Time array must be 1-dimensional"):
            TGLineSeries(
                name="test",
                t=np.array([[1, 2], [3, 4]]),
                y=np.array([10, 20]),
                color="blue",
                width=1.0,
                dash=None,
            )

        # Test 2D y array
        with pytest.raises(AssertionError, match="Y array must be 1-dimensional"):
            TGLineSeries(
                name="test",
                t=np.array([1, 2]),
                y=np.array([[10, 20], [15, 25]]),
                color="blue",
                width=1.0,
                dash=None,
            )

        # Test mismatched lengths
        with pytest.raises(
            AssertionError, match="Time and Y arrays must have the same length"
        ):
            TGLineSeries(
                name="test",
                t=np.array([1, 2, 3]),
                y=np.array([10, 20]),
                color="blue",
                width=1.0,
                dash=None,
            )

    def test_line_series_write_to_zarr_group(self):
        """Test writing line series to zarr group"""
        with tempfile.TemporaryDirectory() as temp_dir:
            t = np.array([1, 2, 3, 4])
            y = np.array([10, 20, 15, 25])

            series = TGLineSeries(
                name="test_line", t=t, y=y, color="red", width=2.0, dash=[5, 2]
            )

            # Create zarr store and group
            store = zarr.DirectoryStore(temp_dir)
            root = zarr.group(store=store)

            # Write to zarr group
            series._write_to_zarr_group(root)

            # Verify attributes
            assert root.attrs["series_type"] == "line"
            assert root.attrs["color"] == "red"
            assert root.attrs["width"] == 2.0
            assert root.attrs["dash"] == [5, 2]

            # Verify datasets
            assert "t" in root
            assert "y" in root
            assert np.array_equal(root["t"][:], t)
            assert np.array_equal(root["y"][:], y)

    def test_line_series_no_dash(self):
        """Test line series with no dash pattern"""
        with tempfile.TemporaryDirectory() as temp_dir:
            t = np.array([1, 2, 3])
            y = np.array([10, 20, 15])

            series = TGLineSeries(
                name="solid_line", t=t, y=y, color="blue", width=1.0, dash=None
            )

            store = zarr.DirectoryStore(temp_dir)
            root = zarr.group(store=store)

            series._write_to_zarr_group(root)

            # Verify dash is empty list when None
            assert root.attrs["dash"] == []


class TestTGMarkerSeries:
    """Test TGMarkerSeries functionality"""

    def test_marker_series_creation(self):
        """Test basic marker series creation"""
        t = np.array([1, 3, 5])
        y = np.array([10, 20, 30])

        series = TGMarkerSeries(
            name="test_markers", t=t, y=y, color="green", radius=4.0, shape="circle"
        )

        assert series.name == "test_markers"
        assert np.array_equal(series.t, t)
        assert np.array_equal(series.y, y)
        assert series.color == "green"
        assert series.radius == 4.0
        assert series.shape == "circle"

    def test_marker_series_validation(self):
        """Test marker series input validation"""
        # Test 2D time array
        with pytest.raises(AssertionError, match="Time array must be 1-dimensional"):
            TGMarkerSeries(
                name="test",
                t=np.array([[1, 2], [3, 4]]),
                y=np.array([10, 20]),
                color="blue",
                radius=3.0,
                shape="circle",
            )

        # Test mismatched lengths
        with pytest.raises(
            AssertionError, match="Time and Y arrays must have the same length"
        ):
            TGMarkerSeries(
                name="test",
                t=np.array([1, 2, 3]),
                y=np.array([10, 20]),
                color="blue",
                radius=3.0,
                shape="circle",
            )

    def test_marker_series_write_to_zarr_group(self):
        """Test writing marker series to zarr group"""
        with tempfile.TemporaryDirectory() as temp_dir:
            t = np.array([1, 3, 5])
            y = np.array([10, 20, 30])

            series = TGMarkerSeries(
                name="test_markers",
                t=t,
                y=y,
                color="purple",
                radius=6.0,
                shape="square",
            )

            # Create zarr store and group
            store = zarr.DirectoryStore(temp_dir)
            root = zarr.group(store=store)

            # Write to zarr group
            series._write_to_zarr_group(root)

            # Verify attributes
            assert root.attrs["series_type"] == "marker"
            assert root.attrs["color"] == "purple"
            assert root.attrs["radius"] == 6.0
            assert root.attrs["shape"] == "square"

            # Verify datasets
            assert "t" in root
            assert "y" in root
            assert np.array_equal(root["t"][:], t)
            assert np.array_equal(root["y"][:], y)


class TestTGIntervalSeries:
    """Test TGIntervalSeries functionality"""

    def test_interval_series_creation(self):
        """Test basic interval series creation"""
        t_start = np.array([1, 3, 5])
        t_end = np.array([2, 4, 6])

        series = TGIntervalSeries(
            name="test_intervals",
            t_start=t_start,
            t_end=t_end,
            color="orange",
            alpha=0.7,
        )

        assert series.name == "test_intervals"
        assert np.array_equal(series.t_start, t_start)
        assert np.array_equal(series.t_end, t_end)
        assert series.color == "orange"
        assert series.alpha == 0.7

    def test_interval_series_validation(self):
        """Test interval series input validation"""
        # Test 2D start time array
        with pytest.raises(
            AssertionError, match="Start time array must be 1-dimensional"
        ):
            TGIntervalSeries(
                name="test",
                t_start=np.array([[1, 2], [3, 4]]),
                t_end=np.array([2, 4]),
                color="blue",
                alpha=0.5,
            )

        # Test 2D end time array
        with pytest.raises(
            AssertionError, match="End time array must be 1-dimensional"
        ):
            TGIntervalSeries(
                name="test",
                t_start=np.array([1, 3]),
                t_end=np.array([[2, 4], [5, 6]]),
                color="blue",
                alpha=0.5,
            )

        # Test mismatched lengths
        with pytest.raises(
            AssertionError, match="Start and end time arrays must have the same length"
        ):
            TGIntervalSeries(
                name="test",
                t_start=np.array([1, 3, 5]),
                t_end=np.array([2, 4]),
                color="blue",
                alpha=0.5,
            )

        # Test start > end
        with pytest.raises(
            AssertionError, match="Start times must be less than or equal to end times"
        ):
            TGIntervalSeries(
                name="test",
                t_start=np.array([3, 1]),
                t_end=np.array([2, 4]),
                color="blue",
                alpha=0.5,
            )

    def test_interval_series_write_to_zarr_group(self):
        """Test writing interval series to zarr group"""
        with tempfile.TemporaryDirectory() as temp_dir:
            t_start = np.array([1, 3, 5])
            t_end = np.array([2, 4, 6])

            series = TGIntervalSeries(
                name="test_intervals",
                t_start=t_start,
                t_end=t_end,
                color="cyan",
                alpha=0.4,
            )

            # Create zarr store and group
            store = zarr.DirectoryStore(temp_dir)
            root = zarr.group(store=store)

            # Write to zarr group
            series._write_to_zarr_group(root)

            # Verify attributes
            assert root.attrs["series_type"] == "interval"
            assert root.attrs["color"] == "cyan"
            assert root.attrs["alpha"] == 0.4

            # Verify datasets
            assert "t_start" in root
            assert "t_end" in root
            assert np.array_equal(root["t_start"][:], t_start)
            assert np.array_equal(root["t_end"][:], t_end)

    def test_interval_series_equal_start_end(self):
        """Test interval series with equal start and end times"""
        t_start = np.array([1, 3, 5])
        t_end = np.array([1, 3, 5])  # Equal to start times

        series = TGIntervalSeries(
            name="zero_width_intervals",
            t_start=t_start,
            t_end=t_end,
            color="black",
            alpha=1.0,
        )

        # Should not raise an error
        assert np.array_equal(series.t_start, t_start)
        assert np.array_equal(series.t_end, t_end)


class TestTimeseriesGraphIntegration:
    """Integration tests for TimeseriesGraph with all series types"""

    def test_complex_graph_with_all_series_types(self):
        """Test a complex graph with all types of series"""
        with tempfile.TemporaryDirectory() as temp_dir:
            graph = TimeseriesGraph(
                legend_opts={"location": "southwest", "fontsize": 12},
                y_range=[-10, 50],
                hide_x_gridlines=False,
                hide_y_gridlines=True,
                y_label="Mixed Data (units)",
            )

            # Add line series
            t_line = np.linspace(0, 10, 100)
            y_line = np.sin(t_line) * 20 + 10
            graph.add_line_series(
                name="sine_wave", t=t_line, y=y_line, color="blue", width=2.0
            )

            # Add marker series
            t_markers = np.array([2, 4, 6, 8])
            y_markers = np.array([30, 35, 25, 40])
            graph.add_marker_series(
                name="peak_points",
                t=t_markers,
                y=y_markers,
                color="red",
                radius=5.0,
                shape="diamond",
            )

            # Add interval series
            t_start = np.array([1, 5, 7])
            t_end = np.array([3, 6, 9])
            graph.add_interval_series(
                name="active_periods",
                t_start=t_start,
                t_end=t_end,
                color="lightgreen",
                alpha=0.3,
            )

            # Create zarr store and group
            store = zarr.DirectoryStore(temp_dir)
            root = zarr.group(store=store)

            # Write to zarr group
            graph._write_to_zarr_group(root)

            # Verify main graph attributes
            assert root.attrs["view_type"] == "TimeseriesGraph"
            assert root.attrs["legend_opts"] == {
                "location": "southwest",
                "fontsize": 12,
            }
            assert root.attrs["y_range"] == [-10, 50]
            assert root.attrs["hide_x_gridlines"] is False
            assert root.attrs["hide_y_gridlines"] is True
            assert root.attrs["y_label"] == "Mixed Data (units)"
            assert set(root.attrs["series_names"]) == {
                "sine_wave",
                "peak_points",
                "active_periods",
            }

            # Verify all series groups exist
            assert "sine_wave" in root
            assert "peak_points" in root
            assert "active_periods" in root

            # Verify series types
            assert root["sine_wave"].attrs["series_type"] == "line"
            assert root["peak_points"].attrs["series_type"] == "marker"
            assert root["active_periods"].attrs["series_type"] == "interval"

    def test_unknown_series_type_error(self):
        """Test that unknown series types raise an error"""
        with tempfile.TemporaryDirectory() as temp_dir:
            graph = TimeseriesGraph()

            # Create a mock unknown series type
            class UnknownSeries:
                def __init__(self):
                    self.name = "unknown"

            # Manually add unknown series to bypass normal methods
            graph._series.append(UnknownSeries())

            store = zarr.DirectoryStore(temp_dir)
            root = zarr.group(store=store)

            # Should raise ValueError for unknown series type
            with pytest.raises(ValueError, match="Unknown series type"):
                graph._write_to_zarr_group(root)
