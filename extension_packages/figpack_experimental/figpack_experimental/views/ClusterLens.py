import numpy as np

import figpack
from .experimental_extension import experimental_extension


class ClusterLens(figpack.ExtensionView):
    def __init__(
        self,
        data: np.ndarray,
        cluster_labels: np.ndarray | None = None,
    ):
        """
        Initialize a ClusterLens view for UMAP-based dimensionality reduction

        This view performs UMAP dimensionality reduction in the browser using umap-js.
        The input data is an N x d matrix where N is the number of points and d is
        the number of dimensions.

        Args:
            data: Input data as N x d numpy array where N is the number of points
                  and d is the number of dimensions.
            cluster_labels: Optional 1D numpy array of cluster labels for each point.
                           Must have length N. Used to color points by cluster when
                           no selection is active.
        """
        super().__init__(
            extension=experimental_extension, view_type="experimental.ClusterLens"
        )

        if not isinstance(data, np.ndarray):
            raise TypeError("data must be a numpy array")

        if len(data.shape) != 2:
            raise ValueError("data must be a 2D array (N x d)")

        n_points = data.shape[0]

        if cluster_labels is not None:
            if not isinstance(cluster_labels, np.ndarray):
                raise TypeError("cluster_labels must be a numpy array")

            if len(cluster_labels.shape) != 1:
                raise ValueError("cluster_labels must be a 1D array")

            if len(cluster_labels) != n_points:
                raise ValueError(
                    f"cluster_labels length ({len(cluster_labels)}) must match "
                    f"number of data points ({n_points})"
                )

        self.data = data
        self.cluster_labels = cluster_labels

    def write_to_zarr_group(self, group: figpack.Group) -> None:
        """
        Write the data to a Zarr group

        Args:
            group: Zarr group to write data into
        """
        super().write_to_zarr_group(group)

        # Store metadata
        n_points, n_dims = self.data.shape
        group.attrs["n_points"] = int(n_points)
        group.attrs["n_dims"] = int(n_dims)

        # Convert to float32 for efficiency (UMAP doesn't need float64 precision)
        data_float32 = self.data.astype(np.float32)

        # Create dataset
        group.create_dataset("data", data=data_float32)

        # Store cluster labels if provided
        if self.cluster_labels is not None:
            cluster_labels_int32 = self.cluster_labels.astype(np.int32)
            group.create_dataset("cluster_labels", data=cluster_labels_int32)

            # Store number of unique clusters for metadata
            n_clusters = len(np.unique(self.cluster_labels))
            group.attrs["n_clusters"] = int(n_clusters)
