from typing import Optional

import numpy as np

import figpack
from figpack.core._figure_spec import SpecSchema
from .experimental_extension import experimental_extension
from .MP4Codec import MP4Codec


class LossyVideo(figpack.ExtensionView):
    spec_schema = SpecSchema(
        view_type="experimental.LossyVideo",
        description="Video stored with lossy (MP4) compression, with playback controls.",
    )

    def __init__(
        self,
        data: np.ndarray,
        *,
        fps: float,
        start_time_sec: Optional[float] = None,
        sampling_frequency_hz: Optional[float] = None,
    ):
        """
        Initialize a LossyVideo view

        Args:
            data: Video data as a numpy array (frames, height, width, 3), uint8
            fps: Playback rate in frames per second
            start_time_sec: If given, the video is synchronized with the other
                time-based views in the figure: frame i is shown at time
                start_time_sec + i / sampling_frequency_hz, and the slider and
                playback move the shared current time.
            sampling_frequency_hz: Frames per second of data time, for a
                synchronized video. Defaults to fps. Playback always advances
                at fps frames per second of wall-clock time.
        """
        super().__init__(
            extension=experimental_extension, view_type="experimental.LossyVideo"
        )

        if sampling_frequency_hz is not None and start_time_sec is None:
            raise ValueError("sampling_frequency_hz requires start_time_sec")
        if sampling_frequency_hz is not None and sampling_frequency_hz <= 0:
            raise ValueError("sampling_frequency_hz must be positive")

        self.data = data
        self.fps = fps
        self.start_time_sec = start_time_sec
        self.sampling_frequency_hz = sampling_frequency_hz

    def write_to_zarr_group(self, group: figpack.Group) -> None:
        """
        Write the data to a Zarr group

        Args:
            group: Zarr group to write data into
        """
        super().write_to_zarr_group(group)

        group.attrs["fps"] = self.fps
        if self.start_time_sec is not None:
            group.attrs["start_time_sec"] = float(self.start_time_sec)
            group.attrs["sampling_frequency_hz"] = float(
                self.sampling_frequency_hz
                if self.sampling_frequency_hz is not None
                else self.fps
            )

        MP4Codec.register_codec()

        num_frames_per_chunk = 100
        if num_frames_per_chunk > self.data.shape[0]:
            num_frames_per_chunk = self.data.shape[0]
        chunks = (num_frames_per_chunk,) + self.data.shape[1:]

        codec = MP4Codec(fps=self.fps)

        group.create_dataset("video", data=self.data, compressor=codec, chunks=chunks)
