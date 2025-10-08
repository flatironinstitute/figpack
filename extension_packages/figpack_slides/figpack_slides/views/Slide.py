import numpy as np
from typing import Optional

import figpack
from .slides_extension import slides_extension


class SlideText:
    def __init__(
        self,
        text: str,
        *,
        font_size: Optional[int] = None,
        font_family: Optional[str] = None,
        color: Optional[str] = None,
    ):
        """
        Title section for a slide

        Args:
            text: The text
            font_size: Optional font size in pixels (default: 32)
            font_family: Optional font family (e.g., 'Arial', 'Georgia', 'monospace')
            color: Optional color for the text (e.g., 'white', '#FF0000', 'rgb(255, 0, 0)')
        """
        self.text = text
        self.font_size = font_size
        self.font_family = font_family
        self.color = color


class SlideHeader:
    def __init__(self, height: int, background_color: str):
        """
        Header section for a slide

        Args:
            height: Height of the header in pixels
            background_color: CSS color string for the background
        """
        self.height = height
        self.background_color = background_color


class SlideFooter:
    def __init__(self, height: int, background_color: str):
        """
        Footer section for a slide

        Args:
            height: Height of the footer in pixels
            background_color: CSS color string for the background
        """
        self.height = height
        self.background_color = background_color


class Slide(figpack.ExtensionView):
    def __init__(
        self,
        *,
        title: str | SlideText = "",
        hide_title: bool = False,
        content: Optional[figpack.FigpackView] = None,
        header: Optional[SlideHeader] = None,
        footer: Optional[SlideFooter] = None,
        background_color: Optional[str] = None,
    ):
        """
        A single slide in a slide deck

        Args:
            title: Title of the slide (can be a string or SlideText object)
            hide_title: If True, the title will not be displayed (default: False)
            content: Optional content view to display
            header: Optional header section
            footer: Optional footer section
            background_color: Optional background color for the slide content area
        """
        super().__init__(extension=slides_extension, view_type="slides.Slide")

        if isinstance(title, str):
            self.title = SlideText(text=title) if title else None
        else:
            self.title = title

        self.hide_title = hide_title

        self.content = content
        self.header = header
        self.footer = footer
        self.background_color = background_color

    def write_to_zarr_group(self, group: figpack.Group) -> None:
        """
        Write the data to a Zarr group

        Args:
            group: Zarr group to write data into
        """
        super().write_to_zarr_group(group)

        if self.title is not None:
            title_data = {"text": self.title.text}
            if self.title.font_size is not None:
                title_data["font_size"] = self.title.font_size
            if self.title.font_family is not None:
                title_data["font_family"] = self.title.font_family
            if self.title.color is not None:
                title_data["color"] = self.title.color
            group.attrs["title"] = title_data

        if self.hide_title:
            group.attrs["hide_title"] = True

        if self.header is not None:
            group.attrs["header"] = {
                "height": self.header.height,
                "background_color": self.header.background_color,
            }

        if self.footer is not None:
            group.attrs["footer"] = {
                "height": self.footer.height,
                "background_color": self.footer.background_color,
            }

        if self.background_color is not None:
            group.attrs["background_color"] = self.background_color

        if self.content is not None:
            content_group = group.create_group("content")
            self.content.write_to_zarr_group(content_group)
