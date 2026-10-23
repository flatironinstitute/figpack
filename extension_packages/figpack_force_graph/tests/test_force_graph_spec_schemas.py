"""
Tests for the figure spec schema of figpack_force_graph

Run from the repository root:
    pytest --no-cov extension_packages/figpack_force_graph/tests
"""

import json

import zarr

from figpack.core._figure_spec import build_figure_spec, get_spec_schemas
from figpack.core.zarr import Group
from figpack_force_graph import ForceGraphView


def _spec(view):
    root = zarr.group()
    view.write_to_zarr_group(Group(root))
    return build_figure_spec(root)


def test_schema_is_registered():
    schemas = get_spec_schemas()
    assert schemas["force-graph.ForceGraphView"] is ForceGraphView.spec_schema


def test_force_graph_props_are_written():
    # config is written even when all settings are defaults
    spec = _spec(ForceGraphView(nodes=[{"id": "a"}]))
    for p in ForceGraphView.spec_schema.props:
        assert p.name in spec["props"]
    assert json.loads(spec["props"]["config"]) == {}
    spec = _spec(ForceGraphView(nodes=[{"id": "a"}], dag_mode="td"))
    assert json.loads(spec["props"]["config"]) == {"dagMode": "td"}
    assert "num_nodes" not in spec["props"]
