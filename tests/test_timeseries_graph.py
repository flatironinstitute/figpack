import numpy as np
import pytest
import zarr
import zarr.storage

import figpack
from figpack.views.TimeseriesGraph import (
    TimeseriesGraph,
    TGLineSeries,
    TGMarkerSeries,
    TGIntervalSeries,
)


def test_init_basic():
    """Test basic initialization with default values"""
    graph = TimeseriesGraph()
    assert graph.legend_opts == {}
    assert graph.y_range is None
    assert not graph.hide_x_gridlines
    assert not graph.hide_y_gridlines
    assert graph.y_label == ""
    assert len(graph._series) == 0


def test_init_with_options():
    """Test initialization with custom options"""
    legend_opts = {"location": "northwest"}
    y_range = [-1.0, 1.0]
    graph = TimeseriesGraph(
        legend_opts=legend_opts,
        y_range=y_range,
        hide_x_gridlines=True,
        hide_y_gridlines=True,
        y_label="Value",
    )
    assert graph.legend_opts == legend_opts
    assert graph.y_range == y_range
    assert graph.hide_x_gridlines
    assert graph.hide_y_gridlines
    assert graph.y_label == "Value"


def test_init_with_nav_and_labels_options():
    """Test initialization with nav toolbar and time axis labels options"""
    graph = TimeseriesGraph(
        hide_nav_toolbar=True,
        hide_time_axis_labels=True,
    )
    assert graph.hide_nav_toolbar
    assert graph.hide_time_axis_labels

    # Test default values
    graph2 = TimeseriesGraph()
    assert not graph2.hide_nav_toolbar
    assert not graph2.hide_time_axis_labels


def test_line_series():
    """Test adding and storing line series"""
    graph = TimeseriesGraph()
    t = np.linspace(0, 10, 100)
    y = np.sin(t)

    # Test with default options
    graph.add_line_series(name="sine", t=t, y=y)
    assert len(graph._series) == 1
    series = graph._series[0]
    assert isinstance(series, TGLineSeries)
    assert series.name == "sine"
    assert np.array_equal(series.t, t)
    assert np.array_equal(series.y, y)
    assert series.color == "blue"
    assert series.width == 1.0
    assert series.dash is None

    # Test with custom options
    graph.add_line_series(
        name="cosine",
        t=t,
        y=np.cos(t),
        color="red",
        width=2.0,
        dash=[5.0, 2.0],
    )
    assert len(graph._series) == 2
    series = graph._series[1]
    assert series.color == "red"
    assert series.width == 2.0
    assert series.dash == [5.0, 2.0]


def test_marker_series():
    """Test adding and storing marker series"""
    graph = TimeseriesGraph()
    t = np.array([1.0, 2.0, 3.0])
    y = np.array([0.1, 0.2, 0.3])

    # Test with default options
    graph.add_marker_series(name="points", t=t, y=y)
    assert len(graph._series) == 1
    series = graph._series[0]
    assert isinstance(series, TGMarkerSeries)
    assert series.name == "points"
    assert np.array_equal(series.t, t)
    assert np.array_equal(series.y, y)
    assert series.color == "blue"
    assert series.radius == 3.0
    assert series.shape == "circle"

    # Test with custom options
    graph.add_marker_series(
        name="squares",
        t=t,
        y=y * 2,
        color="green",
        radius=5.0,
        shape="square",
    )
    assert len(graph._series) == 2
    series = graph._series[1]
    assert series.color == "green"
    assert series.radius == 5.0
    assert series.shape == "square"


def test_interval_series():
    """Test adding and storing interval series"""
    graph = TimeseriesGraph()
    t_start = np.array([1.0, 4.0])
    t_end = np.array([2.0, 5.0])

    # Test with default options
    graph.add_interval_series(name="events", t_start=t_start, t_end=t_end)
    assert len(graph._series) == 1
    series = graph._series[0]
    assert isinstance(series, TGIntervalSeries)
    assert series.name == "events"
    assert np.array_equal(series.t_start, t_start)
    assert np.array_equal(series.t_end, t_end)
    assert series.color == "lightblue"
    assert series.alpha == 0.5

    # Test with custom options
    graph.add_interval_series(
        name="periods",
        t_start=t_start * 2,
        t_end=t_end * 2,
        color="yellow",
        alpha=0.8,
    )
    assert len(graph._series) == 2
    series = graph._series[1]
    assert series.color == "yellow"
    assert series.alpha == 0.8


