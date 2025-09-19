import tempfile
import numpy as np
from numcodecs.abc import Codec
from numcodecs import register_codec


class MP4Codec(Codec):
    """
    Codec for encoding/decoding MP4 video data from numpy arrays using imageio-ffmpeg.

    Example
    --------
    See examples/example_mp4_codec.py in the neurosift repo.
    """

    codec_id = "mp4"

    def __init__(self, fps: float):
        """
        Parameters
        ----------
        fps : float
            The frames per second of the video.
        """
        self.fps = fps

    def encode(self, array: np.ndarray):  # type: ignore
        """
        Encode a numpy array to MP4 video data using H.264 codec.

        Parameters
        ----------
        array : np.ndarray
            The numpy array to encode. Must be a uint8 array with shape (frames,
            height, width, 3) or (frames, height, width).
        """
        import imageio

        if array.dtype != np.uint8:
            raise ValueError("MP4Codec only supports uint8 arrays")

        if array.ndim not in (3, 4):
            raise ValueError("MP4Codec only supports 3D or 4D arrays")

        # Handle grayscale to RGB conversion if needed
        if array.ndim == 3:
            # Convert grayscale to RGB by repeating the channel
            array = np.repeat(array[:, :, :, np.newaxis], 3, axis=3)

        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_output_fname = f"{tmpdir}/output.mp4"

            # Use imageio with H.264 codec for browser compatibility
            writer = imageio.get_writer(
                tmp_output_fname,
                fps=self.fps,
                codec="libx264",
                pixelformat="yuv420p",  # Ensures browser compatibility
                ffmpeg_params=[
                    "-movflags",
                    "faststart",
                ],  # Enables progressive download
            )

            for i in range(array.shape[0]):
                writer.append_data(array[i])
            writer.close()

            with open(tmp_output_fname, "rb") as f:
                return f.read()

    def decode(self, buf: bytes, out=None):  # type: ignore
        """
        Decode MP4 video data to a numpy array using imageio.

        Parameters
        ----------
        buf : bytes
            The MP4 video data buffer to decode. Must be a valid MP4 video.
        out: np.ndarray, optional
            Optional pre-allocated output array. Must be a uint8 array with shape
            (frames, height, width, 3) or (frames, height, width).
        """
        import imageio

        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_input_fname = f"{tmpdir}/input.mp4"
            with open(tmp_input_fname, "wb") as f:
                f.write(buf)

            # Read video using imageio
            reader = imageio.get_reader(tmp_input_fname)
            frames = []
            for frame in reader:
                frames.append(frame)
            reader.close()

            ret = np.array(frames, dtype=np.uint8)

            if out is not None:
                out[...] = ret
                return out
            return ret

    def __repr__(self):
        return f"{self.__class__.__name__}(fps={self.fps})"

    @staticmethod
    def register_codec():
        """
        Convenience static method to register the MP4Codec with numcodecs.
        """
        register_codec(MP4Codec)
