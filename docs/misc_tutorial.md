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

Here we build a random network with five communities, where links are dense within a community and sparse between communities. Node size reflects the number of links, and hovering over a node highlights its neighbors.

```python
import numpy as np
from figpack_force_graph import ForceGraphView

rng = np.random.default_rng(3)
colors = ["#4e79a7", "#f28e2b", "#e15759", "#76b7b2", "#59a14f"]
community = np.repeat(np.arange(5), 10)
same = community[:, None] == community[None, :]
links = np.triu(rng.random(same.shape) < np.where(same, 0.3, 0.01), k=1)
degree = links.sum(axis=0) + links.sum(axis=1)

graph = ForceGraphView(highlight_connected=True)
for i, c in enumerate(community):
    graph.add_node(str(i), name=f"Node {i} (community {c + 1})", val=int(degree[i]), color=colors[c])
for i, j in zip(*np.nonzero(links)):
    graph.add_link(str(i), str(j))

graph.show(title="Force Graph Example", open_in_browser=True)
```

<iframe data-src="./tutorial_force_graph_example/index.html?embedded=1" width="100%" height="500" frameborder="0" loading="lazy"></iframe>

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

The ThreeDView displays a scene made of cubes, spheres and cylinders, each with a position, and optionally a rotation (radians), a scale and a color. Here we use spheres and cylinders to build a short stretch of DNA:

```python
import numpy as np
from figpack_3d import ThreeDView

rng = np.random.default_rng(0)
base_colors = {"A": "#ff6b6b", "T": "#ffd166", "G": "#4dabf7", "C": "#63e6be"}
partner = {"A": "T", "T": "A", "G": "C", "C": "G"}

view = ThreeDView(background_color="#15181c", camera_position=(0, 1.5, 6.5))
for i in range(30):
    angle = i * 2 * np.pi / 10.5  # 10.5 base pairs per turn
    direction = np.array([0, np.cos(angle), np.sin(angle)])
    center = np.array([(i - 14.5) * 0.34, 0, 0])
    base = rng.choice(list("ATGC"))
    for sign, b in [(1, base), (-1, partner[base])]:
        view.add_sphere(position=center + sign * direction, scale=(0.35, 0.35, 0.35), color="#e8e8e8")
        # cylinders point along y by default, so rotate about x to point toward the axis
        view.add_cylinder(position=center + sign * direction / 2, rotation=(angle, 0, 0), scale=(0.15, 1, 0.15), color=base_colors[b])

view.show(title="3D Scene Example", open_in_browser=True)
```

<iframe data-src="./tutorial_3d_scene_example/index.html?embedded=1" width="100%" height="500" frameborder="0" loading="lazy"></iframe>

