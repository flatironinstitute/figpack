#!/usr/bin/env python3
"""
Example demonstrating the ClusterLens view.

This example shows how to use ClusterLens to visualize high-dimensional
clustered data with interactive UMAP dimensionality reduction.
"""

import numpy as np
from figpack_experimental.views import ClusterLens

# Set random seed for reproducibility
np.random.seed(42)

# Create synthetic high-dimensional data with clusters
n_samples = 1000
n_dims = 15
n_clusters = 4

# Generate clustered data
data_list = []
labels_list = []

for i in range(n_clusters):
    # Random center for each cluster
    center = np.random.randn(n_dims) * 5

    # Generate points around center
    samples_per_cluster = n_samples // n_clusters
    cluster_data = np.random.randn(samples_per_cluster, n_dims) * 0.8 + center

    data_list.append(cluster_data)
    labels_list.append(np.full(samples_per_cluster, i))

# Combine all clusters
data = np.vstack(data_list).astype(np.float32)
cluster_labels = np.hstack(labels_list).astype(np.int32)

# Shuffle the data
indices = np.random.permutation(len(data))
data = data[indices]
cluster_labels = cluster_labels[indices]

print(f"Created {data.shape[0]} points in {data.shape[1]}D space")
print(f"Number of clusters: {len(np.unique(cluster_labels))}")

# Create ClusterLens view
view = ClusterLens(
    data=data,
    cluster_labels=cluster_labels,
)

# Show the view
view.show(
    title="ClusterLens Example",
    open_in_browser=True,
)
