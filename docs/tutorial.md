# Figpack Tutorial: Step-by-Step Guide to Creating Interactive Visualizations

This tutorial will guide you through creating various types of figures using figpack.

## Prerequisites

Before starting this tutorial, make sure you have figpack installed:

```bash
pip install figpack
```

## Markdown View

The Markdown view displays formatted text and documentation:

```python
import figpack.views as vv

# Create a simple markdown view
view = vv.Markdown(f"""
# Welcome to Figpack!

This is a **markdown view** that supports:

- **Bold text** and *italic text*
- [Links](https://github.com/flatironinstitute/figpack)
- Code blocks
""")

view.show(title="Markdown Example", open_in_browser=True)

```

<iframe src="./tutorial_markdown_example/index.html?embedded=1" width="100%" height="350" frameborder="0"></iframe>

## Image View

The Image view displays images from files or generated data:

```python
import io
import numpy as np
from PIL import Image as PILImage
import figpack.views as vv

# Generate a simple gradient image
width, height = 300, 200
x = np.linspace(0, 1, width)
y = np.linspace(0, 1, height)
X, Y = np.meshgrid(x, y)

# Create RGB gradient
R = (X * 255).astype(np.uint8)
G = (Y * 255).astype(np.uint8)
B = ((X + Y) * 127).astype(np.uint8)
rgb = np.stack([R, G, B], axis=2)

# Convert to image bytes
img = PILImage.fromarray(rgb)
img_bytes = io.BytesIO()
img.save(img_bytes, format="PNG")

# Create figpack view
view = vv.Image(img_bytes.getvalue())
view.show(title="Image Example", open_in_browser=True)
```

<iframe src="./tutorial_image_example/index.html?embedded=1" width="100%" height="300" frameborder="0"></iframe>

## Simple TimeseriesGraph

Create a basic line plot:

```python
import numpy as np
import figpack.views as vv

# Create a simple timeseries
graph = vv.TimeseriesGraph(y_label="Amplitude")

# Generate data
t = np.linspace(0, 10, 500)
y = np.sin(2 * np.pi * t) * np.exp(-t / 5)

# Add line series
graph.add_line_series(
    name="Damped Sine",
    t=t.astype(np.float32),
    y=y.astype(np.float32),
    color="blue"
)

graph.show(title="Simple Timeseries", open_in_browser=True)
```

<iframe src="./tutorial_simple_timeseries/index.html?embedded=1" width="100%" height="400" frameborder="0"></iframe>

## Multiple Series

Add different types of series to one plot:

```python
import numpy as np
import figpack.views as vv

# Create graph with multiple series
graph = vv.TimeseriesGraph(
    y_label="Value",
    legend_opts={"location": "northwest"}
)

t = np.linspace(0, 8, 400)

# Add line series
y1 = np.sin(2 * np.pi * 0.5 * t)
graph.add_line_series(
    name="Sine Wave",
    t=t.astype(np.float32),
    y=y1.astype(np.float32),
    color="blue"
)

# Add dashed line
y2 = 0.7 * np.cos(2 * np.pi * 0.3 * t)
graph.add_line_series(
    name="Cosine Wave",
    t=t.astype(np.float32),
    y=y2.astype(np.float32),
    color="red",
    dash=[8, 4]
)

# Add markers
t_markers = np.arange(0, 8, 1)
y_markers = 1.2 * np.sin(2 * np.pi * 0.2 * t_markers)
graph.add_marker_series(
    name="Data Points",
    t=t_markers.astype(np.float32),
    y=y_markers.astype(np.float32),
    color="green",
    radius=6
)

# Add intervals
graph.add_interval_series(
    name="Highlighted",
    t_start=np.array([1, 4]).astype(np.float32),
    t_end=np.array([2, 5]).astype(np.float32),
    color="yellow",
    alpha=0.3
)

graph.show(title="Multi-Series Plot", open_in_browser=True)
```

