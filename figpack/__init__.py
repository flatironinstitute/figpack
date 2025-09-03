"""
figpack - A Python package for creating shareable, interactive visualizations in the browser
"""

__version__ = "0.2.9"

from .cli import view_figure
from .core import FigpackView, FigpackExtension, ExtensionRegistry, ExtensionView

__all__ = [
    "view_figure",
    "FigpackView",
    "FigpackExtension",
    "ExtensionRegistry",
    "ExtensionView",
]
