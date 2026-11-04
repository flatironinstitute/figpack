"""
Tests for the figure spec written into index.html
"""

import json

import pytest

import zarr

import figpack.views as vv
from figpack.core.zarr import Group
from figpack.core._figure_spec import (
    SPEC_SIZE_WARNING_CHARS,
    SpecProp,
    SpecSchema,
    build_figure_spec,
    build_figure_spec_docs,
    format_spec_json,
    get_spec_schemas,
    insert_figure_spec_into_html,
)

SCHEMAS = {
    "Box": SpecSchema(
        view_type="Box",
        description="Box layout.",
        props=[SpecProp("direction", "string", "Direction.")],
        children="views",
    ),
    "Graph": SpecSchema(
        view_type="Graph",
        description="A graph.",
        props=[SpecProp("y_label", "string", "Y label.")],
        children="groups",
        child_props=[SpecProp("color", "string", "Color.")],
    ),
}


def _make_group():
    root = zarr.group()
    root.attrs["view_type"] = "Box"
    root.attrs["title"] = "My figure"
    root.attrs["direction"] = "vertical"
    root.attrs["internal"] = 42
    graph = root.create_group("item_0")
    graph.attrs["view_type"] = "Graph"
    graph.attrs["y_label"] = "Voltage"
    graph.attrs["n_timepoints"] = 1000
    series = graph.create_group("series 1")
    series.attrs["color"] = "blue"
    series.attrs["y_max"] = 3.0
    other = root.create_group("item_1")
    other.attrs["view_type"] = "Undocumented"
    other.attrs["something"] = 1
    return root


def test_build_figure_spec():
    spec = build_figure_spec(_make_group(), SCHEMAS)
    assert spec == {
        "props": {"title": "My figure", "direction": "vertical"},
        "children": {
            "item_0": {
                "props": {"y_label": "Voltage"},
                "children": {"series 1": {"props": {"color": "blue"}}},
            }
        },
    }


def test_build_figure_spec_docs():
    docs = build_figure_spec_docs(_make_group(), SCHEMAS)
    assert "## Box" in docs
    assert "- y_label (string): Y label." in docs
    assert "- color (string): Color." in docs
    assert "without documented props" in docs and "Undocumented" in docs


def test_style_in_spec_and_docs():
    schemas = {
        **SCHEMAS,
        "Graph": SpecSchema(
            view_type="Graph",
            description="A graph.",
            style_keys=["tick_font_size"],
        ),
    }
    root = _make_group()
    root.attrs["style"] = {"tick_font_size": 14}
    root["item_0"].attrs["style"] = {}
    spec = build_figure_spec(root, schemas)
    # any view may carry a style, even one whose schema uses no style keys
    assert spec["props"]["style"] == {"tick_font_size": 14}
    assert "item_0" not in spec.get("children", {})
    docs = build_figure_spec_docs(root, schemas)
    assert "## Style" in docs
    assert "- tick_font_size (number): " in docs and "Used by: Graph." in docs
    assert "label_font_size" not in docs
    assert "Style keys: tick_font_size." in docs
    # no style section when no view in the figure uses style keys
    assert "## Style" not in build_figure_spec_docs(_make_group(), SCHEMAS)


def test_set_style_writes_style_attrs():
    graph = vv.TimeseriesGraph(y_label="Signal", style={"label_font_size": 20})
    box = vv.Box(items=[vv.LayoutItem(graph, title="g")])
    assert box.set_style(tick_font_size=14) is box
    box.set_style(label_font_size=16)
    root = zarr.group()
    box.write_to_zarr_group(Group(root))
    assert root.attrs["style"] == {"tick_font_size": 14, "label_font_size": 16}
    # the graph keeps only its own keys; the frontend merges the cascade
    assert root["item_0"].attrs["style"] == {"label_font_size": 20}
    # views without a style write no style attr
    root2 = zarr.group()
    vv.Box(items=[]).write_to_zarr_group(Group(root2))
    assert "style" not in root2.attrs
    with pytest.raises(ValueError, match="Unknown style keys: font_szie"):
        box.set_style(font_szie=12)


def test_builtin_view_schemas_are_registered():
    schemas = get_spec_schemas()
    for vt in [
        "Box",
        "Splitter",
        "TabLayout",
        "TimeseriesGraph",
        "MultiChannelTimeseries",
        "Spectrogram",
    ]:
        assert vt in schemas


def test_builtin_spec_excludes_data_attributes():
    import numpy as np

    graph = vv.TimeseriesGraph(y_label="Signal")
    graph.add_line_series(name="s", t=np.arange(10.0), y=np.arange(10.0), color="red")
    root = zarr.group()
    graph.write_to_zarr_group(Group(root))
    spec = build_figure_spec(root)
    assert spec["props"]["y_label"] == "Signal"
    assert spec["children"]["s"]["props"]["color"] == "red"
    assert "y_min" not in spec["children"]["s"]["props"]
    assert "series_type" not in spec["children"]["s"]["props"]


def test_format_spec_json():
    value = {"a": [1, 2, 3], "b": {"c": "x" * 100}}
    text = format_spec_json(value)
    assert json.loads(text) == value
    # short values stay on one line
    assert '"a": [1, 2, 3]' in text
    assert format_spec_json({"a": 1}) == '{"a": 1}'


def test_insert_figure_spec_into_html():
    html = '<html><head></head><body><div id="root"></div></body></html>'
    spec = {"props": {"title": "a </script> b"}}
    out = insert_figure_spec_into_html(html, spec, "# Docs\n")
    assert out.endswith("</body></html>")
    assert "data-figpack-spec-docs" in out
    assert "data-figpack-spec>" in out
    assert "{ specVersion: 1 }" in out
    # the spec must not be able to close the script element
    script = out[out.index("data-figpack-spec>") :]
    assert script.index("</script>") > script.index("a <\\/script> b")
    # the embedded JSON parses back to the spec
    start = script.index("figpack.render(") + len("figpack.render(")
    end = script.index(", { specVersion")
    assert json.loads(script[start:end].replace("<\\/", "</")) == spec


def test_insert_figure_spec_warns_when_large(capsys):
    spec = {
        "props": {f"p{i}": "x" * 100 for i in range(SPEC_SIZE_WARNING_CHARS // 100)}
    }
    insert_figure_spec_into_html("<body></body>", spec)
    assert "Warning" in capsys.readouterr().out