def test_line_series_validation():
    """Test input validation for line series"""
    t = np.array([1.0, 2.0])
    y = np.array([0.1, 0.2])

    # Test with mismatched array sizes
    with pytest.raises(AssertionError):
        TGLineSeries(name="test", t=t, y=y[:-1], color="blue", width=1.0, dash=None)

    # Test with 2D arrays
    with pytest.raises(AssertionError):
        TGLineSeries(
            name="test", t=t.reshape(-1, 1), y=y, color="blue", width=1.0, dash=None
        )
    with pytest.raises(AssertionError):
        TGLineSeries(
            name="test", t=t, y=y.reshape(-1, 1), color="blue", width=1.0, dash=None
        )


def test_marker_series_validation():
    """Test input validation for marker series"""
    t = np.array([1.0, 2.0])
    y = np.array([0.1, 0.2])

    # Test with mismatched array sizes
    with pytest.raises(AssertionError):
        TGMarkerSeries(
            name="test", t=t, y=y[:-1], color="blue", radius=3.0, shape="circle"
        )

    # Test with 2D arrays
    with pytest.raises(AssertionError):
        TGMarkerSeries(
            name="test",
            t=t.reshape(-1, 1),
            y=y,
            color="blue",
            radius=3.0,
            shape="circle",
        )
    with pytest.raises(AssertionError):
        TGMarkerSeries(
            name="test",
            t=t,
            y=y.reshape(-1, 1),
            color="blue",
            radius=3.0,
            shape="circle",
        )


def test_interval_series_validation():
    """Test input validation for interval series"""
    t_start = np.array([1.0, 2.0])
    t_end = np.array([2.0, 3.0])

    # Test with mismatched array sizes
    with pytest.raises(AssertionError):
        TGIntervalSeries(
            name="test", t_start=t_start, t_end=t_end[:-1], color="blue", alpha=0.5
        )

    # Test with 2D arrays
    with pytest.raises(AssertionError):
        TGIntervalSeries(
            name="test",
            t_start=t_start.reshape(-1, 1),
            t_end=t_end,
            color="blue",
            alpha=0.5,
        )

    # Test with invalid intervals (end before start)
    with pytest.raises(AssertionError):
        TGIntervalSeries(
            name="test", t_start=t_end, t_end=t_start, color="blue", alpha=0.5
        )


def test_zarr_storage():
    """Test writing graph data to Zarr storage"""
    graph = TimeseriesGraph(
        legend_opts={"location": "northwest"},
        y_range=[-1.0, 1.0],
        y_label="Value",
        hide_nav_toolbar=True,
        hide_time_axis_labels=True,
    )

    # Add different types of series
    t = np.linspace(0, 10, 100)
    graph.add_line_series(name="line", t=t, y=np.sin(t), color="red")
    graph.add_marker_series(
        name="markers", t=t[::10], y=np.sin(t[::10]), color="blue", shape="square"
    )
    graph.add_interval_series(
        name="intervals",
        t_start=np.array([1.0, 4.0]),
        t_end=np.array([2.0, 5.0]),
        color="gray",
    )

    # Write to Zarr
    store = zarr.storage.MemoryStore()
    root = zarr.group(store=store)
    group = figpack.Group(root.create_group("test"))
    graph.write_to_zarr_group(group)

    # Verify general attributes
    assert group.attrs["view_type"] == "TimeseriesGraph"
    assert group.attrs["legend_opts"] == {"location": "northwest"}
    assert group.attrs["y_range"] == [-1.0, 1.0]
    assert group.attrs["y_label"] == "Value"
    assert group.attrs["hide_nav_toolbar"] is True
    assert group.attrs["hide_time_axis_labels"] is True
    assert set(group.attrs["series_names"]) == {"line", "markers", "intervals"}

    # Verify line series
    line_group = group["line"]
    assert line_group.attrs["series_type"] == "line"
    assert line_group.attrs["color"] == "red"
    assert np.array_equal(line_group["t"][:], t)
    assert np.array_equal(line_group["y"][:], np.sin(t))

    # Verify marker series
    marker_group = group["markers"]
    assert marker_group.attrs["series_type"] == "marker"
    assert marker_group.attrs["color"] == "blue"
    assert marker_group.attrs["shape"] == "square"
    assert np.array_equal(marker_group["t"][:], t[::10])
    assert np.array_equal(marker_group["y"][:], np.sin(t[::10]))

    # Verify interval series
    interval_group = group["intervals"]
    assert interval_group.attrs["series_type"] == "interval"
    assert interval_group.attrs["color"] == "gray"
    assert np.array_equal(interval_group["t_start"][:], [1.0, 4.0])
    assert np.array_equal(interval_group["t_end"][:], [2.0, 5.0])
