from typing import Optional
from .slides_extension import slides_extension
import figpack
from .Slide import SlideText, Slide


class TitleSlideContent(figpack.ExtensionView):
    def __init__(
        self,
        *,
        title: str | SlideText,
        subtitle: Optional[str | SlideText] = None,
        author: Optional[str | SlideText] = None,
    ):
        super().__init__(
            extension=slides_extension, view_type="slides.TitleSlideContent"
        )
        self.title = title
        self.subtitle = subtitle
        self.author = author

    def write_to_zarr_group(self, group: figpack.Group) -> None:
        super().write_to_zarr_group(group)
        if isinstance(self.title, str):
            group.attrs["title"] = {"text": self.title}
        else:
            title_data = {"text": self.title.text}
            if self.title.font_size is not None:
                title_data["font_size"] = self.title.font_size
            if self.title.font_family is not None:
                title_data["font_family"] = self.title.font_family
            if self.title.color is not None:
                title_data["color"] = self.title.color
            group.attrs["title"] = title_data

        if self.subtitle is not None:
            if isinstance(self.subtitle, str):
                group.attrs["subtitle"] = {"text": self.subtitle}
            else:
                subtitle_data = {"text": self.subtitle.text}
                if self.subtitle.font_size is not None:
                    subtitle_data["font_size"] = self.subtitle.font_size
                if self.subtitle.font_family is not None:
                    subtitle_data["font_family"] = self.subtitle.font_family
                if self.subtitle.color is not None:
                    subtitle_data["color"] = self.subtitle.color
                group.attrs["subtitle"] = subtitle_data

        if self.author is not None:
            if isinstance(self.author, str):
                group.attrs["author"] = {"text": self.author}
            else:
                author_data = {"text": self.author.text}
                if self.author.font_size is not None:
                    author_data["font_size"] = self.author.font_size
                if self.author.font_family is not None:
                    author_data["font_family"] = self.author.font_family
                if self.author.color is not None:
                    author_data["color"] = self.author.color
                group.attrs["author"] = author_data


class TitleSlide(Slide):
    def __init__(
        self,
        *,
        title: str | SlideText,
        subtitle: Optional[str | SlideText] = None,
        author: Optional[str | SlideText] = None,
        background_color: str = "white",
        overlays: Optional[list[str]] = None,
    ):
        self.title = title
        self.subtitle = subtitle
        self.author = author
        self.background_color = background_color
        super().__init__(
            title=self.title,
            hide_title=True,
            content=TitleSlideContent(
                title=self.title,
                subtitle=self.subtitle,
                author=self.author,
            ),
            header=None,
            footer=None,
            background_color=self.background_color,
            overlays=overlays,
        )