<iframe src="./tutorial_multi_series/index.html?embedded=1" width="100%" height="400" frameborder="0"></iframe>

## MultiChannelTimeseries

For multi-channel data like sensor arrays:

```python
import numpy as np
import figpack.views as vv

# Generate multi-channel data
sampling_freq = 1000
duration = 3
n_timepoints = int(sampling_freq * duration)
n_channels = 4

t = np.linspace(0, duration, n_timepoints)
data = np.zeros((n_timepoints, n_channels), dtype=np.float32)

# Different signal on each channel
data[:, 0] = np.sin(2 * np.pi * 2 * t)  # 2 Hz
data[:, 1] = np.sin(2 * np.pi * 5 * t)  # 5 Hz
data[:, 2] = np.sin(2 * np.pi * 10 * t)  # 10 Hz
data[:, 3] = np.random.randn(n_timepoints) * 0.5  # Noise

# Create view
view = vv.MultiChannelTimeseries(
    start_time_sec=0.0,
    sampling_frequency_hz=sampling_freq,
    data=data,
    channel_ids=["2Hz Signal", "5Hz Signal", "10Hz Signal", "Noise"]
)

view.show(title="Multi-Channel Data", open_in_browser=True)
```

<iframe src="./tutorial_multichannel_timeseries/index.html?embedded=1" width="100%" height="400" frameborder="0"></iframe>

## Matplotlib Integration

Embed matplotlib plots:

```python
import numpy as np
import matplotlib.pyplot as plt
import figpack.views as vv

# Create matplotlib figure
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(10, 4))

# Plot 1: Scatter with regression
x = np.random.randn(100)
y = 0.5 * x + 0.3 * np.random.randn(100)
ax1.scatter(x, y, alpha=0.6)
ax1.plot(x, 0.5 * x, 'r--', label='y = 0.5x')
ax1.set_xlabel('X')
ax1.set_ylabel('Y')
ax1.set_title('Scatter Plot')
ax1.legend()
ax1.grid(True, alpha=0.3)

# Plot 2: Histogram
data = np.random.normal(0, 1, 1000)
ax2.hist(data, bins=30, alpha=0.7, color='skyblue')
ax2.set_xlabel('Value')
ax2.set_ylabel('Frequency')
ax2.set_title('Histogram')
ax2.grid(True, alpha=0.3)

plt.tight_layout()

# Create figpack view
view = vv.MatplotlibFigure(fig=fig)
view.show(title="Matplotlib Example", open_in_browser=True)
```

<iframe src="./tutorial_matplotlib_example/index.html?embedded=1" width="100%" height="400" frameborder="0"></iframe>

## DataFrame View

Create and display interactive data tables using pandas DataFrames:

```python
import pandas as pd
import numpy as np
import figpack.views as vv

# Create sample data
data = {
    'Date': pd.date_range('2023-01-01', periods=5),
    'Value': np.random.normal(100, 10, 5).round(2),
    'Category': ['A', 'B', 'A', 'C', 'B'],
    'IsActive': [True, True, False, True, False]
}

# Create DataFrame
df = pd.DataFrame(data)

# Create view
view = vv.DataFrame(df)
view.show(title="DataFrame Example", open_in_browser=True)
```

<iframe src="./tutorial_dataframe_example/index.html?embedded=1" width="100%" height="300" frameborder="0"></iframe>

## Spectrogram

Visualize time-frequency data with interactive heatmaps:

