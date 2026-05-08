from typing import Any, List, Optional, Sequence, Union

import numpy as np

import figpack
from .franklab_extension import franklab_extension


_PatchLike = Union[np.ndarray, Sequence[Sequence[float]], Any]


def _patch_to_vertices(patch: _PatchLike) -> np.ndarray:
    """
    Convert a patch-like object to an (N, 2) array of polygon vertices.

    Supported inputs:
      - A matplotlib Patch (anything exposing ``get_verts()``)
      - An (N, 2) array-like of (x, y) vertices
    """
    if hasattr(patch, "get_verts"):
        verts = np.asarray(patch.get_verts(), dtype=np.float32)
    else:
        verts = np.asarray(patch, dtype=np.float32)
    if verts.ndim != 2 or verts.shape[1] != 2:
        raise ValueError(
            f"Each patch must be convertible to an (N, 2) array of vertices, "
            f"got shape {verts.shape}"
        )
    return verts


class DecodedPositionAnimation(figpack.ExtensionView):
    """
    Animation view for visualizing per-frame decoded position scatter points
    alongside an animal's actual position and head direction.

    For each timepoint, the view draws:
      - A static set of background patches (drawn once per frame as the backdrop)
      - An arrow at (pos_x, pos_y) pointed in head_dir
      - A scatter point at (decode_x, decode_y) colored by decode_colors
      - A trail of scatter points from previous timepoints, fading out over
        ``trail_len`` frames

    The view has playback controls (play/pause, speed) and a scrub bar, and
    syncs with other figpack views through the timeseriesSelection context.
    """

    def __init__(
        self,
        *,
        decode_x: np.ndarray,
        decode_y: np.ndarray,
        decode_colors: np.ndarray,
        pos_x: np.ndarray,
        pos_y: np.ndarray,
        head_dir: np.ndarray,
        time: np.ndarray,
        base_patches: Optional[List[_PatchLike]] = None,
        patch_face_color: str = "lightgray",
        patch_edge_color: str = "lightgray",
        trail_len: int = 5,
        decode_sizes: Optional[np.ndarray] = None,
        default_scatter_size: float = 30.0,
        arrow_color: str = "black",
        arrow_length: float = 1.0,
    ) -> None:
        """
        Initialize a DecodedPositionAnimation view.

        Args:
            decode_x: (n_timepoints,) array of scatter-point x coordinates.
                NaN values mean "no scatter point at this frame".
            decode_y: (n_timepoints,) array of scatter-point y coordinates.
            decode_colors: (n_timepoints, 4) array of RGBA color values for
                the scatter point at each timepoint. RGBA components are in
                [0, 1]. If a row contains NaN, the scatter point falls back
                to gray (with full opacity).
            pos_x: (n_timepoints,) array of arrow-origin x coordinates.
            pos_y: (n_timepoints,) array of arrow-origin y coordinates.
            head_dir: (n_timepoints,) array of arrow directions in radians.
            time: (n_timepoints,) array of time values (seconds). Used for
                sync with other views and for the time text overlay.
            base_patches: Optional list of static background patches. Each
                element may be a matplotlib Patch (anything exposing
                ``get_verts()``) or an (N, 2) array of polygon vertices.
            patch_face_color: Fill color for the background patches.
            patch_edge_color: Edge color for the background patches.
            trail_len: Number of frames the scatter point trail persists.
                The most recent point has alpha 1; older points fade
                linearly to alpha 0.
            decode_sizes: Optional (n_timepoints,) array of per-frame
                scatter sizes (in points^2, matching matplotlib's ``s``).
                If not provided, all points use ``default_scatter_size``.
            default_scatter_size: Scatter size used when ``decode_sizes`` is
                not provided.
            arrow_color: Color for the heading arrow.
            arrow_length: Arrow length in spatial units.
        """
        super().__init__(
            extension=franklab_extension,
            view_type="franklab.DecodedPositionAnimation",
        )

        # Coerce + validate arrays
        decode_x = np.asarray(decode_x, dtype=np.float32)
        decode_y = np.asarray(decode_y, dtype=np.float32)
        decode_colors = np.asarray(decode_colors, dtype=np.float32)
        pos_x = np.asarray(pos_x, dtype=np.float32)
        pos_y = np.asarray(pos_y, dtype=np.float32)
        head_dir = np.asarray(head_dir, dtype=np.float32)
        time = np.asarray(time, dtype=np.float64)

        n = len(time)
        if not (
            len(decode_x) == n
            and len(decode_y) == n
            and len(pos_x) == n
            and len(pos_y) == n
            and len(head_dir) == n
        ):
            raise ValueError(
                "decode_x, decode_y, pos_x, pos_y, head_dir, and time must "
                "all have the same length"
            )
        if decode_colors.shape != (n, 4):
            raise ValueError(
                f"decode_colors must have shape (n_timepoints, 4); "
                f"got {decode_colors.shape}"
            )

        if decode_sizes is not None:
            decode_sizes = np.asarray(decode_sizes, dtype=np.float32)
            if decode_sizes.shape != (n,):
                raise ValueError(
                    f"decode_sizes must have shape (n_timepoints,); "
                    f"got {decode_sizes.shape}"
                )

        if trail_len < 1:
            raise ValueError("trail_len must be >= 1")

        # Convert patches to a flat vertex buffer + lengths
        if base_patches is None:
            base_patches = []
        vertex_arrays = [_patch_to_vertices(p) for p in base_patches]
        if vertex_arrays:
            patch_vertices = np.concatenate(vertex_arrays, axis=0).astype(np.float32)
            patch_lengths = np.array(
                [len(v) for v in vertex_arrays], dtype=np.int32
            )
        else:
            patch_vertices = np.zeros((0, 2), dtype=np.float32)
            patch_lengths = np.zeros((0,), dtype=np.int32)

        # Compute spatial bounds across decode + position points + patches
        candidates_x = [pos_x]
        candidates_y = [pos_y]
        if np.any(np.isfinite(decode_x)):
            candidates_x.append(decode_x[np.isfinite(decode_x)])
        if np.any(np.isfinite(decode_y)):
            candidates_y.append(decode_y[np.isfinite(decode_y)])
        if patch_vertices.size > 0:
            candidates_x.append(patch_vertices[:, 0])
            candidates_y.append(patch_vertices[:, 1])

        all_x = np.concatenate(candidates_x)
        all_y = np.concatenate(candidates_y)
        finite_x = all_x[np.isfinite(all_x)]
        finite_y = all_y[np.isfinite(all_y)]
        if finite_x.size == 0 or finite_y.size == 0:
            xmin, xmax, ymin, ymax = -1.0, 1.0, -1.0, 1.0
        else:
            xmin = float(np.min(finite_x))
            xmax = float(np.max(finite_x))
            ymin = float(np.min(finite_y))
            ymax = float(np.max(finite_y))
            if xmax <= xmin:
                xmax = xmin + 1.0
            if ymax <= ymin:
                ymax = ymin + 1.0

        self.decode_x = decode_x
        self.decode_y = decode_y
        self.decode_colors = decode_colors
        self.pos_x = pos_x
        self.pos_y = pos_y
        self.head_dir = head_dir
        self.time = time
        self.decode_sizes = decode_sizes
        self.patch_vertices = patch_vertices
        self.patch_lengths = patch_lengths

        self.trail_len = int(trail_len)
        self.default_scatter_size = float(default_scatter_size)
        self.patch_face_color = patch_face_color
        self.patch_edge_color = patch_edge_color
        self.arrow_color = arrow_color
        self.arrow_length = float(arrow_length)

        self.xmin = xmin
        self.xmax = xmax
        self.ymin = ymin
        self.ymax = ymax

    def write_to_zarr_group(self, group: figpack.Group) -> None:
        super().write_to_zarr_group(group)

        group.attrs["num_timepoints"] = int(len(self.time))
        group.attrs["trail_len"] = self.trail_len
        group.attrs["default_scatter_size"] = self.default_scatter_size
        group.attrs["has_decode_sizes"] = bool(self.decode_sizes is not None)
        group.attrs["num_patches"] = int(len(self.patch_lengths))
        group.attrs["patch_face_color"] = self.patch_face_color
        group.attrs["patch_edge_color"] = self.patch_edge_color
        group.attrs["arrow_color"] = self.arrow_color
        group.attrs["arrow_length"] = self.arrow_length
        group.attrs["xmin"] = float(self.xmin)
        group.attrs["xmax"] = float(self.xmax)
        group.attrs["ymin"] = float(self.ymin)
        group.attrs["ymax"] = float(self.ymax)
        group.attrs["timestamp_start"] = float(self.time[0]) if len(self.time) else 0.0
        group.attrs["timestamp_end"] = float(self.time[-1]) if len(self.time) else 0.0

        group.create_dataset("decode_x", data=self.decode_x)
        group.create_dataset("decode_y", data=self.decode_y)
        group.create_dataset("decode_colors", data=self.decode_colors)
        group.create_dataset("pos_x", data=self.pos_x)
        group.create_dataset("pos_y", data=self.pos_y)
        group.create_dataset("head_dir", data=self.head_dir)
        group.create_dataset("time", data=self.time)
        if self.decode_sizes is not None:
            group.create_dataset("decode_sizes", data=self.decode_sizes)
        group.create_dataset("patch_vertices", data=self.patch_vertices)
        group.create_dataset("patch_lengths", data=self.patch_lengths)
