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

### Mesh View

See the example in [extension_packages/figpack_3d/examples/sphere_mesh_example.py](https://github.com/flatironinstitute/figpack/tree/main/extension_packages/figpack_3d/examples/sphere_mesh_example.py).

Click the various tabs in the following:

<iframe src="https://figures.figpack.org/figures/default/3203970f506d660f861cdd9b364767a49e56c3aa/index.html?embedded=1" width="100%" height="600" frameborder="0"></iframe>

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

### MultiChannelIntervals View

The MultiChannelIntervals view is designed for visualizing multi-channel timeseries data with intervals or events, making it particularly useful for electrophysiology data where you want to examine signals around specific events or epochs.

```python
import numpy as np
from figpack_experimental.views import MultiChannelIntervals

# Set random seed for reproducibility
np.random.seed(42)

# Parameters
sampling_frequency_hz = 1000.0  # 1 kHz sampling rate
n_channels = 40
n_intervals = 200
window_duration_sec = 0.5  # 500 ms window
interval_duration_sec = 0.1  # 100 ms interval in the middle

# Calculate number of timepoints per window
n_timepoints = int(window_duration_sec * sampling_frequency_hz)

# Create arrays for window and interval times
recording_duration_sec = 6000.0
time_spacing = recording_duration_sec / n_intervals
window_start_times_sec = np.array([i * time_spacing for i in range(n_intervals)])
interval_start_times_sec = (
    window_start_times_sec + (window_duration_sec - interval_duration_sec) / 2
)
interval_end_times_sec = interval_start_times_sec + interval_duration_sec

# Generate data: shape (n_intervals, n_timepoints, n_channels)
data = np.zeros((n_intervals, n_timepoints, n_channels), dtype=np.float32)

for interval_idx in range(n_intervals):
    t = np.linspace(0, window_duration_sec, n_timepoints)
    interval_start_idx = int(
        (interval_start_times_sec[interval_idx] - window_start_times_sec[interval_idx])
        * sampling_frequency_hz
    )
    interval_end_idx = int(
        (interval_end_times_sec[interval_idx] - window_start_times_sec[interval_idx])
        * sampling_frequency_hz
    )

    # Create different patterns for different interval groups
    interval_type = interval_idx % 3  # Cycle through 3 types
    
    for ch in range(n_channels):
        # Each channel has a different frequency sine wave
        freq = 5 + ch * 2
        baseline = 0.5 * np.sin(2 * np.pi * freq * t)
        noise = np.random.randn(n_timepoints) * 0.2

        # Add a prominent burst during the interval that varies by type
        burst = np.zeros(n_timepoints)
        interval_t = t[interval_start_idx:interval_end_idx]
        
        if interval_type == 0:
            # High amplitude oscillation burst
            burst[interval_start_idx:interval_end_idx] = (
                3.0 * np.sin(2 * np.pi * 40 * interval_t)
            )
        elif interval_type == 1:
            # Rising ramp burst
            burst[interval_start_idx:interval_end_idx] = (
                4.0 * (interval_t - interval_t[0]) / interval_duration_sec
            )
        else:
            # Gaussian envelope burst
            center = (interval_start_idx + interval_end_idx) / 2
            width = (interval_end_idx - interval_start_idx) / 4
            envelope = np.exp(-((np.arange(interval_start_idx, interval_end_idx) - center) ** 2) / (2 * width ** 2))
            burst[interval_start_idx:interval_end_idx] = (
                3.5 * envelope * np.sin(2 * np.pi * 35 * interval_t)
            )

        data[interval_idx, :, ch] = baseline + noise + burst

# Create channel IDs
channel_ids = [f"Channel {i+1}" for i in range(n_channels)]

# Create the view
view = MultiChannelIntervals(
    sampling_frequency_hz=sampling_frequency_hz,
    data=data,
    channel_ids=channel_ids,
    window_start_times_sec=window_start_times_sec,
    interval_start_times_sec=interval_start_times_sec,
    interval_end_times_sec=interval_end_times_sec,
)

# Display the figure
view.show(title="Multi-Channel Intervals Example", open_in_browser=True)
```

<iframe src="./tutorial_multi_channel_intervals_example/index.html?embedded=1" width="100%" height="600" frameborder="0"></iframe>

The view displays multi-channel timeseries data organized by intervals, with the highlighted yellow region showing the actual interval within each window. Use the Previous/Next buttons to navigate between intervals. This is particularly useful for:

- Analyzing neural responses to stimuli or events
- Examining electrode recordings around detected events
- Visualizing trial-by-trial data in electrophysiology experiments
- Any scenario where you need to view multi-channel signals aligned to specific time intervals

## MountainLayout

The MountainLayout provides a workspace-style interface with a left panel for view buttons and controls, and a right panel with dual tab workspaces (north and south). This layout is ideal for applications that need to manage multiple views in a workspace environment.

### Basic Usage

Here's a simple example showing how to create a MountainLayout:

```python
import numpy as np
import figpack.views as vv

def create_mountain_layout():
    """Create a mountain layout with multiple views and a control panel"""
    
    # Create some sample views
    ts_graph = vv.TimeseriesGraph(y_label="Signal")
    t = np.linspace(0, 10, 1000)
    y = np.sin(2 * np.pi * t)
    ts_graph.add_line_series(name="sine wave", t=t, y=y, color="blue")
    
    # Create an image view
    image_data = np.random.rand(100, 100, 3)
    image_uint8 = (image_data * 255).astype(np.uint8)
    from PIL import Image
    import io
    pil_image = Image.fromarray(image_uint8)
    png_buffer = io.BytesIO()
    pil_image.save(png_buffer, format='PNG')
    png_bytes = png_buffer.getvalue()
    image_view = vv.Image(png_bytes)
    
    # Create a control panel
    control_content = """
# Control Panel

This control panel appears in the bottom-left area.

- **Feature 1**: Some control option
- **Feature 2**: Another control option
- **Feature 3**: Yet another control option
"""
    control_view = vv.Markdown(control_content)
    
    # Create mountain layout items
    items = [
        vv.MountainLayoutItem(label="Sine Wave", view=ts_graph),
        vv.MountainLayoutItem(label="Random Image", view=image_view),
        vv.MountainLayoutItem(
            label="Controls", 
            view=control_view, 
            is_control=True, 
            control_height=200
        )
    ]
    
    # Create the mountain layout
    mountain_layout = vv.MountainLayout(items=items)
    return mountain_layout

# Create and display the layout
layout = create_mountain_layout()
layout.show(title="Mountain Layout Example", open_in_browser=True)
```

<iframe src="./tutorial_mountain_layout_example/index.html?embedded=1" width="100%" height="600" frameborder="0"></iframe>

### Key Features

- **Left Panel**: Contains view buttons (top) and control views (bottom)
- **Right Panel**: Split into north and south tab workspaces
- **Interactive Tabs**: Click view buttons to open views in the focused workspace
- **Tab Management**: Views can be closed and reopened, with proper tab switching
- **Focus Indication**: Visual feedback shows which workspace (north/south) is currently focused
- **Control Views**: Special views marked with `is_control=True` appear in the bottom-left panel

### MountainLayoutItem Properties

Each item in the mountain layout can have the following properties:

- `label` (required): Display name for the view button
- `view` (required): The figpack view to contain
- `is_control` (optional): Whether this is a control view (appears in bottom panel)
- `control_height` (optional): Height in pixels for control views

The MountainLayout is perfect for creating dashboard-like interfaces where users need to manage multiple views in an organized workspace environment.
