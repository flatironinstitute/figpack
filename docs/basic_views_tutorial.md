# Basic Views Tutorial

This tutorial will guide you through creating some basic figures using figpack.

## Prerequisites

Before starting this tutorial, make sure you have figpack installed:

```bash
pip install figpack
```

## Markdown View

The Markdown view displays formatted text, including tables (GitHub-flavored markdown) and LaTeX math between `$...$` or `$$...$$`. Use `\$` for a literal dollar sign.

```python
import figpack.views as vv

view = vv.Markdown(r"""
## Recording notes

Session of **14 March**, mouse *M7*, linear track. Place fields were estimated as the firing rate $\lambda(x)$ at each position $x$, smoothed with a Gaussian kernel:

$$
\lambda(x) = \frac{\sum_i K(x - x_i)}{\Delta t \sum_j K(x - x_j)}
$$

where $x_i$ is the position at each spike and $x_j$ the position in each time bin of width $\Delta t$.

| Epoch | Duration | Laps |
|-------|----------|------|
| Rest (home cage) | 10 min | |
| Track | 32 min | 40 |
| Rest (home cage) | 10 min | |

> Lap 23 was interrupted when the animal turned around midway; it is excluded from the place field estimates.
""")

view.show(title="Markdown Example", open_in_browser=True)
```

<iframe data-src="./tutorial_markdown_example/index.html?embedded=1" width="100%" height="560" frameborder="0" loading="lazy"></iframe>

## Image View

The Image view displays a PNG or JPEG image, given as a file path or as bytes. Here we draw the interference pattern of two point sources:

```python
import io
import numpy as np
from PIL import Image as PILImage
import figpack.views as vv

x, y = np.meshgrid(np.linspace(-1, 1, 800), np.linspace(-0.6, 0.6, 480))
r1 = np.hypot(x + 0.15, y)
r2 = np.hypot(x - 0.15, y)
wave = np.cos(60 * r1) / np.sqrt(r1 + 0.05) + np.cos(60 * r2) / np.sqrt(r2 + 0.05)

v = (wave - wave.min()) / (wave.max() - wave.min())
rgb = np.stack([v**2.5, v**1.2, 0.35 + 0.65 * v], axis=2)

buf = io.BytesIO()
PILImage.fromarray((255 * rgb).astype(np.uint8)).save(buf, format="PNG")

view = vv.Image(buf.getvalue())
view.show(title="Image Example", open_in_browser=True)
```

<iframe data-src="./tutorial_image_example/index.html?embedded=1" width="100%" height="500" frameborder="0" loading="lazy"></iframe>

## Simple TimeseriesGraph

Create a basic line plot. Two tones of nearby frequency produce beats:

```python
import numpy as np
import figpack.views as vv

t = np.linspace(0, 6, 6000)
y = np.cos(2 * np.pi * 10 * t) + np.cos(2 * np.pi * 10.5 * t)

graph = vv.TimeseriesGraph(y_label="Amplitude")
graph.add_line_series(name="10 Hz + 10.5 Hz", t=t, y=y, color="steelblue")

graph.show(title="Simple Timeseries", open_in_browser=True)
```

Drag to pan and use the mouse wheel to zoom in on individual cycles.

<iframe data-src="./tutorial_simple_timeseries/index.html?embedded=1" width="100%" height="400" frameborder="0" loading="lazy"></iframe>

## Multiple Series

A graph can combine line, marker and interval series. Here a response to four brief stimuli is shown under two conditions, along with noisy measurements of the first:

```python
import numpy as np
import figpack.views as vv

stim_onsets = np.array([1.0, 3.0, 5.0, 7.0])

def response(t, gain):
    s = t[:, None] - stim_onsets[None, :]
    return gain * np.sum(np.where(s > 0, s / 0.3 * np.exp(1 - s / 0.3), 0), axis=1)

t = np.linspace(0, 10, 2000)
t_samples = np.arange(0, 10, 0.08)
rng = np.random.default_rng(0)

graph = vv.TimeseriesGraph(y_label="Response", legend_opts={"location": "northeast"})
graph.add_interval_series(name="Stimulus", t_start=stim_onsets, t_end=stim_onsets + 0.2, color="gold", alpha=0.4)
graph.add_line_series(name="Control", t=t, y=response(t, 1.0), color="black", width=2)
graph.add_line_series(name="Drug", t=t, y=response(t, 0.55), color="crimson", width=2, dash=[6, 4])
graph.add_marker_series(name="Measured", t=t_samples, y=response(t_samples, 1.0) + 0.06 * rng.standard_normal(len(t_samples)), color="gray", radius=3)

graph.show(title="Multi-Series Plot", open_in_browser=True)
```

