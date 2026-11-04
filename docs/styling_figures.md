# Styling figures

A figure's appearance, such as font sizes, colors and colormaps, is controlled by *style keys*. A limitation of setting appearance per view is that a figure with many views needs the same setting repeated many times. Here we describe a style mechanism in which a style set on a layout applies to every view inside it, so that a single setting on the root view styles the whole figure.

## Setting a style in Python

Every view has a `set_style` method that takes style keys as keyword arguments and returns the view itself:

```python
import figpack.views as vv

graph = vv.TimeseriesGraph(y_label="Voltage (mV)")
...
box = vv.Box(items=[vv.LayoutItem(graph, title="Signal"), ...])
box.set_style(label_font_size=16, tick_font_size=13, font_family="Georgia, serif")
box.show(title="My figure")
```

Calling `set_style` again merges the new keys over those set before. An unknown key raises a `ValueError` that lists the known keys. TimeseriesGraph also accepts the keys as a dict, `TimeseriesGraph(style={...})`, which is equivalent to calling `set_style`.

## How styles cascade

Each view's effective style is the style of the view that contains it, with its own keys merged over it. Thus a style set on the root view applies to every view in the figure, and a view inside it can override individual keys. For example, if the root sets `label_font_size=18` and `tick_font_size=14`, and one graph sets `label_font_size=24`, that graph uses a 24 px label and 14 px ticks, while every other view uses 18 px and 14 px.

The cascade is applied when the figure is rendered, so the stored data only records the keys that each view sets itself. A view ignores the keys that it does not use, so it is safe to set keys on a layout that only some of its views understand.

## Styles in the figure spec and in remixes

The style of each view appears as `props.style` in the figure spec, the `figpack.render(spec)` script in the figure's index.html. The spec reference written next to it has a "Style" section that lists the keys used by the views in that figure. This is how the remix page changes appearance: a request such as "make the axis labels larger" or "use a dark background" becomes an edit to `props.style` on the root node or on one view, and a remix patch carries the change like any other prop. Note that `props.style` replaces the node's stored style as a whole value; the cascade then merges it with the styles of the enclosing views.

We emphasize that each figure includes the viewer code it was made with. A figure made with an earlier version of figpack does not understand style keys, even when it is remixed; make the figure again with the current version to use them.

## Style keys

| Key | Type | Used by |
| --- | --- | --- |
| `label_font_size` | number (px) | TimeseriesGraph, MultiChannelTimeseries, Spectrogram |
| `tick_font_size` | number (px) | TimeseriesGraph, MultiChannelTimeseries, Spectrogram |
| `legend_font_size` | number (px) | TimeseriesGraph |
| `font_family` | CSS font family, e.g. `"Georgia, serif"` | time series views, layouts, CaptionedView, Markdown |
| `text_color` | CSS color | time series views, CaptionedView, Markdown |
| `background_color` | CSS color | time series views, TabLayout (active tab), CaptionedView, Markdown |
| `gridline_color` | CSS color | TimeseriesGraph, MultiChannelTimeseries, Spectrogram |
| `minor_gridline_color` | CSS color | TimeseriesGraph, MultiChannelTimeseries, Spectrogram |
| `title_font_size` | number (px) | Box, VerticalLayout, TabLayout |
| `title_color` | CSS color | Box, VerticalLayout, TabLayout |
| `title_background_color` | CSS color | Box, VerticalLayout, TabLayout |
| `border_color` | CSS color | Box, VerticalLayout, TabLayout, Splitter, CaptionedView |
| `colormap` | `"viridis"`, `"plasma"`, `"inferno"`, `"magma"` or `"gray"`; add `"_r"` to reverse | Spectrogram |

Some details:

- The time series views are TimeseriesGraph, MultiChannelTimeseries and Spectrogram. Their margins grow to fit larger label and tick fonts.
- `text_color` applies to the major tick labels; minor tick labels stay gray. `minor_gridline_color` also sets the color of the time axis line.
- `title_font_size` sets the item titles of Box and VerticalLayout (default 12 px) and the tabs of TabLayout (default 14 px). A layout's own title is 2 px larger than its item titles. Title bars and tab bars grow to fit.
- `title_color` and `title_background_color` are separate from `text_color` and `background_color`, so that a dark plot theme does not put light text on the default light title bars.

The toolbars below the time series views, and views in extension packages, do not use style keys yet.
