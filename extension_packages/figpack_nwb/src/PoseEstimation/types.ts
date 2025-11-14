export type PoseEstimationData = {
  timestamps: Float32Array | Float64Array;
  poseData: Float32Array | Float64Array; // 3D array flattened (Time x Nodes x 2)
  nodeNames: string[];
  nodeDescriptions: string[];
  numTimepoints: number;
  numNodes: number;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  description: string;
};

export type NodePosition = {
  x: number;
  y: number;
};
