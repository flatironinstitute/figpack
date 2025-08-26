import os
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.patches import Circle
import figpack.views as vv


def main():
    view = example_matplotlib()

    title = "Matplotlib Visualization Examples"
    description_md = """
# Matplotlib Visualization Examples

This example demonstrates several types of plots using figpack and matplotlib.

Features:
- **Mathematical Functions**: Trigonometric functions with different styles
- **Statistical Data**: Distribution analysis with histogram and curve fitting
- **Scatter Plot**: Correlation visualization with color mapping
- **Polar Plot**: Data visualization in polar coordinates

All plots are rendered as high-quality SVG graphics that scale perfectly.
"""

    view.show(
        open_in_browser=True,
        title=title,
        description=description_md,
    )


def example_matplotlib():
    # Create a figure with subplots
    fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(12, 10))
    fig.suptitle("Matplotlib Examples", fontsize=16, fontweight="bold")

    # 1. Mathematical Functions (Sine and Cosine)
    x = np.linspace(0, 4 * np.pi, 150)
    y_sin = np.sin(x)
    y_cos = np.cos(x)

    ax1.plot(x, y_sin, label="sin(x)", color="#FF6B6B", linewidth=2.5)
    ax1.plot(x, y_cos, label="cos(x)", color="#4ECDC4", linewidth=2.5)
    ax1.set_title("Mathematical Functions")
    ax1.set_xlabel("x")
    ax1.set_ylabel("f(x)")
    ax1.legend()
    ax1.grid(True, alpha=0.3)

    # 2. Statistical Distribution
    np.random.seed(42)
    data = np.random.normal(100, 15, 800)

    ax2.hist(
        data, bins=25, alpha=0.7, color="#4ECDC4", edgecolor="black", linewidth=0.5
    )

    # Add normal distribution curve
    x_norm = np.linspace(data.min(), data.max(), 100)
    y_norm = (
        800
        * 25
        * (1 / np.sqrt(2 * np.pi * 15**2))
        * np.exp(-0.5 * ((x_norm - 100) / 15) ** 2)
        * (data.max() - data.min())
        / 25
    )

    ax2.plot(x_norm, y_norm, color="#FF6B6B", linewidth=3, label="Normal Curve")
    ax2.set_title("Statistical Distribution")
    ax2.set_xlabel("Value")
    ax2.set_ylabel("Frequency")
    ax2.legend()
    ax2.grid(True, alpha=0.3)

    # 3. Scatter Plot with Color Mapping
    np.random.seed(123)
    n_points = 150
    x_scatter = np.random.randn(n_points)
    y_scatter = 0.6 * x_scatter + 0.4 * np.random.randn(n_points)
    colors = x_scatter + y_scatter  # Color by sum

    scatter = ax3.scatter(
        x_scatter, y_scatter, c=colors, cmap="viridis", s=50, alpha=0.7
    )
    ax3.set_title("Scatter Plot with Colors")
    ax3.set_xlabel("X Variable")
    ax3.set_ylabel("Y Variable")
    ax3.grid(True, alpha=0.3)
    plt.colorbar(scatter, ax=ax3, label="Color Scale")

    # 4. Polar Plot
    theta = np.linspace(0, 2 * np.pi, 100)
    r1 = 1 + 0.3 * np.cos(5 * theta)
    r2 = 0.8 + 0.2 * np.sin(7 * theta)

    # Convert to Cartesian for regular subplot
    x1 = r1 * np.cos(theta)
    y1 = r1 * np.sin(theta)
    x2 = r2 * np.cos(theta)
    y2 = r2 * np.sin(theta)

    ax4.plot(x1, y1, label="Pattern 1", color="#FF6B6B", linewidth=2)
    ax4.plot(x2, y2, label="Pattern 2", color="#4ECDC4", linewidth=2)
    ax4.set_title("Polar-like Patterns")
    ax4.set_xlabel("X")
    ax4.set_ylabel("Y")
    ax4.legend()
    ax4.grid(True, alpha=0.3)
    ax4.set_aspect("equal")

    # Add a circle for reference
    circle = Circle((0, 0), 1, fill=False, color="gray", linestyle="--", alpha=0.5)
    ax4.add_patch(circle)

    # Adjust layout to prevent overlap
    plt.tight_layout()

    view = vv.MatplotlibFigure(fig=fig)
    return view


if __name__ == "__main__":
    main()
