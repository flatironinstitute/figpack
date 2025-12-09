"""
figpack - A Python package for creating shareable, interactive visualizations in the browser
"""

__version__ = "0.3.12"

from .cli import view_figure
from .core import FigpackView, FigpackExtension, ExtensionView
from .core.zarr import Group
from .core._patch_figure import patch_figure
from .core._revert_patch_figure import revert_patch_figure

__all__ = [
    "view_figure",
    "FigpackView",
    "FigpackExtension",
    "ExtensionView",
    "Group",
    "patch_figure",
    "revert_patch_figure",
]
