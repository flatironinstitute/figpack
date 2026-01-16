# ClusterLens Selection Tools

## Overview

The ClusterLens view now includes interactive selection tools for exploring point clusters in UMAP embeddings.

## Features

### Interaction Modes

1. **Pan Mode** (🖐️)
   - Default mode for navigation
   - Drag to pan the view
   - Scroll to zoom in/out

2. **Rectangle Select Mode** (▢)
   - Click and drag to draw a selection rectangle
   - Points within the rectangle will be selected
   - Modifier keys supported (see below)

3. **Lasso Select Mode** (⊚)
   - Click and drag to draw a freeform selection polygon
   - Points within the drawn path will be selected
   - Modifier keys supported (see below)

### Modifier Keys

- **No modifier**: Replace current selection
- **Shift**: Add to current selection
- **Alt**: Remove from current selection

### Visual Feedback

- **Unselected points**: Blue
- **Selected points**: Orange (#ff6b35)
- Selection count is displayed in the toolbar
- "Clear" button appears when points are selected

## Architecture

### Components

- **`InteractionToolbar.tsx`**: Toolbar component with mode buttons and selection controls
- **`ScatterPlot.tsx`**: Main scatter plot canvas with selection logic
- **`selectionUtils.ts`**: Utility functions for geometric selection operations

### State Management

Selection state is maintained internally within the `FPClusterLens` component using:
- `interactionMode`: Current tool mode (pan/rectangleSelect/lassoSelect)
- `selectedIndices`: Set of selected point indices

### Modularity

The implementation is modular and can be easily extended:
- Add new interaction modes by extending `InteractionMode` type
- Implement custom selection algorithms in `selectionUtils.ts`
- Expose selection data via props/callbacks for downstream analysis
