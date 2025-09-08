"""
ForceGraphView - Interactive force-directed graph visualization for figpack
"""

import json
import numpy as np
import zarr
import urllib.request
import urllib.error
from typing import List, Dict, Any, Optional, Union

import figpack


class CustomJSONEncoder(json.JSONEncoder):
    """Custom JSON encoder that handles numpy arrays and other types"""

    def default(self, obj):
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        elif isinstance(obj, (np.integer, np.floating)):
            return obj.item()
        elif hasattr(obj, "isoformat"):  # Handle datetime-like objects
            return obj.isoformat()
        return super().default(obj)


def _download_force_graph_library():
    """Download the force-graph library from CDN"""
    url = "https://cdn.jsdelivr.net/npm/force-graph@1.50.1/dist/force-graph.min.js"
    try:
        with urllib.request.urlopen(url) as response:
            return response.read().decode("utf-8")
    except urllib.error.URLError as e:
        raise RuntimeError(f"Failed to download force-graph library from {url}: {e}")


def _load_javascript_code():
    """Load the JavaScript code from the force_graph.js file"""
    import os

    js_path = os.path.join(os.path.dirname(__file__), "force_graph.js")
    try:
        with open(js_path, "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        raise FileNotFoundError(
            f"Could not find force_graph.js at {js_path}. "
            "Make sure the JavaScript file is present in the package."
        )


# Download the force-graph library and create the extension with additional files
try:
    force_graph_lib_js = _download_force_graph_library()
    additional_files = {"force-graph.min.js": force_graph_lib_js}
except Exception as e:
    print(f"Warning: Could not download force-graph library: {e}")
    print("Extension will fall back to CDN loading")
    additional_files = {}

# Create and register the force graph extension
_force_graph_extension = figpack.FigpackExtension(
    name="force-graph",
    javascript_code=_load_javascript_code(),
    additional_files=additional_files,
    version="1.0.0",
)

figpack.ExtensionRegistry.register(_force_graph_extension)


