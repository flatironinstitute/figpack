"""
ThreeDView - Interactive 3D visualization for figpack using Three.js
"""

import json
import numpy as np
import zarr
from typing import List, Dict, Any, Optional, Tuple

import figpack


class CustomJSONEncoder(json.JSONEncoder):
    """Custom JSON encoder that handles numpy arrays and other types"""

    def default(self, obj):
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        elif isinstance(obj, (np.integer, np.floating)):
            return obj.item()
        elif hasattr(obj, "isoformat"):  # Handle datetime-like objects
            return obj.isoformat()
        return super().default(obj)


def _load_javascript_code():
    """Load the JavaScript code from the built figpack_3d.js file"""
    import os

    js_path = os.path.join(os.path.dirname(__file__), "figpack_3d.js")
    try:
        with open(js_path, "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        raise FileNotFoundError(
            f"Could not find figpack_3d.js at {js_path}. "
            "Make sure to run 'npm run build' to generate the JavaScript bundle."
        )


# Create and register the 3D extension
_three_d_extension = figpack.FigpackExtension(
    name="figpack-3d",
    javascript_code=_load_javascript_code(),
    version="1.0.0",
)


class ThreeDView(figpack.ExtensionView):
    """
    A 3D visualization view using Three.js.

    This view displays interactive 3D scenes with various geometric objects,
    supporting mouse controls, lighting, and customizable styling.
    """

    def __init__(
        self,
        *,
        objects: Optional[List[Dict[str, Any]]] = None,
        background_color: Optional[str] = None,
        camera_position: Optional[Tuple[float, float, float]] = None,
        enable_controls: bool = True,
    ):
        """
        Initialize a ThreeDView.

        Args:
            objects: List of 3D object dictionaries. Each object should have:
                    - type (required): 'cube', 'sphere', or 'cylinder'
                    - position (required): [x, y, z] coordinates
                    - rotation (optional): [rx, ry, rz] rotation in radians
                    - scale (optional): [sx, sy, sz] scale factors
                    - color (optional): Color string (e.g., '#ff0000', 'red')
                    - wireframe (optional): Boolean for wireframe rendering
            background_color: Background color of the 3D scene
            camera_position: Initial camera position as [x, y, z]
            enable_controls: Whether to enable mouse controls for scene rotation
        """
        super().__init__(extension=_three_d_extension)

        self.objects = objects or []
        self.background_color = background_color
        self.camera_position = camera_position
        self.enable_controls = enable_controls

        # Validate objects
        self._validate_objects()

    def _validate_objects(self):
        """Validate the 3D objects data"""
        valid_types = {"cube", "sphere", "cylinder"}

        for i, obj in enumerate(self.objects):
            if not isinstance(obj, dict):
                raise ValueError(f"Object {i} must be a dictionary")

            if "type" not in obj:
                raise ValueError(f"Object {i} must have a 'type' field")

            if obj["type"] not in valid_types:
                raise ValueError(
                    f"Object {i} has invalid type '{obj['type']}'. "
                    f"Valid types are: {valid_types}"
                )

            if "position" not in obj:
                raise ValueError(f"Object {i} must have a 'position' field")

            if (
                not isinstance(obj["position"], (list, tuple, np.ndarray))
                or len(obj["position"]) != 3
            ):
                raise ValueError(
                    f"Object {i} position must be a 3-element array [x, y, z]"
                )

    def add_cube(
        self,
        position: Tuple[float, float, float],
        *,
        rotation: Optional[Tuple[float, float, float]] = None,
        scale: Optional[Tuple[float, float, float]] = None,
        color: Optional[str] = None,
        wireframe: bool = False,
    ):
        """
        Add a cube to the 3D scene.

        Args:
            position: Position as [x, y, z]
            rotation: Rotation as [rx, ry, rz] in radians
            scale: Scale as [sx, sy, sz]
            color: Color string
            wireframe: Whether to render as wireframe
        """
        obj = {
            "type": "cube",
            "position": list(position),
        }
        if rotation is not None:
            obj["rotation"] = list(rotation)
        if scale is not None:
            obj["scale"] = list(scale)
        if color is not None:
            obj["color"] = color
        if wireframe:
            obj["wireframe"] = wireframe

        self.objects.append(obj)

    def add_sphere(
        self,
        position: Tuple[float, float, float],
        *,
        rotation: Optional[Tuple[float, float, float]] = None,
        scale: Optional[Tuple[float, float, float]] = None,
        color: Optional[str] = None,
        wireframe: bool = False,
    ):
        """
        Add a sphere to the 3D scene.

        Args:
            position: Position as [x, y, z]
            rotation: Rotation as [rx, ry, rz] in radians
            scale: Scale as [sx, sy, sz]
            color: Color string
            wireframe: Whether to render as wireframe
        """
        obj = {
            "type": "sphere",
            "position": list(position),
        }
        if rotation is not None:
            obj["rotation"] = list(rotation)
        if scale is not None:
            obj["scale"] = list(scale)
        if color is not None:
            obj["color"] = color
        if wireframe:
            obj["wireframe"] = wireframe

        self.objects.append(obj)

    def add_cylinder(
        self,
        position: Tuple[float, float, float],
        *,
        rotation: Optional[Tuple[float, float, float]] = None,
        scale: Optional[Tuple[float, float, float]] = None,
        color: Optional[str] = None,
        wireframe: bool = False,
    ):
        """
        Add a cylinder to the 3D scene.

        Args:
            position: Position as [x, y, z]
            rotation: Rotation as [rx, ry, rz] in radians
            scale: Scale as [sx, sy, sz]
            color: Color string
            wireframe: Whether to render as wireframe
        """
        obj = {
            "type": "cylinder",
            "position": list(position),
        }
        if rotation is not None:
            obj["rotation"] = list(rotation)
        if scale is not None:
            obj["scale"] = list(scale)
        if color is not None:
            obj["color"] = color
        if wireframe:
            obj["wireframe"] = wireframe

        self.objects.append(obj)

    def _write_to_zarr_group(self, group: figpack.Group) -> None:
        """
        Write the 3D scene data to a Zarr group.

        Args:
            group: Zarr group to write data into
        """
        # Call parent method to set extension metadata
        super()._write_to_zarr_group(group)

        # Create scene data structure
        scene_data = {"objects": self.objects}

        # Convert to JSON string using custom encoder
        json_string = json.dumps(scene_data, cls=CustomJSONEncoder)

        # Convert JSON string to bytes and store as numpy array
        json_bytes = json_string.encode("utf-8")
        json_array = np.frombuffer(json_bytes, dtype=np.uint8)

        # Store the scene data as compressed array
        group.create_dataset(
            "scene_data",
            data=json_array,
        )

        # Store configuration as attributes
        config = {}
        if self.background_color is not None:
            config["backgroundColor"] = self.background_color
        if self.camera_position is not None:
            config["cameraPosition"] = list(self.camera_position)
        if not self.enable_controls:
            config["enableControls"] = False

        # Store configuration as JSON in attributes
        if config:
            group.attrs["config"] = json.dumps(config)

        # Store data size for reference
        group.attrs["data_size"] = len(json_bytes)
        group.attrs["num_objects"] = len(self.objects)
