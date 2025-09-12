export type ImageMaskRoi = {
  id: number;
  x: number[];
  y: number[];
  val: number[];
};

export type PlaneSegmentationViewProps = {
  zarrGroup: any; // ZarrGroup from figpack-interface
  width: number;
  height: number;
};

export type ScaleAndBounds = {
  scale: number;
  maxX: number;
  maxY: number;
  canvasWidth: number;
  canvasHeight: number;
};

export type BoundingRect = {
  id: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

export type Coordinate = {
  xc: number;
  yc: number;
};

export type Pixel = {
  xp: number;
  yp: number;
};
