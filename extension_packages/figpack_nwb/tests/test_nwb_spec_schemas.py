"""
Tests for the figure spec schemas of figpack_nwb views

Run from the repository root (after npm run build in this package):
    pytest --no-cov extension_packages/figpack_nwb/tests
"""

import numpy as np
import zarr

from figpack.core._figure_spec import build_figure_spec, get_spec_schemas
from figpack.core.zarr import Group
from figpack_nwb.views import PlaneSegmentation, PoseEstimation, PoseEstimationItem


def _write(view):
    root = zarr.group()
    view.write_to_zarr_group(Group(root))
    return root


def test_schemas_are_registered():
    schemas = get_spec_schemas()
    assert schemas["nwb.PlaneSegmentation"].props == []
    assert schemas["nwb.PoseEstimation"].props
    assert PlaneSegmentation.spec_schema.view_type == "nwb.PlaneSegmentation"


def test_pose_estimation_props_are_written():
    items = [
        PoseEstimationItem(
            name=name, start_time=0, rate=30, data=np.random.randn(20, 2)
        )
        for name in ["nose", "tail"]
    ]
    root = _write(PoseEstimation(items=items))
    spec = build_figure_spec(root)
    for p in PoseEstimation.spec_schema.props:
        assert p.name in spec["props"]
    assert spec["props"]["node_names"] == ["nose", "tail"]
