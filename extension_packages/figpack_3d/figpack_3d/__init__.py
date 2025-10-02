"""
figpack_3d - 3D visualization extension for figpack using Three.js

This package provides interactive 3D scene visualization using the Three.js library.
"""

from .three_d_view import ThreeDView
from .mesh_view import MeshView

__version__ = "0.1.3"
__all__ = ["ThreeDView", "MeshView"]
