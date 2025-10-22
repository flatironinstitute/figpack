"""
Example: Sphere mesh with scalar values visualization

This example demonstrates the MeshView by generating a sphere mesh with
a spherical harmonic function mapped onto the vertices.
"""

import numpy as np
from typing import Tuple

from create_sphere_mesh import compute_spherical_harmonic_scalar, create_sphere_mesh  # type: ignore
from figpack_3d import MeshView


def generate_sphere_mesh_with_scalars(
    subdivisions: int = 2,
    radius: float = 1.0,
    scalar_function: str = "spherical_harmonic",
) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Generate a complete sphere mesh with scalar values"""
    vertices, faces = create_sphere_mesh(subdivisions)
    vertices = vertices * radius

    if scalar_function == "spherical_harmonic":
        scalars = compute_spherical_harmonic_scalar(vertices)
    elif scalar_function == "height":
        scalars = vertices[:, 2]
    else:
        raise ValueError(f"Unknown scalar function: {scalar_function}")

    return vertices, faces, scalars


def create_sphere_mesh_view():
    """Create a sphere mesh with spherical harmonic scalar values"""

    print("Generating sphere mesh with spherical harmonic scalar function...")

    # Generate sphere mesh with moderate subdivision
    # subdivisions=2 gives 162 vertices, 320 faces
    vertices, faces, scalars = generate_sphere_mesh_with_scalars(
        subdivisions=5, radius=1.0, scalar_function="spherical_harmonic"
    )

    print(f"Created mesh with {len(vertices)} vertices and {len(faces)} faces")
    print(f"Scalar range: [{scalars.min():.3f}, {scalars.max():.3f}]")

    # Create the mesh view with viridis colormap
    view = MeshView(
        vertices=vertices,
        faces=faces,
        scalars=scalars,
        colormap="viridis",
        wireframe=False,
        background_color="#1a1a1a",
        camera_position=(2.5, 2.5, 2.5),
        enable_controls=True,
    )

    return view


def create_height_colored_sphere():
    """Create a sphere with simple height-based coloring"""

    print("Generating sphere with height-based coloring...")

    vertices, faces, scalars = generate_sphere_mesh_with_scalars(
        subdivisions=5, radius=1.0, scalar_function="height"
    )

    print(f"Created mesh with {len(vertices)} vertices and {len(faces)} faces")

    # Create view with rainbow colormap for height
    view = MeshView(
        vertices=vertices,
        faces=faces,
        scalars=scalars,
        colormap="rainbow",
        wireframe=False,
        background_color="#000000",
        camera_position=(3, 3, 3),
    )

    return view


def create_wireframe_sphere():
    """Create a wireframe sphere with scalar coloring"""

    print("Generating wireframe sphere...")

    vertices, faces, scalars = generate_sphere_mesh_with_scalars(
        subdivisions=5,  # Lower resolution for cleaner wireframe
        radius=1.0,
        scalar_function="spherical_harmonic",
    )

    view = MeshView(
        vertices=vertices,
        faces=faces,
        scalars=scalars,
        colormap="plasma",
        wireframe=True,
        background_color="#222222",
    )

    return view


def create_comparison_layout():
    """Create a layout comparing different colormaps"""
    import figpack.views as vv

    print("Creating comparison of different colormaps...")

    # Generate the same mesh once
    vertices, faces, scalars = generate_sphere_mesh_with_scalars(
        subdivisions=5, radius=1.0, scalar_function="spherical_harmonic"
    )

    # Create views with different colormaps
    colormaps = ["viridis", "plasma", "jet", "rainbow"]
    views = []

    for cmap in colormaps:
        view = MeshView(
            vertices=vertices,
            faces=faces,
            scalars=scalars,
            colormap=cmap,  # type: ignore
            background_color="#1a1a1a",
        )
        title = f"Colormap: {cmap}"
        views.append((view, title))

    # Create a 2x2 grid layout
    layout = vv.Box(
        direction="vertical",
        items=[
            vv.LayoutItem(
                vv.Box(
                    direction="horizontal",
                    items=[
                        vv.LayoutItem(views[0][0], title=views[0][1]),
                        vv.LayoutItem(views[1][0], title=views[1][1]),
                    ],
                )
            ),
            vv.LayoutItem(
                vv.Box(
                    direction="horizontal",
                    items=[
                        vv.LayoutItem(views[2][0], title=views[2][1]),
                        vv.LayoutItem(views[3][0], title=views[3][1]),
                    ],
                )
            ),
        ],
    )

    return layout


def create_gallery_view():
    """Create a gallery view showing all available examples"""
    import figpack.views as vv

    print("Creating gallery view with all examples...")

    # Create gallery items for each example
    gallery_items = [
        vv.GalleryItem(create_sphere_mesh_view(), label="Spherical Harmonic"),
        vv.GalleryItem(create_height_colored_sphere(), label="Height Coloring"),
        vv.GalleryItem(create_wireframe_sphere(), label="Wireframe"),
        vv.GalleryItem(create_comparison_layout(), label="Colormap Comparison"),
    ]

    # Create the gallery
    return vv.Gallery(items=gallery_items)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Sphere mesh visualization examples")
    parser.add_argument(
        "--example",
        type=str,
        default="all",
        choices=["all", "spherical_harmonic", "height", "wireframe", "comparison"],
        help="Which example to run",
    )
    parser.add_argument(
        "--upload",
        action="store_true",
        help="Upload to cloud instead of opening locally",
    )

    args = parser.parse_args()

    # Create the selected example
    if args.example == "all":
        view = create_gallery_view()
        title = "Sphere Mesh Examples - Gallery"
    elif args.example == "spherical_harmonic":
        view = create_sphere_mesh_view()
        title = "Sphere Mesh - Spherical Harmonic (Y_3^2)"
    elif args.example == "height":
        view = create_height_colored_sphere()
        title = "Sphere Mesh - Height Coloring"
    elif args.example == "wireframe":
        view = create_wireframe_sphere()
        title = "Sphere Mesh - Wireframe"
    elif args.example == "comparison":
        view = create_comparison_layout()
        title = "Sphere Mesh - Colormap Comparison"
    else:
        raise ValueError(f"Unknown example: {args.example}")

    # Display the visualization
    print(f"\nDisplaying: {title}")
    view.show(
        title=title,
        open_in_browser=not args.upload,
        upload=args.upload,
    )

    if args.upload:
        print("\nFigure uploaded to cloud!")
    else:
        print("\nFigure opened in browser!")