```python
import numpy as np
import figpack.views as vv

# Generate synthetic spectrogram data
duration_sec = 10.0
sampling_freq_hz = 100.0
n_timepoints = int(duration_sec * sampling_freq_hz)

# Frequency parameters
freq_min_hz = 10.0
freq_max_hz = 200.0
freq_delta_hz = 5.0
n_frequencies = int((freq_max_hz - freq_min_hz) / freq_delta_hz) + 1

# Create synthetic data with spectral features
np.random.seed(42)
data = np.zeros((n_timepoints, n_frequencies), dtype=np.float32)

time_axis = np.linspace(0, duration_sec, n_timepoints)
freq_axis = np.linspace(freq_min_hz, freq_max_hz, n_frequencies)

for i, t in enumerate(time_axis):
    for j, f in enumerate(freq_axis):
        # Base noise
        data[i, j] = 0.1 * np.random.random()

        # Chirp signal (frequency sweep)
        chirp_freq = 50 + 100 * (t / duration_sec)
        if abs(f - chirp_freq) < 10:
            data[i, j] += 0.8 * np.exp(-((f - chirp_freq) / 5) ** 2)

        # Constant tone at 120 Hz
        if abs(f - 120) < 5:
            data[i, j] += 0.6

# Create spectrogram view
view = vv.Spectrogram(
    start_time_sec=0.0,
    sampling_frequency_hz=sampling_freq_hz,
    frequency_min_hz=freq_min_hz,
    frequency_delta_hz=freq_delta_hz,
    data=data,
)

view.show(title="Spectrogram Example", open_in_browser=True)
```

<iframe src="./tutorial_spectrogram_example/index.html?embedded=1" width="100%" height="400" frameborder="0"></iframe>

## Plotly Integration

Create interactive plotly visualizations:

```python
import numpy as np
import plotly.graph_objects as go
import figpack.views as vv

# Create subplot figure
from plotly.subplots import make_subplots
fig = make_subplots(rows=1, cols=2, specs=[[{'type': 'xy'}, {'type': 'scene'}]])

# Add 2D traces
x = np.linspace(0, 10, 100)
y1 = np.sin(x)
y2 = np.cos(x)

fig.add_trace(go.Scatter(x=x, y=y1, name='sin(x)', line=dict(color='blue')), row=1, col=1)
fig.add_trace(go.Scatter(x=x, y=y2, name='cos(x)', line=dict(color='red')), row=1, col=1)

# Add 3D spiral
t = np.linspace(0, 10*np.pi, 100)
x3d = np.cos(t)
y3d = np.sin(t)
z3d = t/10

fig.add_trace(go.Scatter3d(x=x3d, y=y3d, z=z3d, name='3D Spiral',
                          line=dict(color='green', width=4)), row=1, col=2)

# Update layout
fig.update_layout(
    title="2D and 3D Interactive Plots",
    scene=dict(camera=dict(eye=dict(x=1.5, y=1.5, z=1.5))),
    showlegend=True,
    width=900  # Make wider to accommodate both plots
)

# Create figpack view
view = vv.PlotlyFigure(fig=fig)
view.show(title="Plotly Example", open_in_browser=True)
```

<iframe src="./tutorial_plotly_example/index.html?embedded=1" width="100%" height="400" frameborder="0"></iframe>

## Box Layout

Arrange multiple views in rows and columns:

```python
import numpy as np
import figpack.views as vv

# Create some simple graphs
def create_simple_graph(name, color, freq):
    graph = vv.TimeseriesGraph(y_label="Amplitude")
    t = np.linspace(0, 5, 200)
    y = np.sin(2 * np.pi * freq * t)
    graph.add_line_series(
        name=name,
        t=t.astype(np.float32),
        y=y.astype(np.float32),
        color=color
    )
    return graph

graph1 = create_simple_graph("1 Hz", "blue", 1)
graph2 = create_simple_graph("2 Hz", "red", 2)
graph3 = create_simple_graph("3 Hz", "green", 3)

# Create horizontal layout
view = vv.Box(
    direction="horizontal",
    items=[
        vv.LayoutItem(graph1, title="Graph 1"),
        vv.LayoutItem(graph2, title="Graph 2"),
        vv.LayoutItem(graph3, title="Graph 3")
    ]
)

view.show(title="Box Layout Example", open_in_browser=True)
```

<iframe src="./tutorial_box_layout/index.html?embedded=1" width="100%" height="400" frameborder="0"></iframe>

## TabLayout

Organize views in tabs:

