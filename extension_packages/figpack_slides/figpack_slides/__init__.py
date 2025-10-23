"""
figpack_slides
"""

from .parse_markdown.parse_markdown import (
    create_presentation,
    ParsedSlide,
    ParsedSlideSection,
    embed_images_as_base64,
)

from .theme_default_1 import create_theme_default_1

__version__ = "0.2.7"

__all__ = [
    "create_presentation",
    "ParsedSlide",
    "ParsedSlideSection",
    "embed_images_as_base64",
    "create_theme_default_1",
]
