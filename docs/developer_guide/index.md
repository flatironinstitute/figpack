# Developer Guide

This guide provides detailed technical information about figpack's architecture and implementation. It is intended for developers who want to contribute to or extend the project.

## Components Overview

figpack consists of several components (all in this repo) that work together:

1. Core Python Package (`figpack/`)

   - Implements the main package functionality
   - Handles figure creation
   - Provides the view system and core utilities

2. Web API (`figpack-api/`)

   - Handles server-side operations for uploading and managing cloud figures
   - Manages figure storage and retrieval
   - Provides API endpoints for figure interaction

3. Figure GUI (`figpack-figure/`)

   - Renders interactive visualizations
   - Implements the various views in React

4. Management Interface (`figpack-manage/`)
   - Manage uploaded figures (viewing, renewing, pinning, deleting, etc)
   - Provides administrative tools (users, buckets, etc)

Documentation for each component:

```{toctree}
:maxdepth: 2

python-package
figpack-figure
figpack-manage
figpack-api
```

---
