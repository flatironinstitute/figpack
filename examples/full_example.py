import os
import figpack.views as vv
from views.example_box import example_box_layout
from views.example_image import example_image
from views.example_markdown import example_markdown
from views.example_matplotlib import example_matplotlib
from views.example_multichannel_timeseries import example_multichannel_timeseries
from views.example_plotly import example_plotly
from views.example_splitter import example_splitter_layout
from views.example_tablayout import example_tab_layout
from views.example_timeseries_graph import example_timeseries_graph


def main():
    view = create_full_example()

    title = "Full Example"
    description_md = """
# Full Example

This example demonstrates a variety of features of figpack.
"""

    upload = os.environ.get("FIGPACK_UPLOAD") == "1"
    _dev = os.environ.get("FIGPACK_DEV") == "1"
    view.show(
        open_in_browser=True,
        upload=upload,
        _dev=_dev,
        title=title,
        description=description_md,
    )


def create_full_example():
    tab_items = [
        vv.GalleryItem(example_box_layout(), label="Box"),
        vv.GalleryItem(example_image(), label="Image"),
        vv.GalleryItem(example_markdown(), label="Markdown"),
        vv.GalleryItem(example_matplotlib(), label="Matplotlib"),
        vv.GalleryItem(
            example_multichannel_timeseries(), label="Multichannel Timeseries"
        ),
        vv.GalleryItem(example_plotly(), label="Plotly"),
        vv.GalleryItem(example_splitter_layout(), label="Splitter"),
        vv.GalleryItem(example_tab_layout(), label="TabLayout"),
        vv.GalleryItem(example_timeseries_graph(), label="Timeseries Graph"),
    ]
    return vv.Gallery(items=tab_items)


if __name__ == "__main__":
    main()