```python
import numpy as np
import figpack.views as vv

# Create different views for tabs
def create_graph(freq, color):
    graph = vv.TimeseriesGraph()
    t = np.linspace(0, 4, 200)
    y = np.sin(2 * np.pi * freq * t)
    graph.add_line_series(
        name=f"{freq} Hz",
        t=t.astype(np.float32),
        y=y.astype(np.float32),
        color=color
    )
    return graph

# Create tab layout
view = vv.TabLayout(
    items=[
        vv.TabLayoutItem(label="Low Freq", view=create_graph(1, "blue")),
        vv.TabLayoutItem(label="Mid Freq", view=create_graph(3, "red")),
        vv.TabLayoutItem(label="High Freq", view=create_graph(8, "green")),
        vv.TabLayoutItem(label="Info", view=vv.Markdown("# Analysis Results\nClick tabs to see different frequencies."))
    ]
)

view.show(title="Tab Layout Example", open_in_browser=True)
```

<iframe src="./tutorial_tab_layout/index.html?embedded=1" width="100%" height="400" frameborder="0"></iframe>

## Splitter Layout

Create resizable panes:

```python
import numpy as np
import figpack.views as vv

# Create two different visualizations
# Left: Time series
graph = vv.TimeseriesGraph(y_label="Signal")
t = np.linspace(0, 6, 300)
y = np.sin(2 * np.pi * t) + 0.5 * np.sin(2 * np.pi * 3 * t)
graph.add_line_series(
    name="Complex Signal",
    t=t.astype(np.float32),
    y=y.astype(np.float32),
    color="purple"
)

# Right: Documentation
docs = vv.Markdown("""
# Signal Analysis

This signal contains:
- **Fundamental**: 1 Hz sine wave
- **Harmonic**: 3 Hz component

## Features
- Interactive zooming
- Resizable panes
""")

# Create splitter
view = vv.Splitter(
    direction="horizontal",
    item1=vv.LayoutItem(graph, title="Signal Data"),
    item2=vv.LayoutItem(docs, title="Analysis Notes"),
    split_pos=0.7  # 70% for graph, 30% for docs
)

view.show(title="Splitter Layout Example", open_in_browser=True)
```

<iframe src="./tutorial_splitter_layout/index.html?embedded=1" width="100%" height="600" frameborder="0"></iframe>

## Complex Nested Layout

Combine multiple layout types:

```python
import numpy as np
import figpack.views as vv

# Create various components
def create_signal(freq, name, color):
    graph = vv.TimeseriesGraph()
    t = np.linspace(0, 3, 150)
    y = np.sin(2 * np.pi * freq * t)
    graph.add_line_series(name=name, t=t.astype(np.float32), y=y.astype(np.float32), color=color)
    return graph

# Top row: Three signals side by side
top_row = vv.Box(
    direction="horizontal",
    items=[
        vv.LayoutItem(create_signal(1, "1 Hz", "blue"), title="Low"),
        vv.LayoutItem(create_signal(3, "3 Hz", "red"), title="Mid"),
        vv.LayoutItem(create_signal(8, "8 Hz", "green"), title="High")
    ]
)

# Bottom: Tabs with analysis
analysis_tabs = vv.TabLayout(
    items=[
        vv.TabLayoutItem(label="Summary", view=vv.Markdown("# Signal Analysis\nThree different frequency components analyzed.")),
        vv.TabLayoutItem(label="Methods", view=vv.Markdown("# Methods\n- Fourier analysis\n- Time-domain features")),
    ]
)

# Combine with splitter
view = vv.Splitter(
    direction="vertical",
    item1=vv.LayoutItem(top_row, title="Signal Comparison"),
    item2=vv.LayoutItem(analysis_tabs, title="Analysis"),
    split_pos=0.6
)

view.show(title="Complex Layout Example", open_in_browser=True)
```

<iframe src="./tutorial_complex_layout/index.html?embedded=1" width="100%" height="700" frameborder="0"></iframe>
