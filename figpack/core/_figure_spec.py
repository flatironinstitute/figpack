"""
Figure spec written into index.html

The spec lists the layout and the user-facing settings of a figure, on top of
the data in data.zarr. Each node's props are merged over the attributes of the
matching zarr group by the frontend (figpack-figure/src/figureSpec.ts), so
editing a prop value in index.html changes the figure.

Which attributes appear is decided by per-view schemas (SpecSchema), declared
as the `spec_schema` class attribute of view classes. Attributes that describe
the stored data (sizes, sampling rates, downsampling factors, ...) are left
out, and so are views without a schema. A short reference for the view types
used in the figure is written into index.html next to the spec, so the figure
stays self-contained.
"""

import json
from dataclasses import dataclass, field
from typing import Any, Dict, List, Literal, Optional

FIGURE_SPEC_VERSION = 1

# Warn when the spec gets large, since it is meant to be read and edited (often
# by an AI agent, where it costs input tokens)
SPEC_SIZE_WARNING_CHARS = 20000

# Line width used when formatting the spec JSON
_SPEC_LINE_WIDTH = 120

# Props of the root node that belong to the figure rather than its root view
_FIGURE_PROPS = {"title"}


@dataclass
class SpecProp:
    """A user-facing attribute of a view (or of a child group of a view)"""

    name: str
    type: str
    description: str


@dataclass
class SpecSchema:
    """
    Describes which zarr attributes of a view are exposed in the figure spec

    children:
        "none": the view has no configurable child groups
        "views": child groups are views (e.g. layouts); each uses its own schema
        "groups": child groups are configurable parts of this view (e.g. the
            series of a TimeseriesGraph), with props given by child_props
    """

    view_type: str
    description: str
    props: List[SpecProp] = field(default_factory=list)
    children: Literal["none", "views", "groups"] = "none"
    children_description: str = ""
    child_props: List[SpecProp] = field(default_factory=list)


def get_spec_schemas() -> Dict[str, SpecSchema]:
    """Collect the spec schemas of all imported view classes, keyed by view type"""
    from .figpack_view import FigpackView

    schemas: Dict[str, SpecSchema] = {}
    stack = list(FigpackView.__subclasses__())
    seen = set()
    while stack:
        cls = stack.pop()
        if cls in seen:
            continue
        seen.add(cls)
        stack.extend(cls.__subclasses__())
        schema = cls.__dict__.get("spec_schema")
        if isinstance(schema, SpecSchema):
            schemas[schema.view_type] = schema
    return schemas


def build_figure_spec(
    zarr_group, schemas: Optional[Dict[str, SpecSchema]] = None
) -> Dict[str, Any]:
    """
    Build the figure spec from the (raw) root zarr group of a figure

    Args:
        zarr_group: The root zarr group of the figure
        schemas: Spec schemas by view type (default: get_spec_schemas())

    Returns:
        The spec as a JSON-serializable dict
    """
    if schemas is None:
        schemas = get_spec_schemas()
    node = _build_view_node(zarr_group, schemas)
    figure_props = {
        k: zarr_group.attrs[k] for k in sorted(_FIGURE_PROPS) if k in zarr_group.attrs
    }
    if figure_props:
        node["props"] = {**figure_props, **node.get("props", {})}
    return node


def _select_props(attrs, props: List[SpecProp]) -> Dict[str, Any]:
    return {p.name: attrs[p.name] for p in props if p.name in attrs}


def _build_view_node(group, schemas: Dict[str, SpecSchema]) -> Dict[str, Any]:
    schema = schemas.get(group.attrs.get("view_type", ""))
    if schema is None:
        return {}
    node: Dict[str, Any] = {}
    props = _select_props(group.attrs, schema.props)
    if props:
        node["props"] = props
    children = {}
    for name, subgroup in group.groups():
        if schema.children == "views":
            child = _build_view_node(subgroup, schemas)
        elif schema.children == "groups":
            child_props = _select_props(subgroup.attrs, schema.child_props)
            child = {"props": child_props} if child_props else {}
        else:
            child = {}
        if child:
            children[name] = child
    if children:
        node["children"] = children
    return node


def _collect_view_types(zarr_group) -> List[str]:
    view_types = []

    def visit(group):
        vt = group.attrs.get("view_type")
        if vt and vt not in view_types:
            view_types.append(vt)
        for _, subgroup in group.groups():
            visit(subgroup)

    visit(zarr_group)
    return view_types


