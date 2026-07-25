from typing import Dict, Optional, Union

import numpy as np

import figpack
from .experimental_extension import experimental_extension

# Must match the colormaps available in the frontend
COLORMAPS = ("viridis", "plasma", "inferno", "coolwarm", "jet", "grayscale")


class SphereEmbedding(figpack.ExtensionView):
    """
    Interactive 3D view of a sphere embedded into a new geometry, with one or
    more scalar fields displayed as heatmaps on the surface.

    The spherical grid follows the shtns conventions: spatial arrays have shape
    (nlat, nphi), the latitudinal grid is given as cos(theta) (e.g. Gauss nodes
    from sh.cos_theta, poles not included), and the phi grid is equally spaced
    starting at 0 (endpoint excluded).

    The geometry and the fields may optionally vary over time, in which case a
    time grid (in seconds) must be provided.
    """

    def __init__(
        self,
        *,
        coords: np.ndarray,
        fields: Dict[str, np.ndarray],
        cos_theta: np.ndarray,
        phi: Optional[np.ndarray] = None,
        times: Optional[np.ndarray] = None,
        colormap: str = "jet",
        playback_speed: float = 1.0,
        vmin: Optional[float] = None,
        vmax: Optional[float] = None,
    ):
        """
        Initialize a SphereEmbedding view

        Args:
            coords: Embedded positions in R^3 with shape (nlat, nphi, 3), or
                (num_times, nlat, nphi, 3) if the geometry varies over time
            fields: Dict mapping field name to scalar values with shape
                (nlat, nphi), or (num_times, nlat, nphi) if time-varying.
                Static and time-varying fields may be mixed.
            cos_theta: Latitudinal grid as cos(theta), shape (nlat,), as
                provided by shtns (sh.cos_theta)
            phi: Optional longitudinal grid in radians, shape (nphi,).
                Defaults to 2*pi*arange(nphi)/nphi (shtns default grid)
            times: Time grid in seconds, shape (num_times,). Required if
                coords or any field has a time dimension
            colormap: Initial colormap, one of "jet", "viridis", "plasma",
                "inferno", "coolwarm", "grayscale"
            playback_speed: Initial playback speed multiplier, e.g. 0.1 to play
                at a tenth of real time
            vmin: Optional initial lower end of the color range. Defaults to the
                minimum over the first field
            vmax: Optional initial upper end of the color range. Defaults to the
                maximum over the first field
        """
        super().__init__(
            extension=experimental_extension,
            view_type="experimental.SphereEmbedding",
        )

        if colormap not in COLORMAPS:
            raise ValueError(
                f"Invalid colormap: {colormap}. Options are {', '.join(COLORMAPS)}"
            )
        if playback_speed <= 0:
            raise ValueError(f"playback_speed must be positive, got {playback_speed}")
        if vmin is not None and vmax is not None and vmin >= vmax:
            raise ValueError(f"vmin ({vmin}) must be less than vmax ({vmax})")

        cos_theta = np.asarray(cos_theta, dtype=np.float64)
        if cos_theta.ndim != 1:
            raise ValueError(f"cos_theta must be 1D, got shape {cos_theta.shape}")
        if np.max(np.abs(cos_theta)) > 1:
            raise ValueError("cos_theta values must be in [-1, 1]")
        nlat = len(cos_theta)

        coords = np.asarray(coords, dtype=np.float32)
        if coords.ndim == 3:
            coords_time_varying = False
        elif coords.ndim == 4:
            coords_time_varying = True
        else:
            raise ValueError(
                f"coords must have shape (nlat, nphi, 3) or (num_times, nlat, nphi, 3), got {coords.shape}"
            )
        if coords.shape[-1] != 3 or coords.shape[-3] != nlat:
            raise ValueError(
                f"coords shape {coords.shape} inconsistent with nlat={nlat}"
            )
        nphi = coords.shape[-2]

        if phi is None:
            phi = 2 * np.pi * np.arange(nphi) / nphi
        phi = np.asarray(phi, dtype=np.float64)
        if phi.ndim != 1 or len(phi) != nphi:
            raise ValueError(f"phi must have shape ({nphi},), got {phi.shape}")

        if times is not None:
            times = np.asarray(times, dtype=np.float64)
            if times.ndim != 1:
                raise ValueError(f"times must be 1D, got shape {times.shape}")
            num_times = len(times)
        else:
            num_times = 0

        if coords_time_varying:
            if times is None:
                raise ValueError("times must be provided when coords is time-varying")
            if coords.shape[0] != num_times:
                raise ValueError(
                    f"coords time dimension ({coords.shape[0]}) must match times length ({num_times})"
                )

        if len(fields) == 0:
            raise ValueError("fields must contain at least one entry")
        fields_processed: Dict[str, np.ndarray] = {}
        fields_time_varying: Dict[str, bool] = {}
        for name, values in fields.items():
            values = np.asarray(values, dtype=np.float32)
            if values.ndim == 2:
                time_varying = False
                expected_shape: tuple = (nlat, nphi)
            elif values.ndim == 3:
                time_varying = True
                if times is None:
                    raise ValueError(
                        f"times must be provided when field '{name}' is time-varying"
                    )
                expected_shape = (num_times, nlat, nphi)
            else:
                raise ValueError(
                    f"field '{name}' must have shape (nlat, nphi) or (num_times, nlat, nphi), got {values.shape}"
                )
            if values.shape != expected_shape:
                raise ValueError(
                    f"field '{name}' has shape {values.shape}, expected {expected_shape}"
                )
            fields_processed[name] = values
            fields_time_varying[name] = time_varying

        if times is not None:
            if not coords_time_varying and not any(fields_time_varying.values()):
                raise ValueError(
                    "times provided but neither coords nor any field is time-varying"
                )

        self.cos_theta = cos_theta
        self.phi = phi
        self.coords = coords
        self.coords_time_varying = coords_time_varying
        self.fields = fields_processed
        self.fields_time_varying = fields_time_varying
        self.times = times
        self.nlat = nlat
        self.nphi = nphi
        self.num_times = num_times
        self.colormap = colormap
        self.playback_speed = playback_speed
        self.vmin = vmin
        self.vmax = vmax

    def write_to_zarr_group(self, group: figpack.Group) -> None:
        """
        Write the data to a Zarr group

        Args:
            group: Zarr group to write data into
        """
        super().write_to_zarr_group(group)

        group.attrs["nlat"] = self.nlat
        group.attrs["nphi"] = self.nphi
        group.attrs["num_times"] = self.num_times
        group.attrs["coords_time_varying"] = self.coords_time_varying
        group.attrs["colormap"] = self.colormap
        group.attrs["playback_speed"] = self.playback_speed
        if self.vmin is not None:
            group.attrs["vmin"] = self.vmin
        if self.vmax is not None:
            group.attrs["vmax"] = self.vmax

        # Field metadata: names refer to datasets field_0, field_1, ...
        fields_meta = []
        for i, (name, values) in enumerate(self.fields.items()):
            fields_meta.append(
                {
                    "name": name,
                    "dataset": f"field_{i}",
                    "time_varying": self.fields_time_varying[name],
                    "min": float(np.nanmin(values)),
                    "max": float(np.nanmax(values)),
                }
            )
        group.attrs["fields_meta"] = fields_meta

        group.create_dataset("cos_theta", data=self.cos_theta)
        group.create_dataset("phi", data=self.phi)
        if self.times is not None:
            group.create_dataset("times", data=self.times)

        # Chunk time-varying data by single frames for efficient per-frame access
        if self.coords_time_varying:
            group.create_dataset(
                "coords",
                data=self.coords,
                chunks=(1, self.nlat, self.nphi, 3),
            )
        else:
            group.create_dataset("coords", data=self.coords)

        for i, (name, values) in enumerate(self.fields.items()):
            if self.fields_time_varying[name]:
                group.create_dataset(
                    f"field_{i}",
                    data=values,
                    chunks=(1, self.nlat, self.nphi),
                )
            else:
                group.create_dataset(f"field_{i}", data=values)
