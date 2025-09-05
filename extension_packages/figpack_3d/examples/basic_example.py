"""
Basic example of using the figpack_3d extension
"""

import numpy as np
from figpack_3d import ThreeDView


def create_basic_3d_scene():
    """Create a basic 3D scene with various objects"""

    # Create a 3D view with custom settings
    view = ThreeDView(background_color="#222222", camera_position=(8, 6, 8))

    # Add a red cube at the center
    view.add_cube(position=(0, 0, 0), color="#ff4444", scale=(1.5, 1.5, 1.5))

    # Add blue spheres around the cube
    for i in range(4):
        angle = i * np.pi / 2
        x = 3 * np.cos(angle)
        z = 3 * np.sin(angle)
        view.add_sphere(position=(x, 0, z), color="#4444ff", scale=(0.8, 0.8, 0.8))

    # Add green cylinders at different heights
    view.add_cylinder(
        position=(-2, 2, -2),
        color="#44ff44",
        rotation=(0, 0, np.pi / 4),
        scale=(0.5, 2, 0.5),
    )

    view.add_cylinder(
        position=(2, -2, 2),
        color="#44ff44",
        rotation=(np.pi / 4, 0, 0),
        scale=(0.5, 2, 0.5),
    )

    # Add wireframe objects
    view.add_cube(position=(0, 3, 0), color="#ffff44", wireframe=True, scale=(1, 1, 1))

    return view


if __name__ == "__main__":
    # Create and display the 3D scene
    scene = create_basic_3d_scene()
    scene.show(title="figpack_3d Basic Example", open_in_browser=True)