Drag to rotate the scene and use the mouse wheel to zoom. For more options, see the [extension documentation](https://github.com/flatironinstitute/figpack/tree/main/extension_packages/figpack_3d).

### Mesh View

The MeshView displays a triangle mesh with a scalar value at each vertex, mapped to color. Here we color a torus by its Gaussian curvature, which is positive on the outer side and negative on the inner side:

```python
import numpy as np
from figpack_3d import MeshView

R, r = 2.0, 0.8  # major and minor radius
nu, nv = 120, 48
u, v = np.meshgrid(np.linspace(0, 2 * np.pi, nu, endpoint=False), np.linspace(0, 2 * np.pi, nv, endpoint=False), indexing="ij")
x = (R + r * np.cos(v)) * np.cos(u)
y = (R + r * np.cos(v)) * np.sin(u)
z = r * np.sin(v)
vertices = np.stack([x, y, z], axis=-1).reshape(-1, 3)
curvature = (np.cos(v) / (r * (R + r * np.cos(v)))).ravel()

# two triangles per grid cell, wrapping around in both directions
i, j = np.meshgrid(np.arange(nu), np.arange(nv), indexing="ij")
a, b = i * nv + j, (i + 1) % nu * nv + j
c, d = (i + 1) % nu * nv + (j + 1) % nv, i * nv + (j + 1) % nv
faces = np.concatenate([np.stack([a, b, c], axis=-1), np.stack([a, c, d], axis=-1)]).reshape(-1, 3)

view = MeshView(vertices=vertices, faces=faces, scalars=curvature, colormap="jet", camera_position=(0, -4.5, 3.5))
view.show(title="Mesh View Example", open_in_browser=True)
```

<iframe data-src="./tutorial_3d_mesh_example/index.html?embedded=1" width="100%" height="500" frameborder="0" loading="lazy"></iframe>

A larger example, with a mesh built from a sphere, is in [extension_packages/figpack_3d/examples/sphere_mesh_example.py](https://github.com/flatironinstitute/figpack/tree/main/extension_packages/figpack_3d/examples/sphere_mesh_example.py).

## figpack_franklab

The figpack_franklab extension provides Frank Lab specific neuroscience visualization tools, including track animation for animal navigation experiments.

### Installation

After installing figpack, run:

```bash
figpack extensions install --upgrade figpack_franklab
```

### Track Animation

The Track Animation view shows an animal's position and head direction on a binned track, together with a value for each spatial bin that changes from frame to frame (for example, a position decoded from neural activity). Here an animal runs laps on a circular track at a varying speed, and the decoded position sweeps back and forth around the true position:

```python
import numpy as np
import figpack_franklab.views as fv

fs = 30.0  # frames per second
t = np.arange(0, 60, 1 / fs)
angle = np.cumsum(0.4 + 0.6 * np.sin(2 * np.pi * t / 20) ** 2) / fs
x, y = 50 + 35 * np.cos(angle), 50 + 35 * np.sin(angle)

# 4 cm bins on a 100 cm square; the track is every bin within 6 cm of the circle
bin_size, n_bins = 4.0, 25
cx, cy = np.meshgrid((np.arange(n_bins) + 0.5) * bin_size, (np.arange(n_bins) + 0.5) * bin_size)
on_track = (np.abs(np.hypot(cx - 50, cy - 50) - 35) < 6).ravel()
iy, ix = np.unravel_index(np.nonzero(on_track)[0], cx.shape)

# per-frame values for the bins (bin index = iy * n_bins + ix), stored sparsely
decoded = angle + 0.15 + 0.25 * np.sin(2 * np.pi * 1.2 * t)
dist2 = (cx.ravel() - 50 - 35 * np.cos(decoded)[:, None]) ** 2 + (cy.ravel() - 50 - 35 * np.sin(decoded)[:, None]) ** 2
prob = np.exp(-dist2 / (2 * 6**2)) * on_track
frame, location = np.nonzero(prob > 0.02)

view = fv.TrackAnimation(
    positions=np.array([x, y], dtype=np.float32),
    head_direction=(angle + np.pi / 2).astype(np.float32),
    timestamps=t,
    sampling_frequency_hz=fs,
    timestamp_start=0.0,
    total_recording_frame_length=len(t),
    frame_bounds=np.bincount(frame, minlength=len(t)).astype(np.int32),  # number of entries per frame
    locations=location.astype(np.int32),
    values=prob[frame, location].astype(np.float32),
    xmin=0.0, xmax=100.0, ymin=0.0, ymax=100.0,
    xcount=n_bins, ycount=n_bins, bin_width=bin_size, bin_height=bin_size,
    track_bin_corners=np.concatenate([ix, iy]).astype(np.float32) * bin_size,  # lower-left corners, all x then all y
    track_bin_width=bin_size, track_bin_height=bin_size,
)
view.show(title="Track Animation Example", open_in_browser=True)
```

<iframe data-src="./tutorial_track_animation_example/index.html?embedded=1" width="100%" height="600" frameborder="0" loading="lazy"></iframe>

The track bins are drawn in the lowest color of the selected colormap, and the per-frame values are drawn on top of them. The controls below the plot play the animation (at 0.05x to 50x speed) and adjust the brightness and colormap.

## figpack_experimental

Some other miscellaneous views are provided in the figpack_experimental extension, including editable notes and lossy video display.

### Installation
After installing figpack, run:

```bash
figpack extensions install --upgrade figpack_experimental
```

### Lossy Video View

The LossyVideo view displays a sequence of RGB frames, given as a uint8 array of shape (frames, height, width, 3), compressed as MP4. Here we render the interference pattern of waves from two point sources:

```python
import numpy as np
import figpack_experimental.views as fpj

n, fps = 320, 30
yy, xx = np.mgrid[0:n, 0:n] / n
r1 = np.hypot(xx - 0.4, yy - 0.5)
r2 = np.hypot(xx - 0.6, yy - 0.5)

frames = []
for t in np.arange(0, 8, 1 / fps):
    h = np.cos(80 * r1 - 2 * np.pi * t) / np.sqrt(r1 + 0.05) + np.cos(80 * r2 - 2 * np.pi * t) / np.sqrt(r2 + 0.05)
    v = np.clip(h / 8 + 0.5, 0, 1)[:, :, None]
    frames.append(255 * (v * np.array([1.0, 0.75, 0.3]) + (1 - v) * np.array([0.05, 0.1, 0.3])))
data = np.array(frames, dtype=np.uint8)

v = fpj.LossyVideo(data=data, fps=fps)
v.show(title="Wave Interference", open_in_browser=True)
```

<iframe data-src="./tutorial_lossy_video_example/index.html?embedded=1" width="100%" height="500" frameborder="0" loading="lazy"></iframe>

To synchronize a video with the other time-based views in a figure, give it a start time. Frame i is then shown at time `start_time_sec + i / sampling_frequency_hz`, where `sampling_frequency_hz` defaults to `fps` and only needs to be given when the frames were sampled at a different rate than the playback rate. Moving the time in another view moves the video, and playing the video moves the time cursor in the other views. Here a video of a pendulum is shown next to a graph of its angle:

```python
import numpy as np
import figpack.views as vv
import figpack_experimental.views as fpj

fps, n = 30, 240
t = np.arange(0, 12, 1 / fps)
theta = 0.9 * np.exp(-t / 10) * np.cos(2 * np.pi * t / 2.2)  # angle of a damped pendulum (radians)

yy, xx = np.mgrid[0:n, 0:n]
data = np.full((len(t), n, n, 3), 245, dtype=np.uint8)
for i, a in enumerate(theta):
    bob_x, bob_y = n / 2 + 150 * np.sin(a), 30 + 150 * np.cos(a)
    for f in np.linspace(0, 1, 300):  # the rod, from the pivot to the bob
        r, c = int(30 + f * (bob_y - 30)), int(n / 2 + f * (bob_x - n / 2))
        data[i, r:r + 2, c:c + 2] = 60
    data[i][np.hypot(xx - bob_x, yy - bob_y) < 12] = (200, 60, 50)

video = fpj.LossyVideo(data=data, fps=fps, start_time_sec=0.0)
graph = vv.TimeseriesGraph(y_label="Angle (rad)")
graph.add_line_series(name="angle", t=t.astype(np.float32), y=theta.astype(np.float32), color="#c83c32")

view = vv.Box(direction="horizontal", items=[vv.LayoutItem(video, title="Pendulum"), vv.LayoutItem(graph, title="Angle")])
view.show(title="Synchronized Video", open_in_browser=True)
```

<iframe data-src="./tutorial_lossy_video_sync_example/index.html?embedded=1" width="100%" height="450" frameborder="0" loading="lazy"></iframe>

### fMRI BOLD View

The FmriBold view displays fMRI BOLD data from a NIfTI file, one slice at a time. Click a voxel to show its time series.

```python
import figpack_experimental.views as jv

url = "https://s3.amazonaws.com/openneuro.org/ds006661/sub-001/func/sub-001_task-main_run-01_bold.nii.gz"

v = jv.FmriBold.from_nii(url)
v.show(title="fMRI BOLD Example", open_in_browser=True)
```

<iframe data-src="./tutorial_fmri_bold_example/index.html?embedded=1" width="100%" height="800" frameborder="0" loading="lazy"></iframe>

### MultiChannelIntervals View

The MultiChannelIntervals view shows a multi-channel signal in a window around each of a set of intervals, one interval at a time, such as the response of an electrode array to repeated stimuli. Here each of 80 stimuli evokes a damped oscillation that reaches the deeper channels of a 24-channel probe slightly later:

```python
import numpy as np
from figpack_experimental.views import MultiChannelIntervals

rng = np.random.default_rng(0)
fs = 1000.0
n_trials, n_channels = 80, 24
stim_times = 2.0 + 3.0 * np.arange(n_trials) + rng.uniform(0, 1, n_trials)
tt = np.arange(-0.1, 0.3, 1 / fs)  # window around each stimulus

s = tt[:, None] - (0.02 + 0.003 * np.arange(n_channels))  # time since the response arrived
response = np.where(s > 0, np.sin(2 * np.pi * 25 * s) * np.exp(-s / 0.05), 0)
gain = rng.uniform(0.5, 1.5, (n_trials, 1, 1))
data = gain * response + 0.15 * rng.standard_normal((n_trials, len(tt), n_channels))

view = MultiChannelIntervals(
    sampling_frequency_hz=fs,
    data=data,
    channel_ids=[f"ch{i}" for i in range(n_channels)],
    window_start_times_sec=stim_times - 0.1,
    interval_start_times_sec=stim_times,
    interval_end_times_sec=stim_times + 0.15,
)
view.show(title="Multi-Channel Intervals Example", open_in_browser=True)
```

<iframe data-src="./tutorial_multi_channel_intervals_example/index.html?embedded=1" width="100%" height="600" frameborder="0" loading="lazy"></iframe>

The data array has shape (intervals, timepoints, channels). Use the arrow buttons, or click in the timeline at the bottom, to step through the intervals; the highlighted region marks the interval within its window.

### LinearDecode View

The LinearDecode view shows a probability distribution over positions on a linear track as a function of time, such as a position decoded from place cell activity, optionally with the observed position overlaid. Here an animal runs back and forth on a 200 cm track, and the decoded distribution follows it with a slowly varying error:

```python
import numpy as np
from figpack_experimental.views import LinearDecode

rng = np.random.default_rng(0)
fs = 50.0
t = np.arange(0, 60, 1 / fs)
position = 100 - 90 * np.cos(2 * np.pi * t / 12 + np.sin(2 * np.pi * t / 37))  # cm
grid = np.arange(1, 200, 2.0)  # centers of the position bins

error = np.convolve(rng.normal(0, 60, len(t)), np.ones(25) / 25, mode="same")
decoded = np.clip(position + error, 10, 190)
posterior = np.exp(-((grid - decoded[:, None]) ** 2) / (2 * 10**2))
posterior /= posterior.sum(axis=1, keepdims=True)

view = LinearDecode(
    start_time_sec=0.0,
    sampling_frequency_hz=fs,
    data=posterior.astype(np.float32),  # shape (timepoints, positions)
    position_grid=grid.astype(np.float32),
    observed_positions=position.astype(np.float32),
)
view.show(title="Linear Decode Example", open_in_browser=True)
```

<iframe data-src="./tutorial_linear_decode_example/index.html?embedded=1" width="100%" height="600" frameborder="0" loading="lazy"></iframe>

The observed position is drawn as a white line, and gaps (NaN values) are left blank. Scroll and zoom in time as in a TimeseriesGraph, and use the brightness slider to adjust the color scale.

### ClusterLens View

The ClusterLens view explores high-dimensional data using UMAP dimensionality reduction, computed in the browser so that the parameters can be adjusted interactively. Here the points lie along four curved branches that meet at a common point in 20 dimensions, roughly as cells might along branching developmental trajectories:

```python
import numpy as np
from figpack_experimental.views import ClusterLens

rng = np.random.default_rng(0)
ends = rng.normal(0, 2, (4, 20))  # end point of each branch
bends = rng.normal(0, 2, (4, 20))
data, labels = [], []
for k in range(4):
    s = rng.uniform(0, 1, (400, 1))  # distance along the branch
    data.append(s * ends[k] + s * (1 - s) * bends[k] + rng.normal(0, 0.3, (400, 20)))
    labels.append(np.full(400, k))

view = ClusterLens(data=np.concatenate(data).astype(np.float32), cluster_labels=np.concatenate(labels))
view.show(title="ClusterLens Example", open_in_browser=True)
```

<iframe data-src="./tutorial_cluster_lens_example/index.html?embedded=1" width="100%" height="900" frameborder="0" loading="lazy"></iframe>

Interactive features:
- **Pan/Zoom**: Drag to pan, scroll to zoom
- **Selection tools**: Rectangle (▢) and Lasso (⊚) selection with modifier keys (Shift: add, Alt: remove)
- **Create Plot**: Generate new windows from selected points for deeper exploration
- **UMAP parameters**: Adjust `n_neighbors`, `min_dist`, and `spread` per plot

### Sphere Embedding View

The SphereEmbedding view displays a sphere embedded into a new geometry in R^3, rendered as a rotatable 3D surface with one or more scalar fields shown as heatmaps. The spherical grid follows the [shtns](https://nschaeff.bitbucket.io/shtns/) conventions: spatial arrays have shape `(nlat, nphi)`, the latitudinal grid is given as `cos(theta)` (e.g. `sh.cos_theta`, Gauss nodes with poles not included), and phi is equally spaced starting at 0. The geometry and the fields may optionally vary over time.

```python
import numpy as np
from figpack_experimental.views import SphereEmbedding

nlat, nphi, num_times = 64, 128, 60

# Gauss-Legendre latitudinal grid, north pole first
# (matches the shtns default grid; with shtns, use sh.cos_theta instead)
cos_theta = np.polynomial.legendre.leggauss(nlat)[0][::-1]
phi = 2 * np.pi * np.arange(nphi) / nphi

theta_grid, phi_grid = np.meshgrid(np.arccos(cos_theta), phi, indexing="ij")
times = np.arange(num_times) * 0.1  # seconds

# Time-varying scalar field: a rotating pattern
t = times[:, None, None]
field = (
    np.sin(3 * theta_grid) * np.cos(4 * phi_grid - 6 * np.pi * t / times[-1])
    + 0.5 * np.cos(5 * theta_grid)
).astype(np.float32)

# Time-varying geometry: radial displacement proportional to the field,
# with a breathing amplitude
amplitude = 0.12 + 0.06 * np.sin(2 * np.pi * t / times[-1])
r = 1.0 + amplitude * field
coords = np.stack(
    [
        r * np.sin(theta_grid) * np.cos(phi_grid),
        r * np.sin(theta_grid) * np.sin(phi_grid),
        r * np.cos(theta_grid),
    ],
    axis=-1,
).astype(np.float32)

# A static field for comparison
static_field = (np.cos(theta_grid) ** 2).astype(np.float32)

view = SphereEmbedding(
    coords=coords,
    fields={"rotating pattern": field, "cos^2(theta)": static_field},
    cos_theta=cos_theta,
    phi=phi,
    times=times,
    colormap="jet",       # jet, viridis, plasma, inferno, coolwarm, grayscale
    playback_speed=0.5,   # initial playback speed multiplier
    # vmin=..., vmax=...  # initial color range; defaults to the data range
)
view.show(title="Sphere Embedding Example", open_in_browser=True)
```

<iframe data-src="./tutorial_sphere_embedding_example/index.html?embedded=1" width="100%" height="700" frameborder="0" loading="lazy"></iframe>

For a static figure, omit `times` and pass `coords` with shape `(nlat, nphi, 3)` and fields with shape `(nlat, nphi)`. Static and time-varying fields may be mixed; a field is time-varying when it has a leading time dimension `(num_times, nlat, nphi)`.

Interactive features:
- **Orbit controls**: Drag to rotate, scroll to zoom, right-drag to pan
- **Sphere ⟷ Embedded slider**: Morph ("pull back") between the embedded geometry and the original sphere
- **Field selector**: Choose which field to display as a heatmap, or `(none)` for a plain surface
- **Colormap and range**: Several colormaps; color range taken from the global field min/max, computed per-frame, or set manually with the two range sliders
- **Wireframe** overlay and **Reset view**
- **Playback** (when a time dimension is present): play/pause, back-to-start, frame stepping, speed selection, and a time slider, synchronized with other time-based views in the same figure

The controls reflow onto multiple rows at narrow widths, so the view remains usable on small screens.

## MountainLayout

The MountainLayout provides a workspace-style interface. The left panel has a button for each view, and below them any control views; the right panel has two tabbed workspaces (north and south) in which the views are opened.

### Basic Usage

Here we show a frequency-modulated tone with occasional chirps, both as a trace and as a spectrogram. Click a button on the left to open a view in the focused workspace; click a workspace to focus it.

```python
import numpy as np
import figpack.views as vv

fs = 1000
t = np.arange(0, 20, 1 / fs)
rng = np.random.default_rng(0)
freq = 150 + 80 * np.sin(2 * np.pi * t / 7)
x = np.sin(2 * np.pi * np.cumsum(freq) / fs) + 0.3 * rng.standard_normal(len(t))
for t0 in [3, 9.5, 15]:
    s = t[(t >= t0) & (t < t0 + 0.6)] - t0
    x[(t >= t0) & (t < t0 + 0.6)] += 1.5 * np.sin(2 * np.pi * (300 * s + 150 * s**2))

trace = vv.TimeseriesGraph(y_label="Amplitude")
trace.add_uniform_series(name="signal", start_time_sec=0, sampling_frequency_hz=fs, data=x.astype(np.float32))

# a simple spectrogram: power in consecutive 128-sample windows
win = 128
segments = x[: len(x) // win * win].reshape(-1, win) * np.hanning(win)
power = np.log10(np.abs(np.fft.rfft(segments, axis=1)) ** 2 + 1e-3)
spectrogram = vv.Spectrogram(start_time_sec=0, sampling_frequency_hz=fs / win, data=power.astype(np.float32), frequency_min_hz=0, frequency_delta_hz=fs / win)

notes = vv.Markdown("The trace and the spectrogram share a time axis.")

layout = vv.MountainLayout(
    items=[
        vv.MountainLayoutItem(label="Trace", view=trace),
        vv.MountainLayoutItem(label="Spectrogram", view=spectrogram),
        vv.MountainLayoutItem(label="Notes", view=notes, is_control=True, control_height=150),
    ]
)
layout.show(title="Mountain Layout Example", open_in_browser=True)
```

<iframe data-src="./tutorial_mountain_layout_example/index.html?embedded=1" width="100%" height="600" frameborder="0" loading="lazy"></iframe>

### MountainLayoutItem Properties

Each item in the mountain layout can have the following properties:

- `label` (required): Display name for the view button
- `view` (required): The figpack view to contain
- `is_control` (optional): Whether this is a control view (appears in bottom panel)
- `control_height` (optional): Height in pixels for control views
