"""
figpack_slides
"""

from .Slides import Slides
from .Slide import Slide, SlideText, SlideHeader, SlideFooter
from .TitleSlide import TitleSlide
from .Markdown import Markdown

__all__ = ["Slides", "Slide", "SlideText", "SlideHeader", "SlideFooter", "TitleSlide"]
