import numpy as np
from typing import List, Optional
from dataclasses import dataclass

import figpack
from .nwb_extension import nwb_extension


@dataclass
class PoseEstimationItem:
    """A single node in the pose estimation"""

    name: str
    timestamps: np.ndarray  # shape (T,)
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

        # Validate that all timestamps are equal
        first_timestamps = items[0].timestamps
        for item in items[1:]:
            if not np.array_equal(item.timestamps, first_timestamps):
                raise ValueError(
                    f"All nodes must have identical timestamps. "
                    f"Node '{item.name}' has different timestamps than '{items[0].name}'"
                )

        # Validate data shapes
        num_timepoints = len(first_timestamps)
        for item in items:
            if item.data.shape != (num_timepoints, 2):
                raise ValueError(
                    f"Node '{item.name}' has data shape {item.data.shape}, "
                    f"expected ({num_timepoints}, 2)"
                )

        self.items = items
        self.timestamps = first_timestamps

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
        nodes = X["nodes"]
        items = []
        for node in nodes:
            print(f"Loading node: {node}")
            Y = X[node]
            assert isinstance(Y, lindi.LindiH5pyGroup)
            item = PoseEstimationItem(
                name=str(node),
                timestamps=Y["timestamps"][:],
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
        group.attrs["num_timepoints"] = len(self.timestamps)
        group.attrs["x_min"] = self.x_min
        group.attrs["x_max"] = self.x_max
        group.attrs["y_min"] = self.y_min
        group.attrs["y_max"] = self.y_max

        # Store timestamps (shared by all nodes)
        group.create_dataset("timestamps", data=self.timestamps)

        # Store combined pose data as 3D array (Time x Nodes x Dimension)
        # Use reasonable chunking for efficient access
        chunk_time = min(1000, len(self.timestamps))
        group.create_dataset(
            "pose_data",
            data=self.pose_data,
            chunks=(chunk_time, len(self.items), 2),
        )

        # Store node names and descriptions as lists in attributes
        # (zarr doesn't handle string arrays well without object_codec)
        node_names = [item.name for item in self.items]
        node_descriptions = [item.description for item in self.items]

        group.attrs["node_names"] = node_names
        group.attrs["node_descriptions"] = node_descriptions