<iframe data-src="./tutorial_multi_series/index.html?embedded=1" width="100%" height="400" frameborder="0" loading="lazy"></iframe>

## Uniform Timeseries

For large, regularly sampled datasets, use a uniform series. figpack precomputes downsampled (min/max) versions of the data, so that only the resolution needed for the current view is loaded. This example shows one million samples of white, pink and brown noise, which differ in how their power falls off with frequency:

```python
import numpy as np
import figpack.views as vv

n = 1_000_000
sampling_frequency_hz = 1000.0
rng = np.random.default_rng(0)

# Shape white noise in the frequency domain: power ~ 1 / f^alpha
f = np.fft.rfftfreq(n, d=1 / sampling_frequency_hz)
f[0] = f[1]
channels = []
for alpha in [0, 1, 2]:
    x = np.fft.irfft(np.fft.rfft(rng.standard_normal(n)) / f ** (alpha / 2), n)
    channels.append(x / x.std())
data = np.column_stack(channels).astype(np.float32)

graph = vv.TimeseriesGraph(y_label="Signal", y_range=[-21, 12], legend_opts={"location": "northwest"})
graph.add_uniform_series(
    name="noise",
    start_time_sec=0.0,
    sampling_frequency_hz=sampling_frequency_hz,
    data=data,
    channel_names=["white", "pink", "brown"],
    colors=["gray", "hotpink", "saddlebrown"],
    channel_spacing=8,
)

graph.show(title="Uniform Timeseries Example", open_in_browser=True)
```

The full 1000 seconds are shown initially. Zoom in to see individual samples; the data shown is fetched at the resolution needed for the current range.

<iframe data-src="./tutorial_uniform_timeseries/index.html?embedded=1" width="100%" height="400" frameborder="0" loading="lazy"></iframe>

### Real-World Example

Here's an electrophysiology array demonstrating efficient rendering of uniform timeseries data with multiple channels:

<iframe data-src="https://figures.figpack.org/figures/default/553173cf7d0c0e5a50818d86/index.html" width="100%" height="600" frameborder="0" loading="lazy"></iframe>

