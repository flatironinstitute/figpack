#!/usr/bin/env python3

"""
Example demonstrating the MountainLayout view - a workspace-style layout with left panel and split right panel
"""

import numpy as np
import figpack.views as vv


def main():
    # Create some sample views for the mountain layout

    # Create a timeseries graph
    ts_graph = vv.TimeseriesGraph(y_label="Signal")
    t = np.linspace(0, 10, 1000)
    y = np.sin(2 * np.pi * t)
    ts_graph.add_line_series(name="sine wave", t=t, y=y, color="blue")

    # Create an image view
    image_data = np.random.rand(100, 100, 3)  # Random RGB image
    # Convert to uint8 and then to PNG bytes
    image_uint8 = (image_data * 255).astype(np.uint8)
    from PIL import Image
    import io

    pil_image = Image.fromarray(image_uint8)
    png_buffer = io.BytesIO()
    pil_image.save(png_buffer, format="PNG")
    png_bytes = png_buffer.getvalue()
    image_view = vv.Image(png_bytes)

    # Create a markdown view
    markdown_content = """
# Control Panel

This is a control panel that appears in the bottom-left area.

- **Feature 1**: Some control option
- **Feature 2**: Another control option
- **Feature 3**: Yet another control option

You can interact with these controls to modify the views in the workspace areas.
"""
    control_view = vv.Markdown(markdown_content)

    # Create another timeseries for demonstration
    ts_graph2 = vv.TimeseriesGraph(y_label="Cosine Signal")
    y2 = np.cos(2 * np.pi * t)
    ts_graph2.add_line_series(name="cosine wave", t=t, y=y2, color="red")

    # Create a simple data table
    import pandas as pd

    df = pd.DataFrame({"Time": t[:10], "Sine": y[:10], "Cosine": y2[:10]})
    table_view = vv.DataFrame(df)

    # Create mountain layout items
    items = [
        vv.MountainLayoutItem(label="Sine Wave", view=ts_graph),
        vv.MountainLayoutItem(label="Random Image", view=image_view),
        vv.MountainLayoutItem(label="Cosine Wave", view=ts_graph2),
        vv.MountainLayoutItem(label="Data Table", view=table_view),
        vv.MountainLayoutItem(
            label="Controls", view=control_view, is_control=True, control_height=250
        ),
    ]

    # Create the mountain layout
    mountain_layout = vv.MountainLayout(items=items)

    # Show the layout
    mountain_layout.show(title="Mountain Layout Example", open_in_browser=True)


if __name__ == "__main__":
    main()
