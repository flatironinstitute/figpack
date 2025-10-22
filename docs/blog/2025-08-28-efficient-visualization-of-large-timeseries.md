---
layout: post
title: "Efficient Visualization of Large Timeseries Data in figpack"
date: 2025-08-28 12:28:00 -0400
categories: [technical, visualization]
tags: [figpack, timeseries, performance, visualization]
author: figpack team
---

Scientific visualization often involves exploring large timeseries datasets, but rendering millions of data points in the browser can be challenging. Here we present figpack's approach to this problem using intelligent downsampling and efficient data handling.

## The Challenge

For instance, consider an electrophysiology recording with hundreds of channels sampled at 30 kHz over several minutes. Ideally, we’d like to explore the data interactively, with the ability to zoom in on any segment. However, directly rendering every data point is computationally prohibitive, risks overwhelming the browser, and incurs a heavy cost just to transfer such a large dataset. Figpack overcomes these challenges through a combination of intelligent downsampling, optimized storage, and adaptive rendering.

Here's a live example showing 15 channels of data with 5 million timepoints each (try zooming and panning):

<iframe data-src="https://figures.figpack.org/figures/default/c63233908d3b492e1526085e82c71ffb63469c51/index.html" width="100%" height="600" frameborder="0" loading="lazy"></iframe>

## Technical Deep Dive

### 1. Power-of-4 Downsampling Strategy

During data preparation, figpack employs a downsampling pyramid that preserves visual accuracy while drastically reducing rendering time:

The downsampling process works by recursively creating summary levels, each representing the data at 4x lower resolution than the previous level. At each level, the data is divided into bins, and both the minimum and maximum values within each bin are preserved. This ensures that even at lower resolutions, important features like peaks and valleys in the signal remain visible. The process continues until reaching a resolution where approximately 1000 points represent the entire dataset, providing efficient visualization at any zoom level.

### 2. Optimized Storage with Zarr

The storage system automatically determines optimal chunk sizes based on the data characteristics. For efficiency, it targets chunks of approximately 5MB, taking into account the number of channels and whether the data is original or downsampled. The chunk sizes are always powers of 2 to optimize storage and access patterns. This chunking strategy ensures efficient data loading while maintaining reasonable memory usage, with different optimization approaches for original and downsampled data.

### 3. Adaptive Rendering System

The visualization system dynamically loads data based on the current view parameters, including the visible time range and plot width. It automatically requests and renders only the data needed for the current view, ensuring smooth performance even when navigating through large datasets. The system handles errors gracefully and maintains a responsive user interface throughout the data loading process.

## Performance Benefits

This three-pronged approach delivers significant benefits:

1. **Memory Efficiency**: Instead of loading all 75 million points, only the visible portion at appropriate resolution is loaded.
2. **Rendering Speed**: By using pre-computed min/max values at different scales, rendering remains smooth even when zoomed out.
3. **Visual Accuracy**: The min/max downsampling ensures no extrema are missed, preserving important signal features at any zoom level.

## Summary

The `MultiChannelTimeseries` view showcases figpack's ability to provide efficient, responsive visualization of large multi-dimensional datasets.
