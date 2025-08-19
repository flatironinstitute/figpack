# MatplotlibFigure

Display matplotlib figures as high-quality SVG graphics in figpack visualizations.

## Overview

`MatplotlibFigure` renders matplotlib figure objects as scalable SVG graphics, preserving all visual elements with perfect quality at any zoom level.

## Basic Usage

```python
import matplotlib.pyplot as plt
import numpy as np
import figpack.views as vv

# Create a matplotlib figure
fig, ax = plt.subplots(figsize=(8, 6))

x = np.linspace(0, 2 * np.pi, 100)
y = np.sin(x)

ax.plot(x, y, label="sin(x)", color="blue", linewidth=2)
ax.set_title("Simple Sine Wave")
ax.set_xlabel("x")
ax.set_ylabel("sin(x)")
ax.legend()
ax.grid(True)

# Create figpack view
view = vv.MatplotlibFigure(fig=fig)
view.show(open_in_browser=True)
```

## Constructor Parameters

- `fig`: The matplotlib figure object to display

## Multiple Subplots Example

```python
import matplotlib.pyplot as plt
import numpy as np
import figpack.views as vv

# Create figure with subplots
fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(12, 10))
fig.suptitle("Multiple Plot Examples", fontsize=16)

# Line plot
x = np.linspace(0, 4 * np.pi, 150)
ax1.plot(x, np.sin(x), label="sin(x)", linewidth=2)
ax1.plot(x, np.cos(x), label="cos(x)", linewidth=2)
ax1.set_title("Trigonometric Functions")
ax1.legend()
ax1.grid(True)

# Histogram
data = np.random.normal(100, 15, 800)
ax2.hist(data, bins=25, alpha=0.7, edgecolor="black")
ax2.set_title("Distribution")

# Scatter plot
x_scatter = np.random.randn(150)
y_scatter = 0.6 * x_scatter + 0.4 * np.random.randn(150)
colors = x_scatter + y_scatter
scatter = ax3.scatter(x_scatter, y_scatter, c=colors, cmap="viridis", s=50)
ax3.set_title("Scatter Plot")
plt.colorbar(scatter, ax=ax3)

# Polar pattern
theta = np.linspace(0, 2 * np.pi, 100)
r = 1 + 0.3 * np.cos(5 * theta)
x_polar = r * np.cos(theta)
y_polar = r * np.sin(theta)
ax4.plot(x_polar, y_polar, linewidth=2)
ax4.set_title("Polar Pattern")
ax4.set_aspect("equal")

plt.tight_layout()

view = vv.MatplotlibFigure(fig=fig)
view.show(open_in_browser=True)
```

## Example

See [example_matplotlib.py](../examples/example_matplotlib.py) for a complete demonstration with various plot types.
