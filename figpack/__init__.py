"""
figpack - A Python package for creating shareable, interactive visualizations in the browser
"""

__version__ = "0.3.7"

from .cli import view_figure
from .core import FigpackView, FigpackExtension, ExtensionView
from .core.zarr import Group

__all__ = [
    "view_figure",
    "FigpackView",
    "FigpackExtension",
    "ExtensionView",
    "Group",
]
