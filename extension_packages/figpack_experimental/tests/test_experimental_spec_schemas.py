"""
Tests for the figure spec schemas of figpack_experimental views

Run from the repository root (after npm run build in this package):
    pytest --no-cov extension_packages/figpack_experimental/tests
"""

import numpy as np
import zarr

from figpack.core._figure_spec import build_figure_spec, get_spec_schemas
from figpack.core.zarr import Group
import figpack_experimental.views as fpj


def _write(view):
    root = zarr.group()
    view.write_to_zarr_group(Group(root))
    return root


def test_schemas_are_registered():
    schemas = get_spec_schemas()
    for name in fpj.__all__:
        if name == "TrajectoryPanel":  # a panel of LinkedTrajectories, not a view
            continue
        cls = getattr(fpj, name)
        assert schemas[f"experimental.{name}"] is cls.spec_schema


def test_sphere_embedding_props_are_written():
    nlat, nphi = 4, 8
    view = fpj.SphereEmbedding(
        coords=np.random.randn(nlat, nphi, 3),
        fields={"f": np.random.randn(nlat, nphi)},
        cos_theta=np.linspace(0.9, -0.9, nlat),
        colormap="viridis",
        playback_speed=0.5,
        vmin=-1.0,
        vmax=1.0,
    )
    spec = build_figure_spec(_write(view))
    assert spec["props"] == {
        "colormap": "viridis",
        "playback_speed": 0.5,
        "vmin": -1.0,
        "vmax": 1.0,
    }


def test_data_views_have_no_props():
    for name in fpj.__all__:
        if name not in (
            "SphereEmbedding",
            "StackedTraces",
            "LinkedTrajectories",
            "TrajectoryPanel",
            "LinkedCurves",
        ):
            assert getattr(fpj, name).spec_schema.props == []
    view = fpj.ClusterLens(np.random.randn(10, 3), np.arange(10) % 2)
    assert build_figure_spec(_write(view)) == {}


def test_stacked_traces_props_are_written():
    view = fpj.StackedTraces(
        start_time_sec=0.0,
        sampling_frequency_hz=100.0,
        data=np.random.randn(500, 3),
        channel_ids=["a", "b", "c"],
        channel_colors=["red", "green", "blue"],
        hide_nav_toolbar=True,
    )
    root = _write(view)
    assert build_figure_spec(root)["props"] == {"hide_nav_toolbar": True}
    assert root.attrs["view_type"] == "experimental.StackedTraces"
    assert root.attrs["channel_colors"] == ["red", "green", "blue"]
    assert list(root.attrs["channel_ids"]) == ["a", "b", "c"]


def test_linked_trajectories_props_are_written():
    rng = np.random.default_rng(0)
    panels = [
        fpj.TrajectoryPanel(
            data=rng.standard_normal((5, 20, 2)), title="a", x_label="x"
        ),
        fpj.TrajectoryPanel(data=rng.standard_normal((5, 20, 2)), equal_aspect=False),
    ]
    view = fpj.LinkedTrajectories(
        times=np.arange(20) * 10.0,
        panels=panels,
        item_labels=list("abcde"),
        item_colors=["red"] * 5,
        time_label="ms",
        tail_length=50,
        highlight_interval=(20, 80),
        num_columns=1,
    )
    root = _write(view)
    assert build_figure_spec(root)["props"] == {
        "time_label": "ms",
        "tail_length": 50.0,
        "num_columns": 1,
        "show_ghost": True,
    }
    assert root.attrs["view_type"] == "experimental.LinkedTrajectories"
    assert root.attrs["highlight_interval"] == [20.0, 80.0]
    assert [p["dataset"] for p in root.attrs["panels"]] == ["panel_0", "panel_1"]
    assert root["panel_1"].shape == (5, 20, 2)


def test_linked_trajectories_rejects_mismatched_panels():
    import pytest

    with pytest.raises(ValueError):
        fpj.LinkedTrajectories(
            times=np.arange(20),
            panels=[
                fpj.TrajectoryPanel(data=np.zeros((5, 20, 2))),
                fpj.TrajectoryPanel(data=np.zeros((4, 20, 2))),
            ],
        )


def test_linked_curves_props_and_data_are_written():
    view = fpj.LinkedCurves(
        item_labels=["a", "b", "c"], item_groups=["g1", "g2", "g1"], num_columns=1
    )
    p0 = view.add_panel(title="first", x_label="x", y_label="y")
    p1 = view.add_panel(x_scale="symlog", symlog_constant=5, x_ticks=[-10, 0, 10])
    view.add_curve(p0, item=0, x=np.arange(4), y=np.arange(4), series="fit")
    view.add_curve(p0, item=2, x=[0, 1], y=[1, 0], style="markers", series="data")
    view.add_curve(p1, item=1, x=[-10, 0, 10], y=[0, 1, 2], dashed=True)
    root = _write(view)
    assert build_figure_spec(root)["props"] == {"num_columns": 1}
    assert root.attrs["view_type"] == "experimental.LinkedCurves"
    assert root.attrs["groups"] == ["g1", "g2"]
    assert root.attrs["item_colors"][0] == root.attrs["item_colors"][2]
    assert root.attrs["item_colors"][0] != root.attrs["item_colors"][1]
    panels = root.attrs["panels"]
    assert panels[0]["series_names"] == ["fit", "data"]
    assert panels[1]["x_scale"] == "symlog"
    assert root["panel_0_xy"].shape == (6, 2)
    assert list(root["panel_0_offsets"][:]) == [0, 4, 6]
    # item, style, dashed, series index
    assert root["panel_0_info"][1].tolist() == [2, 1, 0, 1]
    assert root["panel_1_info"][0].tolist() == [1, 0, 1, 0]


def test_linked_curves_rejects_bad_input():
    import pytest

    view = fpj.LinkedCurves(item_labels=["a"])
    p = view.add_panel()
    with pytest.raises(ValueError):
        view.add_curve(p, item=1, x=[0], y=[0])
    with pytest.raises(ValueError):
        view.add_curve(p, item=0, x=[0, 1], y=[0])
    with pytest.raises(ValueError):
        view.add_curve(p, item=0, x=[0], y=[0], style="bars")
    with pytest.raises(ValueError):
        view.add_panel(x_scale="log")


def test_editable_notes_stores_initial_text():
    root = _write(fpj.EditableNotes(initial_text="Hello, notes"))
    assert bytes(root["text"][:]).decode("utf-8") == "Hello, notes"
    assert "text" not in _write(fpj.EditableNotes())
    assert build_figure_spec(root) == {}
