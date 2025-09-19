import numpy as np

import figpack
from .experimental_extension import experimental_extension
from .MP4Codec import MP4Codec


class LossyVideo(figpack.ExtensionView):
    def __init__(self, data: np.ndarray, *, fps: float):
        """
        Initialize a LossyVideo view

        Args:
            data: Video data as a numpy array
            fps: Frames per second for the video
        """
        super().__init__(
            extension=experimental_extension, view_type="experimental.LossyVideo"
        )

        self.data = data
        self.fps = fps

    def write_to_zarr_group(self, group: figpack.Group) -> None:
        """
        Write the data to a Zarr group

        Args:
            group: Zarr group to write data into
        """
        super().write_to_zarr_group(group)

        group.attrs["fps"] = self.fps

        MP4Codec.register_codec()

        num_frames_per_chunk = 100
        if num_frames_per_chunk > self.data.shape[0]:
            num_frames_per_chunk = self.data.shape[0]
        chunks = (num_frames_per_chunk,) + self.data.shape[1:]

        codec = MP4Codec(fps=self.fps)

        group.create_dataset("video", data=self.data, compressor=codec, chunks=chunks)
