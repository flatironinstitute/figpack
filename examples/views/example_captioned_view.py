#!/usr/bin/env python3
"""
Example demonstrating the CaptionedView
"""

import numpy as np
import figpack.views as vv

# Test 1: Simple caption with TimeseriesGraph
print("Creating example 1: Simple caption with TimeseriesGraph")
graph = vv.TimeseriesGraph(y_label="Signal")
t = np.linspace(0, 10, 1000)
y = np.sin(2 * np.pi * t)
graph.add_line_series(name="sine wave", t=t, y=y, color="blue")

captioned = vv.CaptionedView(
    view=graph, caption="This is a simple sine wave with frequency 1 Hz."
)

captioned.show(title="Example 1: Simple Caption", open_in_browser=True)

# Test 2: Long caption that should wrap
print("Creating example 2: Long caption that wraps")
graph2 = vv.TimeseriesGraph(y_label="Signal")
y2 = np.cos(2 * np.pi * t)
graph2.add_line_series(name="cosine wave", t=t, y=y2, color="red")

long_caption = (
    "This is a much longer caption that should wrap to multiple lines when the "
    "figure width is narrow. It demonstrates how the caption height dynamically "
    "adjusts based on the text content and the available width. When you resize "
    "the browser window, you should see the child view height adjust automatically "
    "to accommodate the changing caption height."
)

captioned2 = vv.CaptionedView(view=graph2, caption=long_caption)

captioned2.show(title="Example 2: Long Wrapping Caption", open_in_browser=True)

# Test 3: Custom font size
print("Creating example 3: Custom font size")
graph3 = vv.TimeseriesGraph(y_label="Signal")
y3 = np.sin(4 * np.pi * t)
graph3.add_line_series(name="higher frequency", t=t, y=y3, color="green")

captioned3 = vv.CaptionedView(
    view=graph3, caption="This caption uses a larger font size (18px).", font_size=18
)

captioned3.show(title="Example 3: Large Font Caption", open_in_browser=True)
