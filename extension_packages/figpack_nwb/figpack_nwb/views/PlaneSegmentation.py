import numpy as np

import figpack
from figpack.core._figure_spec import SpecSchema
from .nwb_extension import nwb_extension


class PlaneSegmentation(figpack.ExtensionView):
    spec_schema = SpecSchema(
        view_type="nwb.PlaneSegmentation",
        description="ROI image masks of an NWB PlaneSegmentation, with ROI selection and labels.",
    )

    def __init__(
        self,
        *,
        nwb: str,
        path: str,
        use_local_cache: bool = False,
    ):
        """
        Initialize a PlaneSegmentation view

        Args:
            nwb: NWB file path or URL
            path: Path to the data within the NWB file
        """
        super().__init__(extension=nwb_extension, view_type="nwb.PlaneSegmentation")

        self.nwb = nwb
        self.path = path
        self.use_local_cache = use_local_cache

    def write_to_zarr_group(self, group: figpack.Group) -> None:
        """
        Write the data to a Zarr group

        Args:
            group: Zarr group to write data into
        """
        super().write_to_zarr_group(group)

        import h5py

        # Open with h5py (over remfile for URLs) so that only the datasets
        # read below are fetched, not an index of the whole file
        if self.nwb.startswith("http://") or self.nwb.startswith("https://"):
            import remfile

            disk_cache = None
            if self.use_local_cache:
                import tempfile

                disk_cache = remfile.DiskCache(
                    tempfile.gettempdir() + "/figpack_remfile_cache"
                )
            f = h5py.File(remfile.File(self.nwb, disk_cache=disk_cache), "r")
        else:
            f = h5py.File(self.nwb, "r")
        obj = f[self.path]
        assert isinstance(obj, h5py.Group)

        neurodata_type = serialize_attr(obj.attrs["neurodata_type"])
        if neurodata_type != "PlaneSegmentation":
            raise ValueError(
                f"Expected neurodata_type 'PlaneSegmentation', got '{neurodata_type}'"
            )

        group.attrs["_nwb"] = self.nwb
        group.attrs["_path"] = self.path

        for k in [
            "colnames",
            "description",
            "namespace",
            "neurodata_type",
            "object_id",
        ]:
            if k in obj.attrs:
                group.attrs[k] = serialize_attr(obj.attrs[k])

        print("Loading id data")
        id_data = obj["id"][()]
        group.create_dataset("id", data=id_data)

        if "image_mask" in obj:
            print("Loading image_mask data")
            image_mask = obj["image_mask"]
            image_mask_data = image_mask[()]
            chunk1 = 500 if image_mask.shape[0] > 500 else image_mask.shape[0]
            chunks = (
                [chunk1, image_mask.shape[1], image_mask.shape[2]]
                if image_mask.ndim == 3
                else [image_mask.shape[0], image_mask.shape[1]]
            )
            group.create_dataset("image_mask", data=image_mask_data, chunks=chunks)
        elif "pixel_mask" in obj and "pixel_mask_index" in obj:
            # Sparse masks: a ragged list of (x, y, weight) per ROI. Stored as
            # separate flat arrays since the frontend does not read compound
            # dtypes. pixel_mask_index[i] is the end of ROI i in those arrays.
            print("Loading pixel_mask data")
            pixel_mask = obj["pixel_mask"][()]
            pixel_mask_index = np.array(obj["pixel_mask_index"][()], dtype=np.uint32)
            if len(pixel_mask_index) != len(id_data):
                raise ValueError(
                    f"pixel_mask_index length ({len(pixel_mask_index)}) does not match "
                    f"number of ROIs ({len(id_data)})"
                )
            group.create_dataset(
                "pixel_mask_x", data=np.array(pixel_mask["x"], dtype=np.uint32)
            )
            group.create_dataset(
                "pixel_mask_y", data=np.array(pixel_mask["y"], dtype=np.uint32)
            )
            group.create_dataset(
                "pixel_mask_weight",
                data=np.array(pixel_mask["weight"], dtype=np.float32),
            )
            group.create_dataset("pixel_mask_index", data=pixel_mask_index)
        else:
            raise ValueError(
                "PlaneSegmentation has neither image_mask nor pixel_mask "
                "(voxel_mask is not supported)"
            )


def serialize_attr(value):
    if isinstance(value, np.ndarray):
        if value.dtype.kind == "S":  # byte strings
            return value.astype(str).tolist()
        return value.tolist()
    elif isinstance(value, bytes):
        return value.decode("utf-8")
    return value
