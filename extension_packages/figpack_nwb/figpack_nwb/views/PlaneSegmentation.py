import numpy as np

import figpack
from .nwb_extension import nwb_extension


class PlaneSegmentation(figpack.ExtensionView):
    def __init__(
        self,
        *,
        nwb: str,
        path: str,
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

    def _write_to_zarr_group(self, group: figpack.Group) -> None:
        """
        Write the data to a Zarr group

        Args:
            group: Zarr group to write data into
        """
        super()._write_to_zarr_group(group)

        import lindi

        f = lindi.LindiH5pyFile.from_hdf5_file(self.nwb)
        obj = f[self.path]

        neurodata_type = obj.attrs["neurodata_type"]
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
        id = obj["id"]
        assert isinstance(id, lindi.LindiH5pyDataset)
        id_data = id[()]
        group.create_dataset("id", data=id_data)

        print("Loading image_mask data")
        image_mask = obj["image_mask"]
        assert isinstance(image_mask, lindi.LindiH5pyDataset)
        image_mask_data = image_mask[()]
        chunk1 = 500 if image_mask.shape[0] > 500 else image_mask.shape[0]
        chunks = (
            [chunk1, image_mask.shape[1], image_mask.shape[2]]
            if image_mask.ndim == 3
            else [image_mask.shape[0], image_mask.shape[1]]
        )
        group.create_dataset("image_mask", data=image_mask_data, chunks=chunks)


def serialize_attr(value):
    if isinstance(value, np.ndarray):
        if value.dtype.kind == "S":  # byte strings
            return value.astype(str).tolist()
        return value.tolist()
    elif isinstance(value, bytes):
        return value.decode("utf-8")
    return value
