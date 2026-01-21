import os
import urllib.request
import numpy as np
import nibabel as nib
import figpack_experimental.views as jv

url = "https://s3.amazonaws.com/openneuro.org/ds006661/sub-001/func/sub-001_task-main_run-01_bold.nii.gz"
local_fname = "tmp-sub-001_task-main_run-01_bold.nii.gz"

# download if needed
if not os.path.exists(local_fname):
    print(f"Downloading from {url}...")
    urllib.request.urlretrieve(url, local_fname)
    print("Download complete.")
else:
    print(f"{local_fname} already exists. Skipping download.")

img = nib.load(local_fname)  # type: ignore
data = img.get_fdata()  # type: ignore
# scale to 0-255, and bring 99th percentile to 255
pct_99 = np.percentile(data, 99)
data = np.clip(data, 0, pct_99)
data = ((data / pct_99) * 255).astype(np.uint8)
# extract a slice
slice = data[:, :, -1]
# slice is W x H x T
# permute this so that it is T x H x W
slice = np.transpose(slice, (2, 1, 0))
# reverse the H direction so that it is not upside down
slice = slice[:, ::-1, :]
# make rgb channels, grayscale
slice_rgb = np.repeat(slice[:, :, :, np.newaxis], 3, axis=3)
# make a LossyVideo
v = jv.LossyVideo(slice_rgb, fps=10)
v.show(title="fMRI Series", open_in_browser=True)
