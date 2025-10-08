# Creating a New View

This guide walks you through the process of creating a new view in figpack. Views are the fundamental building blocks for data visualization in figpack. While some general-purpose views are built into the figpack-figure application, you'll often want to create custom views within an extension.

## Prerequisites

Before creating a new view, ensure you have:
- Basic understanding of Python and React/TypeScript
- Familiarity with zarr for data storage
- Python with pip installed
- Node.js with npm installed

## Overview

Creating a new view involves two main components:
1. **Python Backend**: Handles data preparation and storage in zarr format
2. **Frontend Component**: Renders the data in the browser

You can contribute your view to an existing extension like `figpack_experimental`, or create your own extension. For beginners, we recommend starting with the experimental extension.

## Python Backend Component

The backend component is a Python class that inherits from `figpack.ExtensionView`. Here's a simple example:

```python
import numpy as np
import figpack
from .experimental_extension import experimental_extension

class MyView(figpack.ExtensionView):
    def __init__(self, data: np.ndarray):
        """Initialize your view with data"""
        super().__init__(
            extension=experimental_extension,
            view_type="experimental.MyView"  # Must match frontend registration
        )
        self.data = data

    def write_to_zarr_group(self, group: figpack.Group) -> None:
        """Write data to zarr group for frontend access"""
        super().write_to_zarr_group(group)
        
        # Store metadata in attributes if needed
        group.attrs["some_metadata"] = "value"
        
        # Create dataset
        group.create_dataset("data", data=self.data)
```

Key points about the Python component:
- The class must inherit from `figpack.ExtensionView`
- The constructor accepts the data and any configuration parameters
- `write_to_zarr_group` is required and handles data storage
- The `group` parameter is a wrapper around zarr groups (figpack uses zarr v2 format but the wrapper ensures compatibility even if zarr v3 is installed)
- Use attributes for metadata and datasets for the actual data
- Consider chunking strategies for efficient data access

### Optimizing Data Storage

For optimal performance, consider how your data will be accessed on the frontend:

1. **Data Types**: Be explicit about data types to optimize storage size
   ```python
   # Use appropriate data types to minimize storage
   data_uint8 = data.astype(np.uint8)    # For 0-255 values
   data_float32 = data.astype(np.float32)  # Instead of float64 when precision allows
   group.create_dataset("data", data=data_uint8)
   ```

2. **Data Organization**: Structure your data to match access patterns
   ```python
   # Example: Store both original and transposed data for different access patterns
   group.create_dataset("data", data=data)
   group.create_dataset("data_transpose", data=np.transpose(data))
   ```

