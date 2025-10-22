"""
Theme definitions for figpack slides.
A theme controls all aspects of slide presentation: styling, layout, and rendering.
"""

from dataclasses import dataclass
import figpack_slides as fps
import figpack_slides.views as fpsv


@dataclass
class SlideStyleConfig:
    """Styling configuration for slides."""

    # Title slide
    title_slide_background_color: str
    title_slide_text_color: str
    title_slide_title_font_size: int
    title_slide_subtitle_font_size: int
    title_slide_author_font_size: int

    # Standard slides
    standard_slide_background_color: str
    standard_slide_text_color: str
    standard_slide_title_font_size: int
    standard_slide_content_font_size: int
    standard_slide_external_markdown_font_size: int

    # Header and footer
    header_height: int
    header_background_color: str
    footer_height: int
    footer_background_color: str

    def get_header(self) -> fpsv.SlideHeader:
        """Create header for this theme."""
        return fpsv.SlideHeader(
            height=self.header_height, background_color=self.header_background_color
        )

    def get_footer(self) -> fpsv.SlideFooter:
        """Create footer for this theme."""
        return fpsv.SlideFooter(
            height=self.footer_height, background_color=self.footer_background_color
        )

    def get_content_font_size(self, metadata: dict) -> int:
        """Get font size based on metadata 'font' setting."""
        font = metadata.get("font-size", "medium")

        if font == "small":
            return 16
        elif font == "medium-small":
            return 20
        elif font == "large":
            return 40
        elif font == "medium-large":
            return 32
        else:
            return self.standard_slide_content_font_size


class Theme:
    """
    A theme controls all aspects of slide presentation.

    This includes:
    - Visual styling (colors, fonts, spacing)
    - Content processing (how markdown, images, iframes are rendered)
    - Slide building (how different slide types are constructed)
    - Custom views (user-defined visualizations)
    """

    def __init__(self, style: SlideStyleConfig, custom_view_types: dict = None):
        """
        Initialize a theme with a style configuration.

        Args:
            style: Configuration for visual styling
        """
        self.style = style
        self.custom_view_types = custom_view_types or {}

    def create_slide(self, parsed_slide: fps.ParsedSlide):
        """
        Create a slide from a parsed slide object.

        This is the main entry point that figpack_slides will call.
        """
        # Import here to avoid circular imports
        from .slide_builders import (
            build_title_slide,
            build_standard_slide,
            build_tabs_on_right_slide,
            build_box_layout_on_right_slide,
        )

        title = parsed_slide.title
        slide_type = parsed_slide.slide_type
        sections = parsed_slide.sections

        print(
            f"Creating slide: title='{title}', type='{slide_type}', Number of sections={len(sections)}"
        )

        if slide_type == "title":
            return build_title_slide(parsed_slide, self)
        elif slide_type == "tabs-on-right":
            return build_tabs_on_right_slide(parsed_slide, self)
        elif slide_type == "box-layout-on-right":
            return build_box_layout_on_right_slide(parsed_slide, self)
        else:
            return build_standard_slide(parsed_slide, self)


DEFAULT_STYLE = SlideStyleConfig(
    title_slide_background_color="#2C3E50",
    title_slide_text_color="#FFFFFF",
    title_slide_title_font_size=80,
    title_slide_subtitle_font_size=40,
    title_slide_author_font_size=30,
    standard_slide_background_color="#FFFFFF",
    standard_slide_text_color="#000000",
    standard_slide_title_font_size=50,
    standard_slide_content_font_size=28,
    standard_slide_external_markdown_font_size=16,
    header_height=10,
    header_background_color="#2C3E50",
    footer_height=10,
    footer_background_color="#2C3E50",
)


def create_theme_default_1(
    title_bg_color: str = None,
    title_text_color: str = None,
    title_font_size: int = None,
    subtitle_font_size: int = None,
    author_font_size: int = None,
    slide_bg_color: str = None,
    slide_text_color: str = None,
    slide_title_font_size: int = None,
    content_font_size: int = None,
    external_markdown_font_size: int = None,
    header_height: int = None,
    header_bg_color: str = None,
    footer_height: int = None,
    footer_bg_color: str = None,
    custom_view_types: dict = None,
) -> Theme:
    """
    Create a customized default theme with optional parameter overrides.

    All parameters are optional. If not provided, the DEFAULT_STYLE values will be used.

    Args:
        title_bg_color: Background color for title slide
        title_text_color: Text color for title slide
        title_font_size: Font size for title on title slide
        subtitle_font_size: Font size for subtitle on title slide
        author_font_size: Font size for author on title slide
        slide_bg_color: Background color for standard slides
        slide_text_color: Text color for standard slides
        slide_title_font_size: Font size for slide titles
        content_font_size: Font size for slide content
        external_markdown_font_size: Font size for external markdown content
        header_height: Height of header in pixels
        header_bg_color: Background color for header
        footer_height: Height of footer in pixels
        footer_bg_color: Background color for footer
        custom_view_types: Dictionary of custom view types (name -> function). function takes (metadata: dict, markdown: str) and returns a figpack.views.View.

    Returns:
        Theme object with customized styling

    Example:
        theme = create_theme_default_1(
            title_bg_color="#F0751C",
            header_bg_color="#F0751C",
            footer_bg_color="#F0751C"
        )
    """
    style = SlideStyleConfig(
        title_slide_background_color=title_bg_color
        or DEFAULT_STYLE.title_slide_background_color,
        title_slide_text_color=title_text_color or DEFAULT_STYLE.title_slide_text_color,
        title_slide_title_font_size=title_font_size
        or DEFAULT_STYLE.title_slide_title_font_size,
        title_slide_subtitle_font_size=subtitle_font_size
        or DEFAULT_STYLE.title_slide_subtitle_font_size,
        title_slide_author_font_size=author_font_size
        or DEFAULT_STYLE.title_slide_author_font_size,
        standard_slide_background_color=slide_bg_color
        or DEFAULT_STYLE.standard_slide_background_color,
        standard_slide_text_color=slide_text_color
        or DEFAULT_STYLE.standard_slide_text_color,
        standard_slide_title_font_size=slide_title_font_size
        or DEFAULT_STYLE.standard_slide_title_font_size,
        standard_slide_content_font_size=content_font_size
        or DEFAULT_STYLE.standard_slide_content_font_size,
        standard_slide_external_markdown_font_size=external_markdown_font_size
        or DEFAULT_STYLE.standard_slide_external_markdown_font_size,
        header_height=header_height or DEFAULT_STYLE.header_height,
        header_background_color=header_bg_color
        or DEFAULT_STYLE.header_background_color,
        footer_height=footer_height or DEFAULT_STYLE.footer_height,
        footer_background_color=footer_bg_color
        or DEFAULT_STYLE.footer_background_color,
    )
    return Theme(style, custom_view_types=custom_view_types or {})
