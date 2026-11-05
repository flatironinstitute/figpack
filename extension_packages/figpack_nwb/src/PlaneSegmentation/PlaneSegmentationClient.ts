/* eslint-disable @typescript-eslint/no-explicit-any */
import { ZarrGroup } from "../figpack-interface";
import { ImageMaskRoi } from "./types";

export class PlaneSegmentationClient {
  constructor(
    public zarrGroup: ZarrGroup,
    public ids: number[],
    public imageMaskDataset: any,
    public imageMaskRois: ImageMaskRoi[],
  ) {}

  static async create(zarrGroup: ZarrGroup) {
    const ids: number[] = [];
    try {
      const ds = await zarrGroup.getDataset("id");
      if (!ds) throw new Error("No id dataset found");
      const data = await zarrGroup.getDatasetData("id", { cacheBust: true });
      if (!data) throw new Error("No id data found");
      for (let i = 0; i < data.length; i++) {
        ids.push(data[i]);
      }
    } catch (err) {
      console.warn("Error loading id dataset:", err);
    }

    const imageMaskDataset = await zarrGroup.getDataset("image_mask");
    if (imageMaskDataset) {
      const imageMaskRois = await loadImageMaskRois(ids, imageMaskDataset);
      return new PlaneSegmentationClient(
        zarrGroup,
        ids,
        imageMaskDataset,
        imageMaskRois,
      );
    }

    const pixelMaskIndexDataset = await zarrGroup.getDataset("pixel_mask_index");
    if (pixelMaskIndexDataset) {
      const pixelMaskRois = await loadPixelMaskRois(ids, zarrGroup);
      return new PlaneSegmentationClient(
        zarrGroup,
        ids,
        undefined,
        pixelMaskRois,
      );
    }

    throw new Error("No image_mask or pixel_mask dataset found");
  }
}

// Sparse masks: flat x, y, weight arrays, with pixel_mask_index[i] marking
// the end of ROI i (NWB ragged-array convention).
const loadPixelMaskRois = async (
  ids: number[],
  zarrGroup: ZarrGroup,
): Promise<ImageMaskRoi[]> => {
  const [index, xs, ys, weights] = await Promise.all([
    zarrGroup.getDatasetData("pixel_mask_index", {}),
    zarrGroup.getDatasetData("pixel_mask_x", {}),
    zarrGroup.getDatasetData("pixel_mask_y", {}),
    zarrGroup.getDatasetData("pixel_mask_weight", {}),
  ]);
  if (!index || !xs || !ys || !weights) {
    throw new Error("Incomplete pixel_mask data");
  }
  if (index.length !== ids.length) {
    throw new Error("pixel_mask_index length does not match ids length");
  }
  const rois: ImageMaskRoi[] = [];
  let start = 0;
  for (let i = 0; i < ids.length; i++) {
    const end = Number(index[i]);
    const roi: ImageMaskRoi = { id: ids[i], x: [], y: [], val: [] };
    for (let j = start; j < end; j++) {
      const val = Number(weights[j]);
      if (val !== 0) {
        roi.x.push(Number(xs[j]));
        roi.y.push(Number(ys[j]));
        roi.val.push(val);
      }
    }
    rois.push(roi);
    start = end;
  }
  return rois;
};

const loadImageMaskRois = async (
  ids: number[],
  imageMaskDataset: any,
): Promise<ImageMaskRoi[]> => {
  const shape = imageMaskDataset.shape;
  if (shape[0] !== ids.length) {
    throw new Error("image_mask dataset shape does not match ids length");
  }
  if (shape.length !== 3) {
    throw new Error("image_mask dataset is not 3-dimensional");
  }

  const data = await imageMaskDataset.getData({});
  if (!data) {
    throw new Error("No image_mask data found");
  }

  const rois: ImageMaskRoi[] = [];
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const roi: ImageMaskRoi = { id, x: [], y: [], val: [] };
    for (let x = 0; x < shape[1]; x++) {
      for (let y = 0; y < shape[2]; y++) {
        const val = data[i * shape[1] * shape[2] + x * shape[2] + y];
        if (val !== 0) {
          roi.x.push(x);
          roi.y.push(y);
          roi.val.push(val);
        }
      }
    }
    rois.push(roi);
  }
  return rois;
};
