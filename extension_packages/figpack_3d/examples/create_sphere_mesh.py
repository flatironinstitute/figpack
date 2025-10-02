import numpy as np
from typing import Tuple


# Mesh generation functions
def normalize_vertices(vertices: np.ndarray) -> np.ndarray:
    """Normalize vertices to lie on unit sphere"""
    norms = np.linalg.norm(vertices, axis=1, keepdims=True)
    return vertices / norms


def create_icosahedron() -> Tuple[np.ndarray, np.ndarray]:
    """Create the base icosahedron (20 faces, 12 vertices)"""
    phi = (1.0 + np.sqrt(5.0)) / 2.0

    vertices = np.array(
        [
            [-1, phi, 0],
            [1, phi, 0],
            [-1, -phi, 0],
            [1, -phi, 0],
            [0, -1, phi],
            [0, 1, phi],
            [0, -1, -phi],
            [0, 1, -phi],
            [phi, 0, -1],
            [phi, 0, 1],
            [-phi, 0, -1],
            [-phi, 0, 1],
        ],
        dtype=np.float64,
    )

    vertices = normalize_vertices(vertices)

    faces = np.array(
        [
            [0, 11, 5],
            [0, 5, 1],
            [0, 1, 7],
            [0, 7, 10],
            [0, 10, 11],
            [1, 5, 9],
            [5, 11, 4],
            [11, 10, 2],
            [10, 7, 6],
            [7, 1, 8],
            [3, 9, 4],
            [3, 4, 2],
            [3, 2, 6],
            [3, 6, 8],
            [3, 8, 9],
            [4, 9, 5],
            [2, 4, 11],
            [6, 2, 10],
            [8, 6, 7],
            [9, 8, 1],
        ],
        dtype=np.int32,
    )

    return vertices, faces


def subdivide_mesh(
    vertices: np.ndarray, faces: np.ndarray
) -> Tuple[np.ndarray, np.ndarray]:
    """Subdivide each triangle into 4 smaller triangles"""
    cache = {}
    new_faces = []
    vertices = vertices.copy()

    def get_middle_point(v1_idx: int, v2_idx: int, vertices_array: np.ndarray):
        """Get midpoint between two vertices, with caching"""
        smaller_idx = min(v1_idx, v2_idx)
        larger_idx = max(v1_idx, v2_idx)
        key = (smaller_idx, larger_idx)

        if key in cache:
            return cache[key], vertices_array

        v1 = vertices_array[v1_idx]
        v2 = vertices_array[v2_idx]
        middle = (v1 + v2) / 2.0
        middle = middle / np.linalg.norm(middle)

        idx = len(vertices_array)
        vertices_array = np.vstack([vertices_array, middle])
        cache[key] = idx

        return idx, vertices_array

    for face in faces:
        v1, v2, v3 = face

        # Get midpoints of each edge
        a, vertices = get_middle_point(v1, v2, vertices)
        b, vertices = get_middle_point(v2, v3, vertices)
        c, vertices = get_middle_point(v3, v1, vertices)

        # Create 4 new faces
        new_faces.append([v1, a, c])
        new_faces.append([v2, b, a])
        new_faces.append([v3, c, b])
        new_faces.append([a, b, c])

    return vertices, np.array(new_faces, dtype=np.int32)


def create_sphere_mesh(subdivisions: int = 2) -> Tuple[np.ndarray, np.ndarray]:
    """Create a sphere mesh using icosphere subdivision"""
    vertices, faces = create_icosahedron()
    for _ in range(subdivisions):
        vertices, faces = subdivide_mesh(vertices, faces)
    return vertices, faces


def compute_spherical_harmonic_scalar(vertices: np.ndarray) -> np.ndarray:
    """Compute spherical harmonic Y_3^2 as scalar function"""
    from scipy.special import sph_harm

    x, y, z = vertices[:, 0], vertices[:, 1], vertices[:, 2]
    r = np.sqrt(x**2 + y**2 + z**2)
    theta = np.arccos(np.clip(z / r, -1, 1))
    phi = np.arctan2(y, x)

    Y = sph_harm(2, 3, phi, theta)
    return np.real(Y)
