# NWB Tutorial

This tutorial will guide you through creating NWB visualizations using figpack's NWB extension.

## Prerequisites

Before starting this tutorial, make sure you have the required packages installed:

```bash
pip install --upgrade figpack
figpack extensions install --upgrade figpack_nwb
```

## Plane Segmentation

The Plane Segmentation view displays calcium imaging data with region of interest (ROI) segmentation from NWB files.

```python
import figpack_nwb.views as fpn

# Load plane segmentation data from a remote NWB file
nwb_url = "https://api.dandiarchive.org/api/assets/4660dd15-93b2-4e64-88b1-ba92871989b4/download/"
path = "/processing/ophys/ImageSegmentation/PlaneSegmentation"

view = fpn.PlaneSegmentation(nwb=nwb_url, path=path, use_local_cache=True)
view.show(title="Plane Segmentation Example", open_in_browser=True)
```

<iframe data-src="./nwb_tutorial_plane_segmentation/index.html?embedded=1" width="100%" height="600" frameborder="0" loading="lazy"></iframe>

## Pose Estimation

The Pose Estimation view displays pose tracking data from NWB files.

```python
import figpack_nwb.views as fpn

# Load pose estimation data from a remote NWB file
nwb_url = "https://api.dandiarchive.org/api/assets/37ca1798-b14c-4224-b8f0-037e27725336/download/"
path = "/processing/behavior/PoseEstimationLeftCamera"

view = fpn.PoseEstimation(nwb=nwb_url, path=path, use_local_cache=True)
view.show(title="Pose Estimation from NWB", open_in_browser=True)
```

<iframe data-src="./nwb_tutorial_pose_estimation/index.html?embedded=1" width="100%" height="600" frameborder="0" loading="lazy"></iframe>
