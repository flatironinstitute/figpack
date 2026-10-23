"""
Tests for remix patches (figpack/core/_remix_patch.py)

The merge cases in tests/remix_patch_cases are shared with the figpack-manage
remix page (remixPatch.test.ts), so that both implementations follow the same
rules.
"""

import json
import pathlib
import re

import numpy as np
import pytest

import figpack.views as vv
from figpack.core._remix_patch import load_remix_patch, merge_remix_patch

CASES_DIR = pathlib.Path(__file__).parent / "remix_patch_cases"
CASES = sorted(CASES_DIR.glob("*.json"))


@pytest.mark.parametrize("case_path", CASES, ids=[p.stem for p in CASES])
def test_merge_cases(case_path):
    case = json.loads(case_path.read_text())
    spec_before = json.dumps(case["spec"])
    merged, warnings = merge_remix_patch(
        case["spec"], case["patch"], set(case["zarr_groups"])
    )
    assert merged == case["expected"]
    assert warnings == case["warnings"]
    # the input spec is not modified
    assert json.dumps(case["spec"]) == spec_before


def test_load_remix_patch(tmp_path):
    patch = {"figpack_remix_patch": 1, "patch": {"props": {"title": "x"}}}
    path = tmp_path / "fig-remix.json"
    path.write_text(json.dumps(patch))
    assert load_remix_patch(str(path)) == (patch, "fig-remix.json")
    assert load_remix_patch(path) == (patch, "fig-remix.json")
    assert load_remix_patch(patch) == (patch, None)
    with pytest.raises(ValueError, match="Not a remix patch"):
        load_remix_patch({"patch": {}})
    with pytest.raises(ValueError, match="not supported"):
        load_remix_patch({"figpack_remix_patch": 2, "patch": {}})
    with pytest.raises(ValueError, match="no 'patch'"):
        load_remix_patch({"figpack_remix_patch": 1})


def _make_view():
    t = np.linspace(0, 1, 50, dtype=np.float32)
    graph = vv.TimeseriesGraph(y_label="Signal")
    graph.add_line_series(name="sine", t=t, y=np.sin(t), color="blue")
    graph.add_line_series(name="cosine", t=t, y=np.cos(t), color="green")
    return vv.Box(
        direction="vertical",
        items=[
            vv.LayoutItem(graph, title="Graph"),
            vv.LayoutItem(vv.Markdown("# Notes"), title="Notes"),
        ],
    )


def _read_script(html, attr):
    m = re.search(rf"<script[^>]*\s{attr}>\s*([\s\S]*?)\s*</script>", html)
    assert m, attr
    return m.group(1).replace("<\\/", "</")


def _read_spec(html):
    script = _read_script(html, "data-figpack-spec")
    m = re.fullmatch(r"figpack\.render\(([\s\S]*), \{ specVersion: 1 \}\);", script)
    assert m
    return json.loads(m.group(1))


def test_save_with_remix_patch(tmp_path, capsys):
    patch = {
        "figpack_remix_patch": 1,
        "source": {"figureUrl": "https://example.org/fig/index.html"},
        "patch": {
            "props": {"items": [{"name": "item_0", "title": "Signals"}]},
            "children": {
                "item_0": {
                    "props": {"y_label": "Voltage (mV)"},
                    "children": {
                        "cosine": {"props": {"color": "red"}},
                        "tangent": {"props": {"color": "black"}},
                    },
                }
            },
        },
    }
    patch_path = tmp_path / "demo-remix.json"
    patch_path.write_text(json.dumps(patch))

    # without the patch
    _make_view().save(str(tmp_path / "plain"), title="Demo")
    plain_html = (tmp_path / "plain" / "index.html").read_text()
    plain = _read_spec(plain_html)
    assert "data-figpack-remix-patch" not in plain_html

    # with the patch
    _make_view().save(str(tmp_path / "remixed"), title="Demo", remix=str(patch_path))
    html = (tmp_path / "remixed" / "index.html").read_text()
    spec = _read_spec(html)
    assert spec["props"]["items"] == [{"name": "item_0", "title": "Signals"}]
    graph = spec["children"]["item_0"]
    assert graph["props"]["y_label"] == "Voltage (mV)"
    assert graph["children"]["cosine"]["props"]["color"] == "red"
    assert graph["children"]["sine"] == plain["children"]["item_0"]["children"]["sine"]
    assert "tangent" not in graph["children"]
    # everything else is as without the patch
    spec["props"]["items"] = plain["props"]["items"]
    graph["props"]["y_label"] = "Signal"
    graph["children"]["cosine"]["props"]["color"] = "green"
    assert spec == plain

    warning = "remix: no child 'tangent' under 'item_0'; skipped"
    assert f"Warning: {warning}" in capsys.readouterr().out
    record = json.loads(_read_script(html, "data-figpack-remix-patch"))
    assert record == {
        "file": "demo-remix.json",
        "source": patch["source"],
        "patch": patch["patch"],
        "skipped": [warning],
    }