*Data courtesy of [The Gillespie Lab](https://www.gillespie-lab.com/)*

## MultiChannelTimeseries

MultiChannelTimeseries stacks channels that share a sampling rate, such as recordings from a sensor array. In this example a burst of 8 Hz activity travels across a row of 16 sensors on top of an ongoing 3 Hz rhythm. The buttons below the plot change the vertical spacing of the channels.

```python
import numpy as np
import figpack.views as vv

sampling_frequency_hz = 500
t = np.arange(0, 4, 1 / sampling_frequency_hz)[:, None]
channel = np.arange(16)[None, :]

delay = 0.025 * channel  # seconds
envelope = np.exp(-(((t - 1.5 - delay) / 0.5) ** 2))
rng = np.random.default_rng(0)
background = 0.3 * np.sin(2 * np.pi * 3 * t + rng.uniform(0, 2 * np.pi, 16)) + 0.05 * rng.standard_normal((len(t), 16))
data = 0.7 * envelope * np.sin(2 * np.pi * 8 * (t - delay)) + background

view = vv.MultiChannelTimeseries(
    start_time_sec=0.0,
    sampling_frequency_hz=sampling_frequency_hz,
    data=data,
    channel_ids=[f"S{i + 1}" for i in range(16)],
)

view.show(title="Multi-Channel Data", open_in_browser=True)
```

<iframe data-src="./tutorial_multichannel_timeseries/index.html?embedded=1" width="100%" height="500" frameborder="0" loading="lazy"></iframe>

## Matplotlib Integration

Embed a matplotlib figure. It is stored as SVG, so it stays sharp when resized:

```python
import numpy as np
import matplotlib.pyplot as plt
import figpack.views as vv

# Phase portrait of a damped pendulum
theta, omega = np.meshgrid(np.linspace(-2 * np.pi, 2 * np.pi, 200), np.linspace(-3, 3, 150))
d_theta = omega
d_omega = -np.sin(theta) - 0.25 * omega

fig, ax = plt.subplots(figsize=(9, 4.5))
ax.streamplot(theta, omega, d_theta, d_omega, color=np.hypot(d_theta, d_omega), cmap="viridis", density=1.6, linewidth=0.8)
ax.set_xlabel("Angle (rad)")
ax.set_ylabel("Angular velocity (rad/s)")
ax.set_title("Damped pendulum")

view = vv.MatplotlibFigure(fig=fig)
view.show(title="Matplotlib Example", open_in_browser=True)
```

<iframe data-src="./tutorial_matplotlib_example/index.html?embedded=1" width="100%" height="450" frameborder="0" loading="lazy"></iframe>

## DataFrame View

Display a pandas DataFrame as an interactive table. Click a column header to sort:

```python
import pandas as pd
import figpack.views as vv

df = pd.DataFrame({
    "Planet": ["Mercury", "Venus", "Earth", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune"],
    "Distance (AU)": [0.387, 0.723, 1.0, 1.524, 5.203, 9.537, 19.19, 30.07],
    "Period (years)": [0.241, 0.615, 1.0, 1.881, 11.86, 29.45, 84.02, 164.8],
    "Radius (Earth = 1)": [0.383, 0.949, 1.0, 0.532, 11.21, 9.45, 4.01, 3.88],
    "Mass (Earth = 1)": [0.0553, 0.815, 1.0, 0.107, 317.8, 95.2, 14.5, 17.1],
    "Gas giant": [False, False, False, False, True, True, True, True],
})

# Kepler's third law: period^2 / distance^3 is the same for every planet
df["Period² / Distance³"] = (df["Period (years)"] ** 2 / df["Distance (AU)"] ** 3).round(3)

view = vv.DataFrame(df)
view.show(title="DataFrame Example", open_in_browser=True)
```

<iframe data-src="./tutorial_dataframe_example/index.html?embedded=1" width="100%" height="300" frameborder="0" loading="lazy"></iframe>

## Spectrogram

Visualize time-frequency data as an interactive heatmap. Here we compute a short-time Fourier transform of a tone with five harmonics and a slow vibrato:

```python
import numpy as np
import figpack.views as vv

fs = 4000
t = np.arange(0, 8, 1 / fs)
f0 = 300 + 60 * np.sin(2 * np.pi * 0.5 * t)
phase = 2 * np.pi * np.cumsum(f0) / fs
x = sum(np.sin(k * phase) / k for k in range(1, 6))

nfft, hop = 512, 64
frames = np.lib.stride_tricks.sliding_window_view(x, nfft)[::hop] * np.hanning(nfft)
power = np.abs(np.fft.rfft(frames, axis=1)) ** 2

view = vv.Spectrogram(
    start_time_sec=nfft / 2 / fs,
    sampling_frequency_hz=fs / hop,
    frequency_min_hz=0,
    frequency_delta_hz=fs / nfft,
    data=np.log1p(power),
)

view.show(title="Spectrogram Example", open_in_browser=True)
```

<iframe data-src="./tutorial_spectrogram_example/index.html?embedded=1" width="100%" height="400" frameborder="0" loading="lazy"></iframe>

Non-uniformly spaced frequencies are also supported: pass `frequencies=...` (one value per column of `data`) instead of `frequency_min_hz` and `frequency_delta_hz`.

## Plotly Integration

Embed an interactive plotly figure. This one is a (2, 5) torus knot; drag to rotate it:

```python
import numpy as np
import plotly.graph_objects as go
import figpack.views as vv

s = np.linspace(0, 2 * np.pi, 2000)
p, q = 2, 5
r = 2 + np.cos(q * s)
x, y, z = r * np.cos(p * s), r * np.sin(p * s), np.sin(q * s)

fig = go.Figure(go.Scatter3d(x=x, y=y, z=z, mode="lines", line=dict(color=np.cos(q * s), colorscale="Plasma", width=12)))
fig.update_scenes(aspectmode="data", xaxis_visible=False, yaxis_visible=False, zaxis_visible=False)
fig.update_layout(margin=dict(l=0, r=0, t=0, b=0), scene_camera=dict(eye=dict(x=0.6, y=0.6, z=1.7)))

view = vv.PlotlyFigure(fig=fig)
view.show(title="Plotly Example", open_in_browser=True)
```

<iframe data-src="./tutorial_plotly_example/index.html?embedded=1" width="100%" height="500" frameborder="0" loading="lazy"></iframe>

## Box Layout

Arrange multiple views in rows or columns. A Box can have a title, and each item can have its own. Time-based views in the same figure share a time axis, so zooming one graph zooms the others. Here we show partial sums of the Fourier series of a square wave:

```python
import numpy as np
import figpack.views as vv

t = np.linspace(0, 2, 4000)

def partial_sum(n_terms):
    k = np.arange(1, 2 * n_terms, 2)[:, None]
    return 4 / np.pi * np.sum(np.sin(2 * np.pi * k * t) / k, axis=0)

items = []
for n_terms, color in [(1, "steelblue"), (5, "darkorange"), (50, "seagreen")]:
    is_last = n_terms == 50
    graph = vv.TimeseriesGraph(y_range=[-1.4, 1.4], hide_nav_toolbar=not is_last, hide_time_axis_labels=not is_last)
    graph.add_line_series(name=f"{n_terms} terms", t=t, y=partial_sum(n_terms), color=color, width=1.5)
    items.append(vv.LayoutItem(graph, title=f"{n_terms} terms"))

view = vv.Box(direction="vertical", title="Fourier series of a square wave", items=items)
view.show(title="Box Layout Example", open_in_browser=True)
```

<iframe data-src="./tutorial_box_layout/index.html?embedded=1" width="100%" height="600" frameborder="0" loading="lazy"></iframe>

## VerticalLayout

A VerticalLayout stacks items with fixed heights and scrolls when they do not fit. Unlike Box, items are not resized to fill the available space, which suits report-like figures:

```python
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import figpack.views as vv

intro = vv.Markdown("""
## The logistic map

Iterating `x = r * x * (1 - x)` from almost any starting point, the sequence settles to a single value for small r. As r increases, it alternates between 2, then 4, then 8 values, and for most r above about 3.57 it never settles.
""")

# Bifurcation diagram: the values visited after the transient has died out
r = np.linspace(2.8, 4.0, 3000)
x = np.full_like(r, 0.5)
fig, ax = plt.subplots(figsize=(9, 4))
for i in range(1000):
    x = r * x * (1 - x)
    if i >= 800:
        ax.plot(r, x, ",", color="black", alpha=0.25, rasterized=True)
ax.set_xlabel("r")
ax.set_ylabel("x")

# The period doublings come closer together by a factor approaching 4.669 (Feigenbaum's constant)
df = pd.DataFrame({"Period": [2, 4, 8, 16, 32, 64], "Onset r": [3.0, 3.449490, 3.544090, 3.564407, 3.568759, 3.569692]})
gaps = df["Onset r"].diff()
df["Ratio of gaps"] = (gaps.shift(1) / gaps).round(3)

view = vv.VerticalLayout(
    items=[
        vv.VerticalLayoutItem(intro, height=170),
        vv.VerticalLayoutItem(vv.MatplotlibFigure(fig), height=420, title="Bifurcation diagram"),
        vv.VerticalLayoutItem(vv.DataFrame(df), height=250, title="Period doubling"),
    ]
)

view.show(title="Vertical Layout Example", open_in_browser=True)
```

<iframe data-src="./tutorial_vertical_layout/index.html?embedded=1" width="100%" height="600" frameborder="0" loading="lazy"></iframe>

## TabLayout

Organize views in tabs. Each tab here shows a damped oscillator with a different damping ratio ζ:

```python
import numpy as np
import figpack.views as vv

t = np.linspace(0, 10, 2000)
omega = 2 * np.pi

tabs = []
for zeta in [0.02, 0.1, 0.3]:
    envelope = np.exp(-zeta * omega * t)
    graph = vv.TimeseriesGraph(y_range=[-1.1, 1.1])
    graph.add_line_series(name="envelope", t=t, y=envelope, color="gray", dash=[4, 4])
    graph.add_line_series(name="x(t)", t=t, y=envelope * np.cos(omega * np.sqrt(1 - zeta**2) * t), color="teal", width=2)
    tabs.append(vv.TabLayoutItem(label=f"ζ = {zeta}", view=graph))

view = vv.TabLayout(items=tabs)
view.show(title="Tab Layout Example", open_in_browser=True)
```

<iframe data-src="./tutorial_tab_layout/index.html?embedded=1" width="100%" height="400" frameborder="0" loading="lazy"></iframe>

## Splitter Layout

A Splitter shows two views separated by a draggable divider:

```python
import numpy as np
import figpack.views as vv

t = np.linspace(0, 4, 8000)
f0, k = 1.0, 3.0
graph = vv.TimeseriesGraph(y_label="x(t)")
graph.add_line_series(name="chirp", t=t, y=np.sin(2 * np.pi * (f0 * t + k * t**2 / 2)), color="darkorchid")

notes = vv.Markdown("""
### Linear chirp

x(t) = sin(2π (f₀ t + k t² / 2))

The instantaneous frequency f₀ + k t rises from 1 Hz to 13 Hz over four seconds.

Drag the divider to resize the panes.
""")

view = vv.Splitter(
    direction="horizontal",
    item1=vv.LayoutItem(graph, title="Signal"),
    item2=vv.LayoutItem(notes, title="Notes"),
    split_pos=0.65,
)

view.show(title="Splitter Layout Example", open_in_browser=True)
```

<iframe data-src="./tutorial_splitter_layout/index.html?embedded=1" width="100%" height="450" frameborder="0" loading="lazy"></iframe>

## Gallery

A Gallery lets the viewer flip through independent views, each listed by a label. Here each item is the Julia set of z → z² + c for a different value of c:

```python
import io
import numpy as np
from PIL import Image as PILImage
import figpack.views as vv

def julia_image(c, size=600, n_iter=120):
    x, y = np.meshgrid(np.linspace(-1.6, 1.6, size), np.linspace(-1.2, 1.2, size * 3 // 4))
    z = x + 1j * y
    escape = np.zeros(z.shape)
    for i in range(n_iter):
        inside = np.abs(z) < 2
        z[inside] = z[inside] ** 2 + c
        escape += inside
    v = (escape / n_iter) ** 0.4
    rgb = np.stack([v**0.6, v**1.5, v**4], axis=2)
    buf = io.BytesIO()
    PILImage.fromarray((255 * rgb).astype(np.uint8)).save(buf, format="PNG")
    return vv.Image(buf.getvalue())

c_values = [-0.8 + 0.156j, 0.285 + 0.01j, -0.4 + 0.6j, -0.7269 + 0.1889j]
view = vv.Gallery(items=[vv.GalleryItem(julia_image(c), label=f"c = {c.real:g}{c.imag:+g}i") for c in c_values])
view.show(title="Gallery Example", open_in_browser=True)
```

<iframe data-src="./tutorial_gallery_example/index.html?embedded=1" width="100%" height="500" frameborder="0" loading="lazy"></iframe>

## Complex Nested Layout

Layouts can be nested. Here a Splitter holds a Markdown description on the left and tabs on the right; the first tab is a Box of three synchronized graphs. The data is a trajectory of the Lorenz system:

```python
import numpy as np
import matplotlib.pyplot as plt
import figpack.views as vv

dt, n = 0.005, 8000
xyz = np.zeros((n, 3))
xyz[0] = [1.0, 1.0, 20.0]
for i in range(n - 1):
    x, y, z = xyz[i]
    xyz[i + 1] = xyz[i] + dt * np.array([10 * (y - x), x * (28 - z) - y, x * y - 8 / 3 * z])
t = np.arange(n) * dt

graphs = []
for j, (name, color) in enumerate([("x", "steelblue"), ("y", "darkorange"), ("z", "seagreen")]):
    graph = vv.TimeseriesGraph(y_label=name, hide_nav_toolbar=j < 2, hide_time_axis_labels=j < 2)
    graph.add_line_series(name=name, t=t, y=xyz[:, j], color=color)
    graphs.append(vv.LayoutItem(graph))

fig, ax = plt.subplots(figsize=(6, 5))
ax.plot(xyz[:, 0], xyz[:, 2], lw=0.4, color="midnightblue")
ax.set_xlabel("x")
ax.set_ylabel("z")

notes = vv.Markdown("""
### Lorenz system

- dx/dt = σ (y − x)
- dy/dt = x (ρ − z) − y
- dz/dt = x y − β z

with σ = 10, ρ = 28 and β = 8/3. The trajectory switches irregularly between the two lobes of the attractor.
""")

view = vv.Splitter(
    direction="horizontal",
    item1=vv.LayoutItem(notes, title="Description"),
    item2=vv.LayoutItem(
        vv.TabLayout(items=[
            vv.TabLayoutItem(label="Time series", view=vv.Box(direction="vertical", items=graphs)),
            vv.TabLayoutItem(label="x-z projection", view=vv.MatplotlibFigure(fig)),
        ])
    ),
    split_pos=0.3,
)

view.show(title="Complex Layout Example", open_in_browser=True)
```

<iframe data-src="./tutorial_complex_layout/index.html?embedded=1" width="100%" height="600" frameborder="0" loading="lazy"></iframe>
