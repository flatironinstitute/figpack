"""
Tests for the figure spec schemas of figpack_3d views

Run from the repository root (after npm run build in this package):
    pytest --no-cov extension_packages/figpack_3d/tests
"""

import json

import numpy as np
import zarr

from figpack.core._figure_spec import build_figure_spec, get_spec_schemas
from figpack.core.zarr import Group
from figpack_3d import MeshView, ThreeDView


def _spec(view):
    root = zarr.group()
    view.write_to_zarr_group(Group(root))
    return build_figure_spec(root)


def test_schemas_are_registered():
    schemas = get_spec_schemas()
    assert schemas["3d.ThreeDView"] is ThreeDView.spec_schema
    assert schemas["3d.MeshView"] is MeshView.spec_schema


def test_three_d_view_props_are_written():
    # config is written even when all settings are defaults
    spec = _spec(ThreeDView())
    for p in ThreeDView.spec_schema.props:
        assert p.name in spec["props"]
    assert json.loads(spec["props"]["config"]) == {}
    spec = _spec(ThreeDView(background_color="#222222"))
    assert json.loads(spec["props"]["config"]) == {"backgroundColor": "#222222"}


def test_mesh_view_props_are_written():
    view = MeshView(
        vertices=np.random.randn(3, 3),
        faces=np.array([[0, 1, 2]]),
        scalars=np.array([0.0, 1.0, 2.0]),
        colormap="jet",
    )
    spec = _spec(view)
    for p in MeshView.spec_schema.props:
        assert p.name in spec["props"]
    assert json.loads(spec["props"]["config"])["colormap"] == "jet"
    assert "num_vertices" not in spec["props"]
