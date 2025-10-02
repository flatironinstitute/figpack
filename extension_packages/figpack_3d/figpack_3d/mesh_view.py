"""
MeshView - Custom triangle mesh visualization with scalar values
"""

import json
import numpy as np
from typing import Optional, Literal

import figpack
from .three_d_view import _three_d_extension, CustomJSONEncoder


class MeshView(figpack.ExtensionView):
    """
    A view for displaying custom triangle meshes with per-vertex scalar values.

    This view renders a 3D triangle mesh with color mapping based on scalar values
    at each vertex, enabling visualization of functions defined on mesh surfaces.
    """

    def __init__(
        self,
        *,
        vertices: np.ndarray,
        faces: np.ndarray,
        scalars: np.ndarray,
        colormap: Literal["viridis", "plasma", "jet", "rainbow"] = "viridis",
        wireframe: bool = False,
        background_color: Optional[str] = None,
        camera_position: Optional[tuple[float, float, float]] = None,
        enable_controls: bool = True,
        scalar_range: Optional[tuple[float, float]] = None,
    ):
        """
        Initialize a MeshView.

        Args:
            vertices: (N, 3) array of vertex positions [x, y, z]
            faces: (M, 3) array of triangle indices
            scalars: (N,) array of scalar values at each vertex
            colormap: Name of colormap for mapping scalars to colors
            wireframe: Whether to render mesh as wireframe
            background_color: Background color of the 3D scene (e.g., '#222222')
            camera_position: Initial camera position as (x, y, z)
            enable_controls: Whether to enable mouse controls for scene rotation
            scalar_range: Optional (min, max) range for scalar colormap.
                         If None, uses actual data range.
        """
        super().__init__(extension=_three_d_extension, view_type="3d.MeshView")

        # Validate inputs
        if (
            not isinstance(vertices, np.ndarray)
            or vertices.ndim != 2
            or vertices.shape[1] != 3
        ):
            raise ValueError("vertices must be an (N, 3) numpy array")

        if not isinstance(faces, np.ndarray) or faces.ndim != 2 or faces.shape[1] != 3:
            raise ValueError("faces must be an (M, 3) numpy array")

        if not isinstance(scalars, np.ndarray) or scalars.ndim != 1:
            raise ValueError("scalars must be a 1D numpy array")

        if len(scalars) != len(vertices):
            raise ValueError(
                f"scalars length ({len(scalars)}) must match vertices length ({len(vertices)})"
            )

        # Check face indices are valid
        if faces.min() < 0 or faces.max() >= len(vertices):
            raise ValueError(
                f"Face indices must be in range [0, {len(vertices)-1}], "
                f"but found range [{faces.min()}, {faces.max()}]"
            )

        self.vertices = vertices.astype(np.float32)
        self.faces = faces.astype(np.int32)
        self.scalars = scalars.astype(np.float32)
        self.colormap = colormap
        self.wireframe = wireframe
        self.background_color = background_color
        self.camera_position = camera_position
        self.enable_controls = enable_controls

        # Set scalar range
        if scalar_range is not None:
            self.scalar_range = scalar_range
        else:
            self.scalar_range = (float(scalars.min()), float(scalars.max()))

    def write_to_zarr_group(self, group: figpack.Group) -> None:
        """
        Write the mesh data to a Zarr group.

        Args:
            group: Zarr group to write data into
        """
        # Call parent method to set extension metadata
        super().write_to_zarr_group(group)

        # Store mesh geometry
        group.create_dataset("vertices", data=self.vertices, chunks=True)
        group.create_dataset("faces", data=self.faces, chunks=True)
        group.create_dataset("scalars", data=self.scalars, chunks=True)

        # Store configuration as attributes
        config = {
            "colormap": self.colormap,
            "wireframe": self.wireframe,
            "scalarRange": list(self.scalar_range),
        }

        if self.background_color is not None:
            config["backgroundColor"] = self.background_color
        if self.camera_position is not None:
            config["cameraPosition"] = list(self.camera_position)
        if not self.enable_controls:
            config["enableControls"] = False

        # Store configuration as JSON in attributes
        group.attrs["config"] = json.dumps(config, cls=CustomJSONEncoder)

        # Store metadata for reference
        group.attrs["num_vertices"] = len(self.vertices)
        group.attrs["num_faces"] = len(self.faces)
