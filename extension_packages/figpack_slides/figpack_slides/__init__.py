"""
figpack_slides
"""

from .parse_markdown.parse_markdown import (
    parse_markdown_to_slides,
    ParsedSlide,
    ParsedSlideSection,
    embed_images_as_base64,
)

__version__ = "0.1.7"
