import numpy as np
from typing import List, Optional
from dataclasses import dataclass

import figpack
from .nwb_extension import nwb_extension


@dataclass
class PoseEstimationItem:
    """A single node in the pose estimation"""

    name: str
    start_time: float
    rate: float
    data: np.ndarray  # shape (T, 2) for 2D positions
    description: str = ""


class PoseEstimation(figpack.ExtensionView):
    def __init__(
        self,
        *,
        description: str = "",
        items: Optional[List[PoseEstimationItem]] = None,
        nwb: Optional[str] = None,
        path: Optional[str] = None,
        use_local_cache: bool = False,
    ):
        """
        Initialize a PoseEstimation view

        Args:
            description: Description of the pose estimation data
            items: List of PoseEstimationItem objects (if providing data directly)
            nwb: NWB file path or URL (if loading from NWB)
            path: Path to the PoseEstimationSeries within the NWB file
            use_local_cache: Whether to use local cache for NWB file loading
        """
        super().__init__(extension=nwb_extension, view_type="nwb.PoseEstimation")

        self.description = description
        self.use_local_cache = use_local_cache

        # Load from NWB if provided
        if nwb is not None and path is not None:
            items = self._load_from_nwb(nwb, path)
        elif items is None:
            raise ValueError("Either items or (nwb, path) must be provided")

        # Validate items
        if not items:
            raise ValueError("No pose estimation items provided")

        # Validate that all start times and rates are identical
        first_start_time = items[0].start_time
        first_rate = items[0].rate
        for item in items[1:]:
            if item.start_time != first_start_time:
                raise ValueError(
                    f"All nodes must have identical start times. "
                    f"Node '{item.name}' has different start times than '{items[0].name}'"
                )
            if item.rate != first_rate:
                raise ValueError(
                    f"All nodes must have identical rates. "
                    f"Node '{item.name}' has different rates than '{items[0].name}'"
                )

        # Validate data shapes
        num_timepoints = items[0].data.shape[0]
        for item in items:
            if item.data.shape[0] != num_timepoints:
                raise ValueError(
                    f"All nodes must have identical number of timepoints. "
                    f"Node '{item.name}' has {item.data.shape[0]} timepoints, "
                    f"expected {num_timepoints}"
                )

        self.items = items
        self.rate = first_rate
        self.start_time = first_start_time

        # Combine all node data into 3D array (Time x Nodes x Dimension)
        self.pose_data = np.stack([item.data for item in items], axis=1)

        # Calculate global bounds
        all_x = self.pose_data[:, :, 0]
        all_y = self.pose_data[:, :, 1]
        self.x_min = float(np.nanmin(all_x))
        self.x_max = float(np.nanmax(all_x))
        self.y_min = float(np.nanmin(all_y))
        self.y_max = float(np.nanmax(all_y))

    def _load_from_nwb(self, nwb_url: str, nwb_path: str) -> List[PoseEstimationItem]:
        """Load pose estimation data from NWB file"""
        import lindi

        if self.use_local_cache:
            import tempfile

            tmp = tempfile.gettempdir()
            local_cache = lindi.LocalCache(cache_dir=tmp + "/figpack_lindi_cache")
        else:
            local_cache = None

        f = lindi.LindiH5pyFile.from_hdf5_file(nwb_url, local_cache=local_cache)
        X = f[nwb_path]
        assert isinstance(X, lindi.LindiH5pyGroup)

        # Get the nodes
        if "nodes" in X:
            nodes = X["nodes"]
        else:
            nodes = []
            for key in X.keys():
                if isinstance(X[key], lindi.LindiH5pyGroup):
                    if X[key].attrs.get("neurodata_type", "") == "PoseEstimationSeries":
                        nodes.append(key)
        items = []
        for node in nodes:
            print(f"Loading node: {node}")
            Y = X[node]
            assert isinstance(Y, lindi.LindiH5pyGroup)
            start_time, rate = _get_start_time_and_rate(Y)
            item = PoseEstimationItem(
                name=str(node),
                start_time=start_time,
                rate=rate,
                data=Y["data"][:],
                description=Y.attrs.get("description", ""),
            )
            items.append(item)

        # Update description if not provided
        if not self.description:
            self.description = X.attrs.get("description", "")

        return items

    def write_to_zarr_group(self, group: figpack.Group) -> None:
        """
        Write the pose estimation data to a Zarr group

        Args:
            group: Zarr group to write data into
        """
        super().write_to_zarr_group(group)

        # Store metadata
        group.attrs["description"] = self.description
        group.attrs["num_nodes"] = len(self.items)
        first_item = self.items[0]
        group.attrs["num_timepoints"] = first_item.data.shape[0]
        group.attrs["rate"] = self.rate
        group.attrs["start_time"] = self.start_time
        group.attrs["x_min"] = self.x_min
        group.attrs["x_max"] = self.x_max
        group.attrs["y_min"] = self.y_min
        group.attrs["y_max"] = self.y_max

        # Store combined pose data as 3D array (Time x Nodes x Dimension)
        group.create_dataset("pose_data", data=self.pose_data)

        # Store node names and descriptions as lists in attributes
        # (zarr doesn't handle string arrays well without object_codec)
        node_names = [item.name for item in self.items]
        node_descriptions = [item.description for item in self.items]

        group.attrs["node_names"] = node_names
        group.attrs["node_descriptions"] = node_descriptions


def _get_start_time_and_rate(node_group):
    if "timestamps" in node_group:
        first_timestamps = node_group["timestamps"][:1000]
        start_time = float(first_timestamps[0])
        rate = 1 / np.median(np.diff(first_timestamps))
    elif "starting_time" in node_group:
        starting_time_ds = node_group["starting_time"]
        start_time = float(starting_time_ds[()])
        rate = float(starting_time_ds.attrs["rate"])
    else:
        raise ValueError("Node group lacks timestamps or starting_time dataset")
    return start_time, rate
