from typing import List
import json
import numpy as np

import figpack

from ..spike_sorting_extension import spike_sorting_extension


class SortingCuration(figpack.ExtensionView):
    def __init__(
        self,
        *,
        default_label_options: List[str] = ["mua", "good", "noise"],
        curation: dict = {},
    ):
        """
        Initialize a SortingCuration view

        Args:
            default_label_options: List of default label options for the view
        """
        super().__init__(
            extension=spike_sorting_extension, view_type="spike_sorting.SortingCuration"
        )
        self.default_label_options = default_label_options
        self.curation = curation

    def _write_to_zarr_group(self, group: figpack.Group) -> None:
        """
        Args:
            group: Zarr group to write data into
        """
        super()._write_to_zarr_group(group)

        # Store view parameters
        group.attrs["default_label_options"] = self.default_label_options

        curation_json = json.dumps(self.curation).encode("utf-8")
        curation_array = np.frombuffer(curation_json, dtype=np.uint8)
        group.create_dataset(
            "curation",
            data=curation_array,
        )
