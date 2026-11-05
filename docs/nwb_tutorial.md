# NWB Tutorial

This tutorial will guide you through creating NWB visualizations using figpack's NWB extension.

## Prerequisites

Before starting this tutorial, make sure you have the required packages installed:

```bash
pip install --upgrade figpack
figpack extensions install --upgrade figpack_nwb
```

## Plane Segmentation

The Plane Segmentation view displays the regions of interest (ROIs) found in a calcium imaging recording, read from the PlaneSegmentation table of an NWB file. Both dense (`image_mask`) and sparse (`pixel_mask`) masks are supported. Here we load the 475 ROIs of a two-photon session from the Allen Brain Observatory ([DANDI:000728](https://dandiarchive.org/dandiset/000728)), streamed from the DANDI Archive:

```python
import figpack_nwb.views as fpn

nwb_url = "https://api.dandiarchive.org/api/assets/25f50ae3-00ae-40b4-839c-ec331403e5a2/download/"
path = "/processing/ophys/ImageSegmentation/PlaneSegmentation"

view = fpn.PlaneSegmentation(nwb=nwb_url, path=path, use_local_cache=True)
view.show(title="Plane Segmentation Example", open_in_browser=True)
```

<iframe data-src="./nwb_tutorial_plane_segmentation/index.html?embedded=1" width="100%" height="600" frameborder="0" loading="lazy"></iframe>

## Pose Estimation

The Pose Estimation view animates body part positions from a PoseEstimation object (from the ndx-pose extension) in an NWB file. Here we load the tracked face and paw points from one camera of a mouse behavior session:

```python
import figpack_nwb.views as fpn

nwb_url = "https://api.dandiarchive.org/api/assets/37ca1798-b14c-4224-b8f0-037e27725336/download/"
path = "/processing/behavior/PoseEstimationLeftCamera"

view = fpn.PoseEstimation(nwb=nwb_url, path=path, use_local_cache=True)
view.show(title="Pose Estimation from NWB", open_in_browser=True)
```

<iframe data-src="./nwb_tutorial_pose_estimation/index.html?embedded=1" width="100%" height="600" frameborder="0" loading="lazy"></iframe>
