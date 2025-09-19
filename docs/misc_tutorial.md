# Miscellaneous Tutorial

This tutorial shows some miscellaneous views in figpack extensions.

## figpack_force_graph

The figpack_force_graph extension provides visualizations of graphs using the [force-graph](https://github.com/vasturiano/force-graph) library.

### Installation

After installing figpack, run:

```bash
figpack extensions install --upgrade figpack_force_graph
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

After installing figpack, run:

```bash
figpack extensions install --upgrade figpack_3d
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

## figpack_experimental

Some other miscellaneous views are provided in the figpack_experimental extension, including editable notes and lossy video display.

### Installation
After installing figpack, run:

```bash
figpack extensions install --upgrade figpack_experimental
```

### Lossy Video View

Here's a simple example showing how to create and display a lossy video:

```python
import figpack_experimental.views as fpj
import numpy as np

def create_circle(frame, center, radius, color):
    h, w = frame.shape[:2]
    y, x = np.ogrid[:h, :w]
    dist = np.sqrt((x - center[0])**2 + (y - center[1])**2)
    mask = dist <= radius
    frame[mask] = color

np.random.seed(0)
width = 640
height = 480
num_frames = 300
fps = 30.0

# Create black background frames
data = np.zeros((num_frames, height, width, 3), dtype=np.uint8)
# Initialize 3 balls with random positions and velocities
balls = []
colors = [(255,0,0), (0,255,0), (0,0,255)]  # RGB colors
radius = 20

for i in range(3):
    balls.append({
        'pos': np.array([
            np.random.randint(radius, width-radius),
            np.random.randint(radius, height-radius)
        ], dtype=float),
        'vel': np.array([
            np.random.uniform(-30, 30),
            np.random.uniform(-30, 30)
        ]),
        'color': colors[i]
    })

# Animate balls
for frame_idx in range(num_frames):
    frame = data[frame_idx]
    # Update each ball
    for ball in balls:
        # Update position
        ball['pos'] += ball['vel']
        # Bounce off walls
        if ball['pos'][0] <= radius or ball['pos'][0] >= width-radius:
            ball['vel'][0] *= -1
        if ball['pos'][1] <= radius or ball['pos'][1] >= height-radius:
            ball['vel'][1] *= -1
        # Keep ball in bounds
        ball['pos'][0] = np.clip(ball['pos'][0], radius, width-radius)
        ball['pos'][1] = np.clip(ball['pos'][1], radius, height-radius)
        # Draw ball
        create_circle(frame, ball['pos'], radius, ball['color'])

# Create and show video
v = fpj.LossyVideo(data=data, fps=fps)
v.show(title="Bouncing Balls Animation", open_in_browser=True)
```

<iframe src="./tutorial_lossy_video_example/index.html?embedded=1" width="100%" height="500" frameborder="0"></iframe>

### fMRI BOLD View

The figpack_experimental extension includes a view for visualizing fMRI BOLD data from NIfTI files.

```python
import figpack_experimental.views as jv


url = "https://s3.amazonaws.com/openneuro.org/ds006661/sub-001/func/sub-001_task-main_run-01_bold.nii.gz"

v = jv.FmriBold.from_nii(url)
v.show(title="fMRI BOLD Example", open_in_browser=True)
```

<iframe src="./tutorial_fmri_bold_example/index.html?embedded=1" width="100%" height="800" frameborder="0"></iframe>

### fMRI Video Example

Here's an example showing how to create a lossy video from an fMRI dataset:

```python
import os
import urllib.request
import numpy as np
import nibabel as nib
import figpack_experimental.views as jv


url = "https://s3.amazonaws.com/openneuro.org/ds006661/sub-001/func/sub-001_task-main_run-01_bold.nii.gz"
local_fname = "tmp-sub-001_task-main_run-01_bold.nii.gz"

# download if needed
if not os.path.exists(local_fname):
    print(f"Downloading from {url}...")
    urllib.request.urlretrieve(url, local_fname)
    print("Download complete.")
else:
    print(f"{local_fname} already exists. Skipping download.")

img = nib.load(local_fname)
data = img.get_fdata()
# scale to 0-255, and bring 99th percentile to 255
pct_99 = np.percentile(data, 99)
data = np.clip(data, 0, pct_99)
data = ((data / pct_99) * 255).astype(np.uint8)
# extract a slice
slice = data[:, :, -1]
# slice is W x H x T
# permute this so that it is T x H x W
slice = np.transpose(slice, (2, 1, 0))
# reverse the H direction so that it is not upside down
slice = slice[:, ::-1, :]
# make rgb channels, grayscale
slice_rgb = np.repeat(slice[:, :, :, np.newaxis], 3, axis=3)
# make a LossyVideo
v = jv.LossyVideo(slice_rgb, fps=10)
v.show(title="fMRI Series", open_in_browser=True)
```

<iframe src="./tutorial_fmri_video_example/index.html?embedded=1" width="100%" height="500" frameborder="0"></iframe>