"""
Remix patches: applying a remix's changes when a figure is made

A remix patch carries the changes a remix makes to a figure's spec, keyed by
the figure's structure (child names and props) rather than by the code that
built the figure. It is exported from the remix page (Export patch) and
applied with view.show(..., remix=...) or view.save(..., remix=...). Format
(version 1):

    {
      "figpack_remix_patch": 1,
      "source": {"figureUrl": "...", "createdAt": "2026-10-23T12:00:00.000Z"},
      "patch": <spec diff>
    }

The spec diff has the shape of a spec node, {data?, view_type?, props?,
children?}, with only what the remix changed. It is merged into the figure's
spec with the same rules as the spec itself:

- props replace per key (whole values; lists and objects are not merged)
- children merge by name
- data and view_type replace; a data path must exist in data.zarr

Parts that do not match the figure are reported as warnings and skipped: a
child that is neither in the spec nor a subgroup in data.zarr (unless the
patch gives it its own data), a data path that does not exist, or a value of
the wrong type. The figpack-manage remix page applies patches with the same
rules (figpack-manage/src/pages/RemixPage/remixPatch.ts); both are tested
against the shared cases in tests/remix_patch_cases. See
docs/remix_patches.md.
"""

import copy
import json
import os
import pathlib
from typing import Any, Dict, List, Optional, Set, Tuple, Union

REMIX_PATCH_VERSION = 1

_NODE_KEYS = {"data", "view_type", "props", "children"}

RemixArg = Union[str, os.PathLike, Dict[str, Any]]


def load_remix_patch(remix: RemixArg) -> Tuple[Dict[str, Any], Optional[str]]:
    """
    Load a remix patch from a file path, or check an already-loaded dict

    Args:
        remix: Path to a patch file, or the patch as a dict

    Returns:
        (patch, file name or None)
    """
    file_name = None
    if isinstance(remix, dict):
        patch = remix
    else:
        path = pathlib.Path(remix)
        file_name = path.name
        patch = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(patch, dict) or "figpack_remix_patch" not in patch:
        raise ValueError("Not a remix patch (missing figpack_remix_patch)")
    version = patch["figpack_remix_patch"]
    if not isinstance(version, int) or version > REMIX_PATCH_VERSION:
        raise ValueError(
            f"Remix patch version {version} is not supported by this figpack "
            f"(supports {REMIX_PATCH_VERSION}); upgrade figpack"
        )
    if not isinstance(patch.get("patch"), dict):
        raise ValueError("Remix patch has no 'patch' object")
    return patch, file_name


def get_group_paths(zarr_group) -> Set[str]:
    """The paths of all groups in a zarr tree, relative to its root ("" for the root)"""
    paths = {""}

    def visit(group, prefix):
        for name, subgroup in group.groups():
            path = prefix + name
            paths.add(path)
            visit(subgroup, path + "/")

    visit(zarr_group, "")
    return paths


def merge_remix_patch(
    spec: Dict[str, Any], patch: Dict[str, Any], group_paths: Set[str]
) -> Tuple[Dict[str, Any], List[str]]:
    """
    Merge a spec diff into a figure spec

    Args:
        spec: The figure spec (not modified)
        patch: The spec diff (the "patch" field of a remix patch)
        group_paths: Paths of the groups in data.zarr (see get_group_paths)

    Returns:
        (merged spec, warnings for the parts that were skipped)
    """
    warnings: List[str] = []
    merged = _merge_node(spec, patch, "", "", group_paths, warnings)
    return merged, warnings


def _normalize_path(path: str) -> str:
    return path.strip("/")


def _where(spec_path: str) -> str:
    return spec_path or "root"


def _merge_node(
    node: Dict[str, Any],
    patch: Dict[str, Any],
    base: Optional[str],
    spec_path: str,
    group_paths: Set[str],
    warnings: List[str],
) -> Dict[str, Any]:
    # base: path of the node's counterpart group in data.zarr, if any
    where = _where(spec_path)
    result = copy.deepcopy(node)
    for key in patch:
        if key not in _NODE_KEYS:
            warnings.append(f"remix: unknown key '{key}' at '{where}'; skipped")
    if "data" in patch:
        data = patch["data"]
        if data is None:
            result["data"] = None
        elif isinstance(data, str) and _normalize_path(data) in group_paths:
            result["data"] = data
        elif isinstance(data, str):
            warnings.append(
                f"remix: data path '{data}' at '{where}' is not in data.zarr; skipped"
            )
        else:
            warnings.append(f"remix: data at '{where}' is not a string; skipped")
    if "view_type" in patch:
        if isinstance(patch["view_type"], str):
            result["view_type"] = patch["view_type"]
        else:
            warnings.append(f"remix: view_type at '{where}' is not a string; skipped")
    if "props" in patch:
        if isinstance(patch["props"], dict):
            result["props"] = {**result.get("props", {}), **patch["props"]}
        else:
            warnings.append(f"remix: props at '{where}' is not an object; skipped")
    if "data" in result:
        base = None if result["data"] is None else _normalize_path(result["data"])
    if "children" in patch:
        if isinstance(patch["children"], dict):
            children = result.get("children", {})
            for name, child_patch in patch["children"].items():
                child_path = f"{spec_path}/{name}" if spec_path else name
                if not isinstance(child_patch, dict):
                    warnings.append(
                        f"remix: child '{_where(child_path)}' is not an object; skipped"
                    )
                    continue
                counterpart = None
                if base is not None:
                    p = f"{base}/{name}" if base else name
                    counterpart = p if p in group_paths else None
                if name not in children and counterpart is None:
                    if not _has_own_data(child_patch, group_paths):
                        warnings.append(
                            f"remix: no child '{name}' under '{where}'; skipped"
                        )
                        continue
                children[name] = _merge_node(
                    children.get(name, {}),
                    child_patch,
                    counterpart,
                    child_path,
                    group_paths,
                    warnings,
                )
            if children:
                result["children"] = children
        else:
            warnings.append(f"remix: children at '{where}' is not an object; skipped")
    return result


def _has_own_data(patch: Dict[str, Any], group_paths: Set[str]) -> bool:
    # Whether a patch node defines its own base: data null (a node defined
    # only by the spec) or an existing data path
    if "data" not in patch:
        return False
    data = patch["data"]
    return data is None or (
        isinstance(data, str) and _normalize_path(data) in group_paths
    )


def apply_remix_patch(
    spec: Dict[str, Any], remix: RemixArg, zarr_group
) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """
    Apply a remix patch to a figure spec, printing a warning for each part
    that was skipped

    Args:
        spec: The figure spec built from the zarr tree
        remix: Path to a patch file, or the patch as a dict
        zarr_group: The (raw) root zarr group of the figure

    Returns:
        (merged spec, record of the applied patch for index.html)
    """
    patch, file_name = load_remix_patch(remix)
    merged, warnings = merge_remix_patch(
        spec, patch["patch"], get_group_paths(zarr_group)
    )
    for w in warnings:
        print(f"Warning: {w}")
    record = {
        "file": file_name,
        "source": patch.get("source"),
        "patch": patch["patch"],
        "skipped": warnings,
    }
    return merged, record
