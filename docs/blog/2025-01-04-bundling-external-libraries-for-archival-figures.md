---
layout: post
title: "Bundling External Libraries for Archival Figures"
date: 2025-01-04 10:00:00 -0500
categories: [technical, architecture]
tags: [figpack, archival, reproducibility]
author: figpack team
---

Scientific figures need to remain functional for years or decades. This creates a challenge when using external JavaScript libraries: what happens when CDN services disappear or library versions are removed?

## The Problem with CDN Loading

Many web applications load libraries dynamically from CDNs like jsdelivr. While convenient, this approach introduces risks for long-term archival:

- **Link rot**: CDN services can shut down or change URLs
- **Version removal**: Older library versions may be deleted
- **Reproducibility issues**: Figures may render differently or break entirely over time

## figpack's Solution: Bundle Everything

Instead of loading libraries dynamically, figpack downloads and bundles them directly into figure files during creation. For example, our force graph extension uses the force-graph library from https://cdn.jsdelivr.net/npm/force-graph@1.50.1/dist/force-graph.min.js. Rather than loading this at runtime, figpack downloads the exact version during figure creation and includes it in the bundle.
