"""
Tests for the figure spec schemas of the spike sorting views
"""

import numpy as np
import zarr

from figpack.core._figure_spec import build_figure_spec, get_spec_schemas
from figpack.core.zarr import Group

import figpack_spike_sorting.views as ssv

UNIT_IDS = [1, 2, 3]


def _make_views():
    # One instance of each view, with every documented option set
    bin_edges = np.linspace(-0.05, 0.05, 11)
    counts = np.arange(10)
    return [
        ssv.Autocorrelograms(
            autocorrelograms=[
                ssv.AutocorrelogramItem(
                    unit_id=u, bin_edges_sec=bin_edges, bin_counts=counts
                )
                for u in UNIT_IDS
            ]
        ),
        ssv.CrossCorrelograms(
            cross_correlograms=[
                ssv.CrossCorrelogramItem(
                    unit_id1=1, unit_id2=2, bin_edges_sec=bin_edges, bin_counts=counts
                )
            ],
            hide_unit_selector=True,
        ),
        ssv.UnitsTable(
            columns=[ssv.UnitsTableColumn(key="snr", label="SNR", dtype="float")],
            rows=[ssv.UnitsTableRow(unit_id=u, values={"snr": 1.0}) for u in UNIT_IDS],
        ),
        ssv.SortingCuration(default_label_options=["good", "bad"]),
    ]


def _write(view):
    root = zarr.group()
    view.write_to_zarr_group(Group(root))
    return root


def test_spike_sorting_schemas_are_registered():
    schemas = get_spec_schemas()
    for view in _make_views():
        assert view.view_type in schemas
        assert type(view).__dict__["spec_schema"].view_type == view.view_type


def test_documented_props_are_written():
    # Each documented prop must be an attribute the view writes to zarr
    for view in _make_views():
        schema = type(view).spec_schema
        root = _write(view)
        for p in schema.props:
            assert p.name in root.attrs, f"{view.view_type}: {p.name}"
        spec = build_figure_spec(root)
        assert set(spec.get("props", {})) == {p.name for p in schema.props}


def test_spec_excludes_unit_data():
    for view in _make_views():
        spec = build_figure_spec(_write(view))
        assert "children" not in spec
        for key in ["unit_ids", "num_autocorrelograms", "num_cross_correlograms"]:
            assert key not in spec.get("props", {})
