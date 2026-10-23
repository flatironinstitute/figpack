"""
Tests for the figure spec schemas of the spike sorting views
"""

import numpy as np
import pytest
import zarr

from figpack import ExtensionView
from figpack.core._figure_spec import build_figure_spec, get_spec_schemas
from figpack.core.zarr import Group

import figpack_spike_sorting.views as ssv

UNIT_IDS = [1, 2, 3]


def _make_views():
    # One instance of each view, with every documented option set
    bin_edges = np.linspace(-0.05, 0.05, 11)
    counts = np.arange(10)
    spike_times = np.linspace(0, 10, 50)
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
        ssv.AverageWaveforms(
            average_waveforms=[
                ssv.AverageWaveformItem(
                    unit_id=u, channel_ids=[0, 1], waveform=np.zeros((20, 2))
                )
                for u in UNIT_IDS
            ],
            channel_locations={"0": [0, 0], "1": [0, 20]},
        ),
        ssv.RasterPlot(
            start_time_sec=0,
            end_time_sec=10,
            plots=[
                ssv.RasterPlotItem(unit_id=u, spike_times_sec=spike_times)
                for u in UNIT_IDS
            ],
        ),
        ssv.SpikeAmplitudes(
            start_time_sec=0,
            end_time_sec=10,
            plots=[
                ssv.SpikeAmplitudesItem(
                    unit_id=u,
                    spike_times_sec=spike_times,
                    spike_amplitudes=np.ones(len(spike_times)),
                )
                for u in UNIT_IDS
            ],
        ),
        ssv.SpikeLocations(
            units=[
                ssv.SpikeLocationsItem(
                    unit_id=u,
                    spike_times_sec=spike_times,
                    x_locations=np.zeros(len(spike_times)),
                    y_locations=np.zeros(len(spike_times)),
                )
                for u in UNIT_IDS
            ],
            x_range=(0, 1),
            y_range=(0, 1),
            disable_auto_rotate=True,
        ),
        ssv.UnitLocations(
            units=[ssv.UnitLocationsItem(unit_id=u, x=0, y=u) for u in UNIT_IDS],
            channel_locations={"0": [0, 0]},
            disable_auto_rotate=True,
        ),
        ssv.UnitSimilarityMatrix(
            unit_ids=UNIT_IDS,
            similarity_scores=[
                ssv.UnitSimilarityScore(unit_id1=1, unit_id2=2, similarity=0.5)
            ],
            range=(0, 1),
        ),
        ssv.UnitMetricsGraph(
            units=[
                ssv.UnitMetricsGraphUnit(unit_id=u, values={"snr": 1.0})
                for u in UNIT_IDS
            ],
            metrics=[ssv.UnitMetricsGraphMetric(key="snr", label="SNR", dtype="float")],
        ),
    ]


def _write(view):
    root = zarr.group()
    view.write_to_zarr_group(Group(root))
    return root


def test_all_views_have_schemas():
    schemas = get_spec_schemas()
    view_classes = [
        c
        for c in vars(ssv).values()
        if isinstance(c, type) and issubclass(c, ExtensionView)
    ]
    assert len(view_classes) == 12
    for c in view_classes:
        assert c.__dict__["spec_schema"].view_type in schemas
    assert {type(v) for v in _make_views()} == set(view_classes) - {ssv.TiledImage}
    for view in _make_views():
        assert type(view).spec_schema.view_type == view.view_type


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


def test_tiled_image_spec_lists_layer_labels():
    pytest.importorskip("pyvips")
    view = ssv.TiledImage(
        tile_size=256,
        layers=[
            ssv.TiledImageLayer(label="raw", data=np.zeros((300, 300), dtype=np.uint8))
        ],
    )
    spec = build_figure_spec(_write(view))
    assert spec == {"children": {"layer_0": {"props": {"label": "raw"}}}}