class ForceGraphView(figpack.ExtensionView):
    """
    A force-directed graph visualization view using the force-graph library.

    This view displays interactive network graphs with nodes and links,
    supporting various styling and interaction options.
    """

    def __init__(
        self,
        *,
        nodes: Optional[List[Dict[str, Any]]] = None,
        links: Optional[List[Dict[str, Any]]] = None,
        background_color: Optional[str] = None,
        node_color: Optional[str] = None,
        link_color: Optional[str] = None,
        enable_node_click: bool = True,
        enable_node_hover: bool = True,
        highlight_connected: bool = False,
        dag_mode: Optional[str] = None,
        cooldown_ticks: Optional[int] = None,
        warmup_ticks: Optional[int] = None,
    ):
        """
        Initialize a ForceGraphView.

        Args:
            nodes: List of node dictionaries. Each node should have:
                   - id (required): Unique identifier
                   - name (optional): Display name
                   - val (optional): Node size value
                   - color (optional): Node color
            links: List of link dictionaries. Each link should have:
                   - source (required): Source node id
                   - target (required): Target node id
                   - color (optional): Link color
                   - width (optional): Link width
            background_color: Background color of the graph
            node_color: Default color for nodes (if not specified per node)
            link_color: Default color for links (if not specified per link)
            enable_node_click: Whether to enable node click interactions
            enable_node_hover: Whether to enable node hover interactions
            highlight_connected: Whether to highlight connected nodes on hover
            dag_mode: DAG layout mode ('td', 'bu', 'lr', 'rl', 'radialout', 'radialin')
            cooldown_ticks: Number of ticks to run before stopping simulation
            warmup_ticks: Number of ticks to run before starting to render
        """
        super().__init__(extension_name="force-graph")

        self.nodes = nodes or []
        self.links = links or []
        self.background_color = background_color
        self.node_color = node_color
        self.link_color = link_color
        self.enable_node_click = enable_node_click
        self.enable_node_hover = enable_node_hover
        self.highlight_connected = highlight_connected
        self.dag_mode = dag_mode
        self.cooldown_ticks = cooldown_ticks
        self.warmup_ticks = warmup_ticks

        # Validate nodes and links
        self._validate_data()

    def _validate_data(self):
        """Validate the nodes and links data"""
        # Validate nodes
        for i, node in enumerate(self.nodes):
            if not isinstance(node, dict):
                raise ValueError(f"Node {i} must be a dictionary")
            if "id" not in node:
                raise ValueError(f"Node {i} must have an 'id' field")

        # Validate links
        node_ids = {node["id"] for node in self.nodes}
        for i, link in enumerate(self.links):
            if not isinstance(link, dict):
                raise ValueError(f"Link {i} must be a dictionary")
            if "source" not in link:
                raise ValueError(f"Link {i} must have a 'source' field")
            if "target" not in link:
                raise ValueError(f"Link {i} must have a 'target' field")

            # Check if source and target nodes exist
            if link["source"] not in node_ids:
                raise ValueError(
                    f"Link {i} references unknown source node: {link['source']}"
                )
            if link["target"] not in node_ids:
                raise ValueError(
                    f"Link {i} references unknown target node: {link['target']}"
                )

    def add_node(
        self,
        node_id: str,
        name: Optional[str] = None,
        val: Optional[float] = None,
        color: Optional[str] = None,
        **kwargs,
    ):
        """
        Add a node to the graph.

        Args:
            node_id: Unique identifier for the node
            name: Display name for the node
            val: Value affecting node size
            color: Color of the node
            **kwargs: Additional node properties
        """
        node = {"id": node_id}
        if name is not None:
            node["name"] = name
        if val is not None:
            node["val"] = val
        if color is not None:
            node["color"] = color
        node.update(kwargs)

        self.nodes.append(node)

    def add_link(
        self,
        source: str,
        target: str,
        color: Optional[str] = None,
        width: Optional[float] = None,
        **kwargs,
    ):
        """
        Add a link to the graph.

        Args:
            source: Source node id
            target: Target node id
            color: Color of the link
            width: Width of the link
            **kwargs: Additional link properties
        """
        link = {"source": source, "target": target}
        if color is not None:
            link["color"] = color
        if width is not None:
            link["width"] = width
        link.update(kwargs)

        self.links.append(link)

    def _write_to_zarr_group(self, group: figpack.Group) -> None:
        """
        Write the force graph data to a Zarr group.

        Args:
            group: Zarr group to write data into
        """
        # Call parent method to set extension metadata
        super()._write_to_zarr_group(group)

        # Create graph data structure
        graph_data = {"nodes": self.nodes, "links": self.links}

        # Convert to JSON string using custom encoder
        json_string = json.dumps(graph_data, cls=CustomJSONEncoder)

        # Convert JSON string to bytes and store as numpy array
        json_bytes = json_string.encode("utf-8")
        json_array = np.frombuffer(json_bytes, dtype=np.uint8)

        # Store the graph data as compressed array
        group.create_dataset(
            "graph_data",
            data=json_array,
        )

        # Store configuration as attributes
        config = {}
        if self.background_color is not None:
            config["backgroundColor"] = self.background_color
        if self.node_color is not None:
            config["nodeColor"] = self.node_color
        if self.link_color is not None:
            config["linkColor"] = self.link_color
        if not self.enable_node_click:
            config["enableNodeClick"] = False
        if not self.enable_node_hover:
            config["enableNodeHover"] = False
        if self.highlight_connected:
            config["highlightConnected"] = True
        if self.dag_mode is not None:
            config["dagMode"] = self.dag_mode
        if self.cooldown_ticks is not None:
            config["cooldownTicks"] = self.cooldown_ticks
        if self.warmup_ticks is not None:
            config["warmupTicks"] = self.warmup_ticks

        # Store configuration as JSON in attributes
        if config:
            group.attrs["config"] = json.dumps(config)

        # Store data size for reference
        group.attrs["data_size"] = len(json_bytes)
        group.attrs["num_nodes"] = len(self.nodes)
        group.attrs["num_links"] = len(self.links)
