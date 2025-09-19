import numpy as np

import figpack
from .experimental_extension import experimental_extension


class FmriBold(figpack.ExtensionView):
    def __init__(
        self, data: np.ndarray, *, resolution: list[float], temporal_resolution: float
    ):
        """
        Initialize an fMRI BOLD view
        """
        super().__init__(
            extension=experimental_extension, view_type="experimental.FmriBold"
        )
        self.resolution = resolution
        self.temporal_resolution = temporal_resolution

        self.data = data

    @staticmethod
    def from_nii(nii_fname_or_url: str) -> "FmriBold":
        """
        Create an FmriBold view from a NIfTI file

        Args:
            nii_fname_or_url: Path or URL to the NIfTI file
        Returns:
            An FmriBold view
        """
        import nibabel as nib

        if nii_fname_or_url.startswith("http://") or nii_fname_or_url.startswith(
            "https://"
        ):
            import urllib.request
            import os
            import tempfile

            # make a temporary directory
            with tempfile.TemporaryDirectory() as tmpdir:
                local_fname = os.path.join(tmpdir, "temp.nii.gz")
                print(f"Downloading from {nii_fname_or_url}...")
                urllib.request.urlretrieve(nii_fname_or_url, local_fname)
                print("Download complete.")
                return FmriBold.from_nii(local_fname)
        else:
            local_fname = nii_fname_or_url
        img = nib.load(local_fname)
        data = img.get_fdata().astype(np.uint16)

        # ndim = img.header['dim'][0]
        # W = img.header['dim'][1]
        # H = img.header['dim'][2]
        # num_slices = img.header['dim'][3]
        # T = img.header['dim'][4]
        resolution = [
            img.header["pixdim"][1],
            img.header["pixdim"][2],
            img.header["pixdim"][3],
        ]
        temporal_resolution = img.header["pixdim"][4]

        # We want T x W x H x num_slices
        data = np.transpose(data, (3, 0, 1, 2))

        return FmriBold(
            data, resolution=resolution, temporal_resolution=temporal_resolution
        )

    def _write_to_zarr_group(self, group: figpack.Group) -> None:
        """
        Write the data to a Zarr group

        Args:
            group: Zarr group to write data into
        """
        super()._write_to_zarr_group(group)

        group.attrs["resolution"] = self.resolution
        group.attrs["temporal_resolution"] = self.temporal_resolution

        num_frames_per_chunk = 20
        if num_frames_per_chunk > self.data.shape[0]:
            num_frames_per_chunk = self.data.shape[0]
        chunks = (num_frames_per_chunk,) + self.data.shape[1:]

        group.create_dataset("data", data=self.data, chunks=chunks)

        # also store a transposed version for access to temporal traces
        data_transpose = np.transpose(self.data, (1, 2, 3, 0))
        num_pixels_per_chunk = 10
        if num_pixels_per_chunk > data_transpose.shape[0]:
            num_pixels_per_chunk = data_transpose.shape[0]
        chunks_transpose = (num_pixels_per_chunk,) + data_transpose.shape[1:]

        group.create_dataset(
            "data_transpose", data=data_transpose, chunks=chunks_transpose
        )
