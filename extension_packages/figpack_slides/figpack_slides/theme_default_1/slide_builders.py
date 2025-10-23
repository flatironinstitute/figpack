"""
Slide builders for different slide types.
"""

from typing import List
import figpack.views as fpv
import figpack_slides.views as fpsv
import figpack_slides as fps
from .content_processors import (
    process_iframe,
    process_markdown_file,
    process_local_image,
    process_remote_image,
    process_markdown_content,
)
from .create_theme_default_1 import Theme


def build_title_slide(
    parsed_slide: fps.ParsedSlide, theme: Theme, *, slide_index: int
) -> fpsv.TitleSlide:
    """Build a title slide."""
    title = parsed_slide.title
    style = theme.style

    if len(parsed_slide.sections) != 1:
        raise ValueError("Title slide must have exactly one section.")

    metadata = parsed_slide.metadata
    subtitle = metadata.get("subtitle", "")
    author = metadata.get("author", "")

    return fpsv.TitleSlide(
        title=fpsv.SlideText(
            text=title,
            font_size=style.title_slide_title_font_size,
            font_family="SANS-SERIF",
            color=style.title_slide_text_color,
        ),
        subtitle=(
            fpsv.SlideText(
                text=subtitle,
                font_size=style.title_slide_subtitle_font_size,
                font_family="SANS-SERIF",
                color=style.title_slide_text_color,
            )
            if subtitle
            else None
        ),
        author=(
            fpsv.SlideText(
                text=author,
                font_size=style.title_slide_author_font_size,
                font_family="SANS-SERIF",
                color=style.title_slide_text_color,
            )
            if author
            else None
        ),
        background_color=style.title_slide_background_color,
        overlays=parsed_slide.overlays if parsed_slide.overlays else None,
    )


def build_standard_slide(
    parsed_slide: fps.ParsedSlide, theme: Theme, *, slide_index: int
) -> fpsv.Slide:
    """Build a standard slide with one or two columns."""
    title = parsed_slide.title
    sections = parsed_slide.sections
    style = theme.style

    if len(sections) == 0:
        raise ValueError("Standard slide must have at least one section.")

    if len(sections) == 1:
        # Single column
        content = process_section(
            sections[0], theme, slide_index=slide_index, section_index=0
        )
    elif len(sections) == 2:
        # Two columns
        items = []
        for i, section in enumerate(sections):
            items.append(
                fpv.LayoutItem(
                    view=process_section(
                        section, theme, slide_index=slide_index, section_index=i
                    ),
                    stretch=1,
                )
            )
        content = fpv.Box(direction="horizontal", items=items)
    else:
        raise ValueError("Slides with more than two sections are not supported.")

    return fpsv.Slide(
        title=fpsv.SlideText(
            text=title or "",
            font_size=style.standard_slide_title_font_size,
            font_family="SANS-SERIF",
            color=style.standard_slide_text_color,
        ),
        content=content,
        header=style.get_header(),
        footer=style.get_footer(),
        background_color=style.standard_slide_background_color,
        overlays=parsed_slide.overlays if parsed_slide.overlays else None,
    )


def build_tabs_on_right_slide(
    parsed_slide: fps.ParsedSlide, theme: Theme, *, slide_index: int
) -> fpsv.Slide:
    """Build a slide with tabs on the right side."""
    title = parsed_slide.title
    sections = parsed_slide.sections
    style = theme.style

    if len(sections) < 2:
        raise ValueError("Tabs-on-right slide must have at least two sections.")

    # First section goes on the left
    left_content = process_section(
        sections[0], theme, slide_index=slide_index, section_index=0
    )

    # Remaining sections become tabs on the right
    tabs: List[fpv.TabLayoutItem] = []
    for i, section in enumerate(sections[1:], start=1):
        tab_label = section.metadata.get("tab-label", f"Tab {i}")
        tabs.append(
            fpv.TabLayoutItem(
                label=tab_label,
                view=process_section(
                    section, theme, slide_index=slide_index, section_index=i
                ),
            )
        )

    # Create horizontal layout with left content and tabs on right
    content = fpv.Box(
        direction="horizontal",
        items=[
            fpv.LayoutItem(view=left_content, stretch=1),
            fpv.LayoutItem(view=fpv.TabLayout(items=tabs), stretch=1),
        ],
    )

    return fpsv.Slide(
        title=fpsv.SlideText(
            text=title or "",
            font_size=style.standard_slide_title_font_size,
            font_family="SANS-SERIF",
            color=style.standard_slide_text_color,
        ),
        content=content,
        header=style.get_header(),
        footer=style.get_footer(),
        background_color=style.standard_slide_background_color,
        overlays=parsed_slide.overlays if parsed_slide.overlays else None,
    )


def build_box_layout_on_right_slide(
    parsed_slide: fps.ParsedSlide, theme: Theme, *, slide_index: int
) -> fpsv.Slide:
    """Build a slide with a box layout on the right side."""
    title = parsed_slide.title
    sections = parsed_slide.sections
    style = theme.style

    if len(sections) < 2:
        raise ValueError("Box-layout-on-right slide must have at least two sections.")

    # First section goes on the left
    left_content = process_section(
        sections[0], theme, slide_index=slide_index, section_index=0
    )

    # Remaining sections become box layout on the right
    box_items: List[fpv.LayoutItem] = []
    for i, section in enumerate(sections[1:], start=1):
        box_items.append(
            fpv.LayoutItem(
                view=process_section(
                    section, theme, slide_index=slide_index, section_index=i
                ),
                stretch=1,
            )
        )

    # Create horizontal layout with left content and box layout on right
    content = fpv.Box(
        direction="horizontal",
        items=[
            fpv.LayoutItem(view=left_content, stretch=1),
            fpv.LayoutItem(
                view=fpv.Box(direction="vertical", items=box_items), stretch=1
            ),
        ],
    )

    return fpsv.Slide(
        title=fpsv.SlideText(
            text=title or "",
            font_size=style.standard_slide_title_font_size,
            font_family="SANS-SERIF",
            color=style.standard_slide_text_color,
        ),
        content=content,
        header=style.get_header(),
        footer=style.get_footer(),
        background_color=style.standard_slide_background_color,
        overlays=parsed_slide.overlays if parsed_slide.overlays else None,
    )


def process_section(
    section: fps.ParsedSlideSection,
    theme: Theme,
    *,
    slide_index: int,
    section_index: int,
):
    """Process a slide section and return appropriate view."""
    content = section.content.strip()
    metadata = section.metadata
    style = theme.style

    # Check for custom figpack view
    view_type = metadata.get("view-type")
    if view_type in theme.custom_view_types:
        return theme.custom_view_types[view_type](metadata, content)

    # Check for iframe
    if content.startswith("<iframe") and content.endswith("</iframe>"):
        return process_iframe(content)

    # Check for markdown file reference
    if content.startswith("./") and content.endswith(".md"):
        return process_markdown_file(
            content, metadata, style.standard_slide_external_markdown_font_size
        )

    # Check for single-line local image
    single_line = "\n" not in content
    if (
        single_line
        and content.startswith("![")
        and "](./" in content
        and content.endswith(")")
    ):
        return process_local_image(content)

    # Check for single-line remote image
    if (
        single_line
        and content.startswith("![")
        and "](https://" in content
        and content.endswith(")")
    ):
        return process_remote_image(content)

    # Regular markdown content
    font_size = style.get_content_font_size(metadata)
    return process_markdown_content(
        content, font_size, slide_index=slide_index, section_index=section_index
    )