def build_figure_spec_docs(
    zarr_group, schemas: Optional[Dict[str, SpecSchema]] = None
) -> str:
    """
    Build a short markdown reference for the spec, covering the view types
    used in the figure

    Args:
        zarr_group: The root zarr group of the figure
        schemas: Spec schemas by view type (default: get_spec_schemas())

    Returns:
        The reference as markdown text
    """
    if schemas is None:
        schemas = get_spec_schemas()
    lines = [
        f"# Figure spec reference (spec version {FIGURE_SPEC_VERSION})",
        "",
        "The figpack.render(spec) script below defines this figure's layout and settings on top of the data in data.zarr.",
        "A spec node is {data?, view_type?, props?, children?}:",
        "- props: values that replace the attributes of the node's zarr group (whole values are replaced; objects and lists are not merged).",
        "- children: child nodes by name, matched to the subgroups of the node's zarr group.",
        '- data: path of a group in data.zarr for this node (e.g. "/item_0"), or null for a node defined only by the spec (then view_type is required). If omitted, the node uses its counterpart in the original figure: the root group, or the parent\'s subgroup with the same name.',
        "- view_type: the view type of the node.",
        "Only the props documented here are listed in the spec. Other attributes in data.zarr describe the stored data and should not be changed.",
        "Root node: props.title (string) is the figure title.",
    ]
    view_types = _collect_view_types(zarr_group)
    documented = [vt for vt in view_types if vt in schemas]
    for vt in documented:
        schema = schemas[vt]
        lines += ["", f"## {vt}", "", schema.description]
        if schema.props:
            lines.append("Props:")
            lines += [f"- {p.name} ({p.type}): {p.description}" for p in schema.props]
        else:
            lines.append("No configurable props.")
        if schema.children_description:
            lines.append(f"Children: {schema.children_description}")
        if schema.child_props:
            lines.append("Child props:")
            lines += [
                f"- {p.name} ({p.type}): {p.description}" for p in schema.child_props
            ]
    undocumented = [vt for vt in view_types if vt not in schemas]
    if undocumented:
        lines += [
            "",
            "View types without documented props (they are rendered from data.zarr as is): "
            + ", ".join(undocumented),
        ]
    return "\n".join(lines) + "\n"


def format_spec_json(value: Any, *, indent: int = 0, prefix_len: int = 0) -> str:
    """
    Format JSON with one entry per line, except that values short enough to
    fit on the current line are written inline

    Args:
        value: JSON-serializable value
        indent: Current indentation (spaces)
        prefix_len: Length of the text before the value on its first line

    Returns:
        The formatted JSON
    """
    compact = json.dumps(value, ensure_ascii=False)
    if (
        not isinstance(value, (dict, list))
        or not value
        or indent + prefix_len + len(compact) <= _SPEC_LINE_WIDTH
    ):
        return compact
    pad = " " * (indent + 2)
    if isinstance(value, dict):
        entries = []
        for k, v in value.items():
            key = json.dumps(k, ensure_ascii=False) + ": "
            entries.append(
                pad + key + format_spec_json(v, indent=indent + 2, prefix_len=len(key))
            )
        return "{\n" + ",\n".join(entries) + "\n" + " " * indent + "}"
    entries = [pad + format_spec_json(v, indent=indent + 2) for v in value]
    return "[\n" + ",\n".join(entries) + "\n" + " " * indent + "]"


def _escape_for_script(text: str) -> str:
    # Make text safe to embed in a <script> element
    return (
        text.replace("</", "<\\/")
        .replace("\u2028", "\\u2028")
        .replace("\u2029", "\\u2029")
    )


def insert_figure_spec_into_html(
    html: str,
    spec: Dict[str, Any],
    docs: Optional[str] = None,
    remix_record: Optional[Dict[str, Any]] = None,
) -> str:
    """
    Insert the spec reference and a figpack.render(spec) script at the end of
    the body of index.html

    Args:
        html: The contents of index.html
        spec: The figure spec
        docs: Optional markdown reference for the spec
        remix_record: Optional record of a remix patch applied to the spec,
            written as a <script type="application/json"
            data-figpack-remix-patch> element

    Returns:
        The updated html
    """
    spec_json = _escape_for_script(format_spec_json(spec, indent=4))
    if len(spec_json) > SPEC_SIZE_WARNING_CHARS:
        print(
            f"Warning: the figure spec in index.html is {len(spec_json)} characters "
            f"(more than {SPEC_SIZE_WARNING_CHARS})"
        )
    script = ""
    if docs:
        script += (
            '    <script type="text/markdown" data-figpack-spec-docs>\n'
            + _escape_for_script(docs)
            + "    </script>\n"
        )
    if remix_record is not None:
        script += (
            '    <script type="application/json" data-figpack-remix-patch>\n    '
            + _escape_for_script(format_spec_json(remix_record, indent=4))
            + "\n    </script>\n"
        )
    script += (
        '    <script type="module" data-figpack-spec>\n'
        + f"    figpack.render({spec_json}, {{ specVersion: {FIGURE_SPEC_VERSION} }});\n"
        + "    </script>\n"
    )
    idx = html.rfind("</body>")
    if idx < 0:
        return html + script
    return html[:idx] + script + html[idx:]
