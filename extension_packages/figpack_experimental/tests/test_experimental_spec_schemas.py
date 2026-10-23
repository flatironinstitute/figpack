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
        if name != "SphereEmbedding":
            assert getattr(fpj, name).spec_schema.props == []
    view = fpj.ClusterLens(np.random.randn(10, 3), np.arange(10) % 2)
    assert build_figure_spec(_write(view)) == {}


def test_editable_notes_stores_initial_text():
    root = _write(fpj.EditableNotes(initial_text="Hello, notes"))
    assert bytes(root["text"][:]).decode("utf-8") == "Hello, notes"
    assert "text" not in _write(fpj.EditableNotes())
    assert build_figure_spec(root) == {}
