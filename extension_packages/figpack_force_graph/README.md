# figpack_force_graph

Force-directed graph visualization extension for figpack using the [force-graph](https://github.com/vasturiano/force-graph) library.

## Installation

```bash
pip install -e .
```

or

```bash
figpack extensions install figpack_force_graph
```

Note that this package is not available on PyPI.

## Usage

```python
from figpack_force_graph import ForceGraphView

# Create nodes and links
nodes = [
    {"id": "A", "name": "Node A", "val": 10, "color": "#ff6b6b"},
    {"id": "B", "name": "Node B", "val": 15, "color": "#4ecdc4"},
    {"id": "C", "name": "Node C", "val": 8, "color": "#45b7d1"},
    {"id": "D", "name": "Node D", "val": 12, "color": "#96ceb4"},
]

links = [
    {"source": "A", "target": "B", "color": "#999", "width": 2},
    {"source": "B", "target": "C", "color": "#666", "width": 1},
    {"source": "C", "target": "D", "color": "#999", "width": 2},
    {"source": "D", "target": "A", "color": "#666", "width": 1},
]

# Create the force graph view
graph = ForceGraphView(
    nodes=nodes,
    links=links,
    background_color="#f8f9fa",
    highlight_connected=True,
    cooldown_ticks=100
)

# Display the graph
graph.show(title="Force Graph Example", open_in_browser=True)
```

## Features

- **Interactive Force-Directed Layout**: Uses the force-graph library for smooth, physics-based node positioning
- **Customizable Styling**: Support for node colors, sizes, link colors, and widths
- **Interactive Features**: Node clicking, hovering, and dragging
- **Connected Node Highlighting**: Optional highlighting of connected nodes on hover
- **DAG Layout Support**: Special layouts for directed acyclic graphs
- **Performance Optimized**: Efficient data storage using Zarr compression

## Node Properties

Each node can have the following properties:

- `id` (required): Unique identifier for the node
- `name` (optional): Display name shown in tooltips
- `val` (optional): Numeric value affecting node size
- `color` (optional): Color of the node (CSS color string)

## Link Properties

Each link can have the following properties:

- `source` (required): ID of the source node
- `target` (required): ID of the target node
- `color` (optional): Color of the link (CSS color string)
- `width` (optional): Width of the link line

## Configuration Options

- `background_color`: Background color of the graph canvas
- `node_color`: Default color for nodes (if not specified per node)
- `link_color`: Default color for links (if not specified per link)
- `enable_node_click`: Enable/disable node click interactions
- `enable_node_hover`: Enable/disable node hover interactions
- `highlight_connected`: Highlight connected nodes when hovering
- `dag_mode`: DAG layout mode ('td', 'bu', 'lr', 'rl', 'radialout', 'radialin')
- `cooldown_ticks`: Number of simulation ticks before stopping
- `warmup_ticks`: Number of simulation ticks before rendering starts

## Adding Nodes and Links Dynamically

```python
graph = ForceGraphView()

# Add nodes
graph.add_node("node1", name="First Node", val=10, color="#ff6b6b")
graph.add_node("node2", name="Second Node", val=15, color="#4ecdc4")

# Add links
graph.add_link("node1", "node2", color="#999", width=2)

graph.show()
```

## Requirements

- Python >= 3.8
- figpack >= 0.2.0
- numpy
- zarr

## License

Apache License 2.0
