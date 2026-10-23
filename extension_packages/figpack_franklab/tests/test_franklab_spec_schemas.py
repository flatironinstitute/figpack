"""
Tests for the figure spec schemas of figpack_franklab views

Run from the repository root (after npm run build in this package):
    pytest --no-cov extension_packages/figpack_franklab/tests
"""

import numpy as np
import zarr

from figpack.core._figure_spec import build_figure_spec, get_spec_schemas
from figpack.core.zarr import Group
from figpack_franklab.views import DecodedPositionAnimation, TrackAnimation


def test_schemas_are_registered():
    schemas = get_spec_schemas()
    assert schemas["franklab.DecodedPositionAnimation"].props
    assert schemas["franklab.TrackAnimation"].props == []
    assert TrackAnimation.spec_schema.view_type == "franklab.TrackAnimation"


def test_decoded_position_animation_props_are_written():
    n = 10
    view = DecodedPositionAnimation(
        decode_x=np.random.randn(n),
        decode_y=np.random.randn(n),
        decode_colors=np.random.rand(n, 4),
        pos_x=np.random.randn(n),
        pos_y=np.random.randn(n),
        head_dir=np.random.randn(n),
        time=np.arange(n) / 10,
        base_patches=[[[0, 0], [1, 0], [1, 1]]],
        arrow_color="red",
    )
    root = zarr.group()
    view.write_to_zarr_group(Group(root))
    spec = build_figure_spec(root)
    for p in DecodedPositionAnimation.spec_schema.props:
        assert p.name in spec["props"]
    assert spec["props"]["arrow_color"] == "red"
    assert "xmin" not in spec["props"]
