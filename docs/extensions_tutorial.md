# Extensions Tutorial

This tutorial shows how to create views defined in figpack extensions. Extensions are separate packages that can be installed to add new types of visualizations to figpack.

## figpack_force_graph

The figpack_force_graph extension provides visualizations of graphs using the [force-graph](https://github.com/vasturiano/force-graph) library.

### Installation

First, clone the repository and install the extension:

```bash
git clone https://github.com/flatironinstitute/figpack.git
cd figpack/extension_packages/figpack_force_graph
pip install -e .
```

### Basic Usage

Here's a simple example showing how to create a force-directed graph:

```python
from figpack_force_graph import ForceGraphView
import numpy as np

def create_graph():
    """Create a graph using the dynamic add methods"""
    graph = ForceGraphView(background_color="#000000", highlight_connected=True)

    # Add nodes dynamically
    graph.add_node("central", name="Central Hub", val=20, color="#e74c3c")

    # Add satellite nodes
    colors = ["#3498db", "#2ecc71", "#f39c12", "#9b59b6", "#1abc9c"]
    for i in range(5):
        node_id = f"satellite_{i}"
        graph.add_node(
            node_id,
            name=f"Satellite {i+1}",
            val=np.random.randint(8, 15),
            color=colors[i],
        )
        graph.add_link("central", node_id, color="#95a5a6", width=2)

    # Add some interconnections
    graph.add_link("satellite_0", "satellite_2", color="#bdc3c7", width=1)
    graph.add_link("satellite_1", "satellite_3", color="#bdc3c7", width=1)
    graph.add_link("satellite_2", "satellite_4", color="#bdc3c7", width=1)

    return graph

# Create and display the graph
graph = create_graph()

graph.show(title="Force Graph Example", open_in_browser=True)
```

<iframe src="./tutorial_force_graph_example/index.html?embedded=1" width="100%" height="500" frameborder="0"></iframe>

### Node Properties

Each node in the graph can have the following properties:

- `id` (required): Unique identifier for the node
- `name` (optional): Display name shown in tooltips
- `val` (optional): Numeric value affecting node size
- `color` (optional): Color of the node (CSS color string)

### Link Properties

Each link in the graph can have the following properties:

- `source` (required): ID of the source node
- `target` (required): ID of the target node
- `color` (optional): Color of the link (CSS color string)
- `width` (optional): Width of the link line

### View Configuration

The ForceGraphView accepts several configuration options:

- `background_color`: Background color of the graph canvas
- `highlight_connected`: Whether to highlight connected nodes on hover
- `cooldown_ticks`: Number of simulation ticks before stopping
- `enable_node_click`: Enable/disable node click interactions
- `enable_node_hover`: Enable/disable node hover interactions

For more advanced usage and additional configuration options, please refer to the [extension documentation](https://github.com/flatironinstitute/figpack/tree/main/extension_packages/figpack_force_graph).

## figpack_3d

The figpack_3d extension provides interactive 3D visualizations using the [Three.js](https://threejs.org/) library.

### Installation

First, clone the repository and install the extension:

```bash
git clone https://github.com/flatironinstitute/figpack.git
cd figpack/extension_packages/figpack_3d
npm install
npm run build
pip install -e .
```

### Basic Usage

Here's a simple example showing how to create a 3D scene:

```python
from figpack_3d import ThreeDView
import numpy as np

def create_3d_scene():
    """Create a basic 3D scene with geometric objects"""
    view = ThreeDView(background_color="#222222")
    
    # Add a red cube at the center
    view.add_cube(position=(0, 0, 0), color="#ff4444")
    
    # Add blue spheres around the cube
    for i in range(4):
        angle = i * np.pi / 2
        x = 3 * np.cos(angle)
        z = 3 * np.sin(angle)
        view.add_sphere(position=(x, 0, z), color="#4444ff")
    
    # Add a wireframe cylinder
    view.add_cylinder(
        position=(0, 2, 0), 
        color="#44ff44", 
        wireframe=True
    )
    
    return view

# Create and display the 3D scene
scene = create_3d_scene()
scene.show(title="3D Scene Example", open_in_browser=True)
```

<iframe src="./tutorial_3d_scene_example/index.html?embedded=1" width="100%" height="500" frameborder="0"></iframe>

The figpack_3d extension supports cubes, spheres, and cylinders with customizable positions, colors, rotations, and scales. Mouse controls allow rotation (drag) and zooming (mouse wheel).

For more advanced usage, please refer to the [extension documentation](https://github.com/flatironinstitute/figpack/tree/main/extension_packages/figpack_3d).
