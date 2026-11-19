"""
Units placed on a ring at an angle each (for example the preferred direction of
head-direction cells), flashing as they spike, at the current time of a shared
time axis
"""

from typing import List, Optional, Sequence

import numpy as np

import figpack
from figpack.core._figure_spec import SpecProp, SpecSchema
from .experimental_extension import experimental_extension


class RingRaster(figpack.ExtensionView):
    """
    Units drawn as dots on a ring, each at its own angle, that flash when they
    spike. The view shows the moment at the current time of the figure's shared
    time axis, so that clicking in a timeline view (a raster, a time series)
    moves the ring there, and its playback controls move the shared time.
    Optional needles show angle series (for example a tracked or a decoded
    direction) at the same moment.

    Spikes and needle samples are stored sorted by time with an index of
    fixed-length time blocks, and the viewer loads only the blocks near the
    current time, so long recordings stay cheap to open.
    """

    spec_schema = SpecSchema(
        view_type="experimental.RingRaster",
        description="Units on a ring at their angles (e.g. preferred directions), flashing as they spike at the current time of the shared time axis, with optional angle needles and playback.",
        props=[
            SpecProp(
                "flash_sec",
                "number",
                "Decay time of a spike's flash, in seconds.",
            ),
            SpecProp(
                "playback_speed",
                "number",
                "Initial playback speed, as a multiple of real time.",
            ),
            SpecProp(
                "zero_angle",
                "string",
                "Where 0 degrees points on the ring: 'east' or 'north'; angles increase counterclockwise.",
            ),
        ],
    )

    def __init__(
        self,
        *,
        unit_ids: Sequence[str],
        angles_deg: Sequence[float],
        spike_times_sec: Sequence[np.ndarray],
        unit_colors: Optional[Sequence[str]] = None,
        start_time_sec: Optional[float] = None,
        end_time_sec: Optional[float] = None,
        flash_sec: float = 0.1,
        playback_speed: float = 1.0,
        zero_angle: str = "east",
        block_sec: float = 10.0,
    ):
        """
        Args:
            unit_ids: A label for each unit
            angles_deg: The angle of each unit on the ring, in degrees
            spike_times_sec: The spike times of each unit, in seconds
            unit_colors: A CSS color for each unit (default: one color for all)
            start_time_sec: Start of the time axis (default: the first spike)
            end_time_sec: End of the time axis (default: the last spike)
            flash_sec: Decay time of a spike's flash, in seconds
            playback_speed: Initial playback speed, as a multiple of real time
            zero_angle: Where 0 degrees points: "east" or "north"
            block_sec: Length of the time blocks of the index used for loading
        """
        super().__init__(
            extension=experimental_extension, view_type="experimental.RingRaster"
        )
        n = len(unit_ids)
        if len(angles_deg) != n or len(spike_times_sec) != n:
            raise ValueError(
                "unit_ids, angles_deg and spike_times_sec must have the same length"
            )
        if n == 0:
            raise ValueError("RingRaster needs at least one unit")
        if n > 65535:
            raise ValueError("RingRaster supports at most 65535 units")
        if unit_colors is not None and len(unit_colors) != n:
            raise ValueError("unit_colors must have one color per unit")
        if zero_angle not in ("east", "north"):
            raise ValueError("zero_angle must be 'east' or 'north'")
        if flash_sec <= 0 or block_sec <= 0 or playback_speed <= 0:
            raise ValueError("flash_sec, block_sec and playback_speed must be positive")

        times = [np.asarray(s, dtype=np.float64).ravel() for s in spike_times_sec]
        all_times = np.concatenate(times) if times else np.zeros(0)
        all_units = np.concatenate(
            [np.full(len(s), i, dtype=np.uint16) for i, s in enumerate(times)]
        )
        order = np.argsort(all_times, kind="stable")
        self.spike_times = all_times[order]
        self.spike_units = all_units[order]
        if start_time_sec is None:
            start_time_sec = (
                float(self.spike_times[0]) if len(self.spike_times) else 0.0
            )
        if end_time_sec is None:
            end_time_sec = (
                float(self.spike_times[-1])
                if len(self.spike_times)
                else start_time_sec + 1
            )
        if end_time_sec <= start_time_sec:
            raise ValueError("end_time_sec must be after start_time_sec")

        self.unit_ids = [str(u) for u in unit_ids]
        self.angles_deg = np.asarray(angles_deg, dtype=np.float32)
        self.unit_colors = list(unit_colors) if unit_colors is not None else None
        self.start_time_sec = float(start_time_sec)
        self.end_time_sec = float(end_time_sec)
        self.flash_sec = float(flash_sec)
        self.playback_speed = float(playback_speed)
        self.zero_angle = zero_angle
        self.block_sec = float(block_sec)
        self.needles: List[dict] = []

    def add_needle(
        self,
        *,
        name: str,
        t: np.ndarray,
        angle_deg: np.ndarray,
        color: str = "#0b0b0b",
        max_gap_sec: Optional[float] = None,
    ) -> None:
        """
        Add an angle series, drawn as a needle from the center of the ring.

        Args:
            name: Name shown in the legend
            t: Sample times in seconds (sorted)
            angle_deg: The angle at each sample, in degrees; NaN hides the needle
            color: CSS color of the needle
            max_gap_sec: The needle is hidden when the nearest sample is farther
                than this from the current time (default: twice the median
                sampling interval)
        """
        t = np.asarray(t, dtype=np.float64).ravel()
        a = np.asarray(angle_deg, dtype=np.float32).ravel()
        if len(t) != len(a):
            raise ValueError("t and angle_deg must have the same length")
        if len(t) > 1 and np.any(np.diff(t) < 0):
            raise ValueError("t must be sorted")
        if max_gap_sec is None:
            max_gap_sec = float(2 * np.median(np.diff(t))) if len(t) > 1 else 1.0
        self.needles.append(
            dict(name=name, t=t, angle=a, color=color, max_gap_sec=float(max_gap_sec))
        )

    def _block_index(self, t: np.ndarray) -> np.ndarray:
        num_blocks = int(
            np.ceil((self.end_time_sec - self.start_time_sec) / self.block_sec)
        )
        edges = self.start_time_sec + np.arange(num_blocks + 1) * self.block_sec
        idx = np.searchsorted(t, edges, side="left").astype(np.uint32)
        idx[-1] = len(t)
        return idx

    def write_to_zarr_group(self, group: figpack.Group) -> None:
        super().write_to_zarr_group(group)
        group.attrs["unit_ids"] = self.unit_ids
        group.attrs["unit_colors"] = self.unit_colors
        group.attrs["start_time_sec"] = self.start_time_sec
        group.attrs["end_time_sec"] = self.end_time_sec
        group.attrs["flash_sec"] = self.flash_sec
        group.attrs["playback_speed"] = self.playback_speed
        group.attrs["zero_angle"] = self.zero_angle
        group.attrs["block_sec"] = self.block_sec
        group.attrs["num_spikes"] = int(len(self.spike_times))
        group.create_dataset("angles_deg", data=self.angles_deg)
        chunk = (min(65536, max(1, len(self.spike_times))),)
        group.create_dataset("spike_times", data=self.spike_times, chunks=chunk)
        group.create_dataset("spike_units", data=self.spike_units, chunks=chunk)
        group.create_dataset(
            "spike_block_index", data=self._block_index(self.spike_times)
        )
        needles_meta = []
        for i, nd in enumerate(self.needles):
            prefix = f"needle_{i}"
            ch = (min(65536, max(1, len(nd["t"]))),)
            group.create_dataset(f"{prefix}_t", data=nd["t"], chunks=ch)
            group.create_dataset(f"{prefix}_angle", data=nd["angle"], chunks=ch)
            group.create_dataset(
                f"{prefix}_block_index", data=self._block_index(nd["t"])
            )
            needles_meta.append(
                dict(
                    prefix=prefix,
                    name=nd["name"],
                    color=nd["color"],
                    max_gap_sec=nd["max_gap_sec"],
                    num_samples=int(len(nd["t"])),
                )
            )
        group.attrs["needles"] = needles_meta
