import io
import numpy as np
from PIL import Image as PILImage
import figpack.views as vv


def main():
    view = example_vertical_layout()
    title = "Example Vertical Layout"
    description_md = """
# Example Vertical Layout

This is an example of a VerticalLayout created using figpack, demonstrating a vertically scrolling layout with fixed-height items.

The VerticalLayout differs from Box in that:
- Items have fixed heights (no stretching to fit container)
- Items take full horizontal width
- Container has a scrollbar for navigation
- Items are only rendered when they become visible (lazy loading)
"""

    view.show(open_in_browser=True, title=title, description=description_md)


def example_vertical_layout():
    # Create various sample views with different content

    # 1. Markdown introduction
    intro_md = vv.Markdown(
        """
# Introduction

This is a vertically scrolling layout where each item has a fixed height.
Scroll down to see more content!
"""
    )

    # 2. Timeseries graph
    graph1 = create_sample_graph("Sine Wave", color="blue")

    # 3. Image view
    image_data = create_sample_image(200, 300)
    image_view = vv.Image(image_data)

    # 4. Another markdown section
    details_md = vv.Markdown(
        """
## Details Section

This layout is useful for:
- Long-form content that doesn't need to fit in a single viewport
- Combining different types of views with specific size requirements
- Creating scrollable dashboards

Each item maintains its specified height regardless of the container size.
"""
    )

    # 5. Another timeseries graph
    graph2 = create_sample_graph("Cosine Wave", color="red")

    # 6. A third timeseries graph
    graph3 = create_sample_graph("Damped Oscillation", color="green")

    # 7. Final markdown
    conclusion_md = vv.Markdown(
        """
## Conclusion

This demonstrates the VerticalLayout view with various content types.
Notice how items are only rendered when they become visible as you scroll.
"""
    )

    # Create the VerticalLayout
    view = vv.VerticalLayout(
        show_titles=True,
        title="Vertical Scrolling Layout Demo",
        items=[
            vv.VerticalLayoutItem(intro_md, height=150, title="Introduction"),
            vv.VerticalLayoutItem(graph1, height=300, title="Graph 1: Sine Wave"),
            vv.VerticalLayoutItem(image_view, height=350, title="Random Image"),
            vv.VerticalLayoutItem(details_md, height=200, title="Details"),
            vv.VerticalLayoutItem(graph2, height=300, title="Graph 2: Cosine Wave"),
            vv.VerticalLayoutItem(
                graph3, height=300, title="Graph 3: Damped Oscillation"
            ),
            vv.VerticalLayoutItem(conclusion_md, height=150, title="Conclusion"),
        ],
    )

    return view


def create_sample_graph(name: str, color: str = "blue"):
    """
    Create a sample TimeseriesGraph for testing
    """
    G = vv.TimeseriesGraph(
        legend_opts={"location": "northwest"},
        y_range=[-10, 10],
        y_label="Amplitude",
        hide_x_gridlines=False,
        hide_y_gridlines=True,
    )

    # Generate sample data
    n = 1000
    t = np.arange(0, n) / n * 10

    # Create different signal patterns based on the name
    if "Sine" in name:
        y = 5 * np.sin(2 * np.pi * t) + 2 * np.cos(4 * np.pi * t)
    elif "Cosine" in name:
        y = 3 * np.cos(3 * np.pi * t) + np.sin(6 * np.pi * t)
    elif "Damped" in name:
        y = 5 * np.sin(3 * np.pi * t) * np.exp(-t / 5)
    else:
        y = np.sin(2 * np.pi * t) + 0.5 * np.random.randn(len(t))

    G.add_line_series(
        name=name,
        t=t.astype(np.float32),
        y=y.astype(np.float32),
        color=color,
        width=2.0,
    )

    # Add some markers
    marker_indices = np.arange(0, len(t), len(t) // 10)
    G.add_marker_series(
        name=f"{name} markers",
        t=t[marker_indices].astype(np.float32),
        y=y[marker_indices].astype(np.float32),
        color=color,
        radius=3,
        shape="circle",
    )

    return G


def create_sample_image(height: int, width: int):
    """
    Create a sample random image and return as PNG bytes
    """
    # Create a colorful pattern
    x = np.linspace(0, 4 * np.pi, width)
    y = np.linspace(0, 4 * np.pi, height)
    X, Y = np.meshgrid(x, y)

    # Create RGB channels with different patterns
    r = ((np.sin(X) + 1) / 2 * 255).astype(np.uint8)
    g = ((np.cos(Y) + 1) / 2 * 255).astype(np.uint8)
    b = ((np.sin(X + Y) + 1) / 2 * 255).astype(np.uint8)

    # Stack into RGB image
    rgb = np.stack([r, g, b], axis=2)

    # Create a PIL Image and save to bytes
    img = PILImage.fromarray(rgb)
    img_bytes = io.BytesIO()
    img.save(img_bytes, format="PNG")

    return img_bytes.getvalue()


if __name__ == "__main__":
    main()