3. **Multi-scale Data**: For large datasets, consider storing downsampled versions (see [MultiChannelTimeseries.py](https://github.com/flatironinstitute/figpack/blob/main/figpack/views/MultiChannelTimeseries.py) for a detailed example)
   ```python
   # Store original and downsampled versions
   group.create_dataset("full_resolution", data=data)
   group.create_dataset("downsampled_2x", data=downsample(data, factor=2))
   group.create_dataset("downsampled_4x", data=downsample(data, factor=4))
   ```

4. **Compression**: Zarr compresses data by default, which is especially effective for sparse data. For specialized data types, you can implement custom codecs. For example, the [LossyVideo view](https://github.com/flatironinstitute/figpack/blob/main/extension_packages/figpack_experimental/figpack_experimental/views/LossyVideo.py) uses MP4 compression:
   ```python
   # Register the MP4 codec
   MP4Codec.register_codec()
   
   # Use it when creating the dataset
   group.create_dataset("video", data=data, compressor=MP4Codec(fps=self.fps))
   ```
   
   If using a custom codec, you'll also need to register the corresponding decoder on the frontend (see how this is done in the [experimental extension's index.tsx](https://github.com/flatironinstitute/figpack/blob/main/extension_packages/figpack_experimental/src/index.tsx)).

## Frontend Component

The frontend component is a React component that renders the data. It can utilize various contexts for synchronization with other views. For example, the timeseriesSelection context allows time-based views to stay synchronized.

Let's start with a basic example:

```typescript
import React from 'react';
import { ZarrGroup, FPViewContexts } from '../../figpack-interface';

interface Props {
  zarrGroup: ZarrGroup;
  width: number;
  height: number;
  contexts: FPViewContexts;
}

const MyView: React.FC<Props> = ({ zarrGroup, width, height, contexts }) => {
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const loadData = async () => {
      try {
        const data = await zarrGroup.getDatasetData("data", {});
        setData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [zarrGroup]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!data) return <div>No data</div>;

  return (
    <div style={{ width, height }}>
      {/* Your visualization code here */}
    </div>
  );
};

export default MyView;
```

Key points about the frontend component:
- Receives `zarrGroup` for data access, dimensions, and contexts for synchronization
- Use `zarrGroup.getDatasetData()` to efficiently load data with optional slicing (details beyond scope, but see examples throughout the project)
- Consider implementing loading states and error handling
- Use contexts for synchronization with other views

### Using Contexts for Synchronization

Views can share state using contexts. For example, here's how the [FmriBold view](https://github.com/flatironinstitute/figpack/blob/main/extension_packages/figpack_experimental/src/views/FmriBold/FPFmriBold.tsx) uses the timeseriesSelection context:

```typescript
import { useTimeseriesSelection } from "../../TimeseriesSelectionContext";

const MyView: React.FC<Props> = ({ zarrGroup, width, height, contexts }) => {
  const { currentTime, setCurrentTime } = useTimeseriesSelection();
  
  // Use currentTime for synchronized playback across views
  const currentTimeIndex = Math.round(currentTime / temporalResolution);
  
  // Update shared time when user interacts with this view
  const handleTimeChange = (newTime: number) => {
    setCurrentTime(newTime);
  };
  
  return (
    // Your render code using currentTimeIndex
  );
};
```

### Real Examples from the Codebase

- **Simple Image View**: Check out [FPImage.tsx](https://github.com/flatironinstitute/figpack/blob/main/figpack-figure/src/figpack-main-plugin/views/FPImage.tsx) for a straightforward example of loading and displaying image data.
- **Complex Interactive View**: The [FmriBold view](https://github.com/flatironinstitute/figpack/blob/main/extension_packages/figpack_experimental/src/views/FmriBold/FmriBoldView.tsx) demonstrates interactive components with synchronized timeseries.
- **Video with Custom Codec**: The [LossyVideo view](https://github.com/flatironinstitute/figpack/blob/main/extension_packages/figpack_experimental/src/views/LossyVideo/FPLossyVideo.tsx) shows how to implement custom compression with MP4 encoding.

## Integration Steps

### 1. Register the Python View

Add your view to the extension's `__init__.py`:

```python
from .MyView import MyView
__all__ = [..., "MyView"]
```

### 2. Install and Test the Backend

Install the extension in editable mode:
```bash
cd extension_packages/figpack_experimental
pip install -e .
```

Create a test script to verify the backend works:
```python
import numpy as np
from figpack_experimental.views import MyView

data = np.random.rand(100, 100)
view = MyView(data)
view.show(title="My View Test", open_in_browser=True)
```

Run this script and you should see a figure open in your browser, but it will display a message that the view type is not supported. This confirms the backend is working and we need to implement the frontend.

### 3. Register the Frontend Component

Add your component to the extension's entry point (e.g., `src/index.tsx`):

```typescript
registerFPViewComponent({
  name: "experimental.MyView",  // Must match Python view_type
  render: makeRenderFunction(MyView)
});
```

### 4. Build and Test

Build the frontend:
```bash
npm run build
```

Run your test script again - now you should see your custom view rendered properly.

### Development Workflow

For faster development:

1. Run frontend in dev mode:
   ```bash
   npm run dev
   ```

2. Append to browser URL:
   ```
   ?ext_dev=figpack-experimental:http://localhost:5174/figpack_experimental.js
   ```

3. Use browser dev tools and console.log() for debugging

## Contributing Your View

To contribute to the experimental extension:

1. Create a pull request to the figpack repository
2. Increment the extension version
3. Update the changelog
4. Wait for the extension to be rebuilt and published

Alternatively, create your own extension using figpack_experimental as a template.

## Need Help?

If you run into issues:
- Check the browser console for frontend errors
- Use Python debugger for backend issues
- Reach out to the community for assistance

Remember: Start simple and iterate. Focus on getting a basic version working before adding complex features.
