/**
 * Mesh topology for a spherical (nlat, nphi) grid following shtns conventions:
 * - latitudinal grid given as cos(theta) (e.g. Gauss nodes, poles not included)
 * - phi equally spaced starting at 0, endpoint excluded
 *
 * The phi seam is stitched when the phi grid spans the full circle, and pole
 * cap vertices are added when the grid does not reach the poles, so that the
 * rendered surface is closed.
 */

import { ColormapFunc } from "./colormaps";

export type SphereMeshTopology = {
  nlat: number;
  nphi: number;
  wrapPhi: boolean;
  // Cap adjacent to row 0 / row nlat-1 (extra vertex appended after the grid)
  startCapIndex: number; // -1 if absent
  endCapIndex: number; // -1 if absent
  numVertices: number;
  indices: Uint32Array;
  // Reference unit-sphere positions, length numVertices * 3
  sphereRef: Float32Array;
};

export const buildTopology = (
  cosTheta: Float64Array | Float32Array,
  phi: Float64Array | Float32Array,
): SphereMeshTopology => {
  const nlat = cosTheta.length;
  const nphi = phi.length;

  // Does the phi grid span the full circle (so the seam should be stitched)?
  let wrapPhi = false;
  if (nphi >= 3) {
    const dphi = phi[1] - phi[0];
    const gap = phi[0] + 2 * Math.PI - phi[nphi - 1];
    wrapPhi = Math.abs(gap - dphi) < 0.25 * Math.abs(dphi);
  }

  // Add pole caps where the grid does not reach the pole (|cos_theta| < 1),
  // only when the surface wraps in phi (otherwise there is no hole to close)
  const poleEps = 1e-9;
  const hasStartCap = wrapPhi && Math.abs(Math.abs(cosTheta[0]) - 1) > poleEps;
  const hasEndCap =
    wrapPhi && Math.abs(Math.abs(cosTheta[nlat - 1]) - 1) > poleEps;

  const numGridVertices = nlat * nphi;
  let numVertices = numGridVertices;
  const startCapIndex = hasStartCap ? numVertices++ : -1;
  const endCapIndex = hasEndCap ? numVertices++ : -1;

  const numCols = wrapPhi ? nphi : nphi - 1;
  let numTriangles = (nlat - 1) * numCols * 2;
  if (hasStartCap) numTriangles += nphi;
  if (hasEndCap) numTriangles += nphi;

  const indices = new Uint32Array(numTriangles * 3);
  let k = 0;
  for (let i = 0; i < nlat - 1; i++) {
    for (let j = 0; j < numCols; j++) {
      const j2 = (j + 1) % nphi;
      const a = i * nphi + j;
      const b = i * nphi + j2;
      const c = (i + 1) * nphi + j;
      const d = (i + 1) * nphi + j2;
      indices[k++] = a;
      indices[k++] = c;
      indices[k++] = b;
      indices[k++] = b;
      indices[k++] = c;
      indices[k++] = d;
    }
  }
  if (hasStartCap) {
    for (let j = 0; j < nphi; j++) {
      const j2 = (j + 1) % nphi;
      indices[k++] = startCapIndex;
      indices[k++] = j;
      indices[k++] = j2;
    }
  }
  if (hasEndCap) {
    const rowOffset = (nlat - 1) * nphi;
    for (let j = 0; j < nphi; j++) {
      const j2 = (j + 1) % nphi;
      indices[k++] = rowOffset + j;
      indices[k++] = endCapIndex;
      indices[k++] = rowOffset + j2;
    }
  }

  // Reference unit-sphere positions (z along the polar axis)
  const sphereRef = new Float32Array(numVertices * 3);
  for (let i = 0; i < nlat; i++) {
    const ct = cosTheta[i];
    const st = Math.sqrt(Math.max(0, 1 - ct * ct));
    for (let j = 0; j < nphi; j++) {
      const p = (i * nphi + j) * 3;
      sphereRef[p] = st * Math.cos(phi[j]);
      sphereRef[p + 1] = st * Math.sin(phi[j]);
      sphereRef[p + 2] = ct;
    }
  }
  if (hasStartCap) {
    const p = startCapIndex * 3;
    sphereRef[p + 2] = cosTheta[0] >= 0 ? 1 : -1;
  }
  if (hasEndCap) {
    const p = endCapIndex * 3;
    sphereRef[p + 2] = cosTheta[nlat - 1] >= 0 ? 1 : -1;
  }

  return {
    nlat,
    nphi,
    wrapPhi,
    startCapIndex,
    endCapIndex,
    numVertices,
    indices,
    sphereRef,
  };
};

/**
 * Fill the position buffer (numVertices * 3) from an embedded coords frame
 * (nlat * nphi * 3), interpolating toward the reference unit sphere.
 * morph = 1 gives the embedded geometry; morph = 0 pulls back to the sphere.
 */
export const fillPositions = (
  out: Float32Array,
  coordsFrame: Float32Array | Float64Array,
  topo: SphereMeshTopology,
  morph: number,
): void => {
  const { nlat, nphi, sphereRef } = topo;
  const n = nlat * nphi * 3;
  for (let p = 0; p < n; p++) {
    out[p] = (1 - morph) * sphereRef[p] + morph * coordsFrame[p];
  }
  // Cap positions: average of the adjacent ring in the embedded geometry
  const fillCap = (capIndex: number, rowIndex: number) => {
    let x = 0,
      y = 0,
      z = 0;
    const rowOffset = rowIndex * nphi * 3;
    for (let j = 0; j < nphi; j++) {
      x += coordsFrame[rowOffset + j * 3];
      y += coordsFrame[rowOffset + j * 3 + 1];
      z += coordsFrame[rowOffset + j * 3 + 2];
    }
    x /= nphi;
    y /= nphi;
    z /= nphi;
    const p = capIndex * 3;
    out[p] = (1 - morph) * sphereRef[p] + morph * x;
    out[p + 1] = (1 - morph) * sphereRef[p + 1] + morph * y;
    out[p + 2] = (1 - morph) * sphereRef[p + 2] + morph * z;
  };
  if (topo.startCapIndex >= 0) fillCap(topo.startCapIndex, 0);
  if (topo.endCapIndex >= 0) fillCap(topo.endCapIndex, nlat - 1);
};

/**
 * Expand a field frame (nlat * nphi) to per-vertex values (numVertices),
 * with cap values averaged from the adjacent ring.
 */
export const fillFieldValues = (
  out: Float32Array,
  fieldFrame: Float32Array | Float64Array,
  topo: SphereMeshTopology,
): void => {
  const { nlat, nphi } = topo;
  const n = nlat * nphi;
  for (let p = 0; p < n; p++) {
    out[p] = fieldFrame[p];
  }
  const ringMean = (rowIndex: number) => {
    let sum = 0;
    let count = 0;
    for (let j = 0; j < nphi; j++) {
      const v = fieldFrame[rowIndex * nphi + j];
      if (!Number.isNaN(v)) {
        sum += v;
        count++;
      }
    }
    return count > 0 ? sum / count : NaN;
  };
  if (topo.startCapIndex >= 0) out[topo.startCapIndex] = ringMean(0);
  if (topo.endCapIndex >= 0) out[topo.endCapIndex] = ringMean(nlat - 1);
};

/**
 * Fill the color buffer (numVertices * 3, floats in [0, 1]) from per-vertex
 * field values using the given colormap and range. NaN values render gray.
 */
export const fillColors = (
  out: Float32Array,
  values: Float32Array,
  valueMin: number,
  valueMax: number,
  cmap: ColormapFunc,
): void => {
  const span = valueMax - valueMin;
  const invSpan = span !== 0 ? 1 / span : 0;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    const p = i * 3;
    if (Number.isNaN(v)) {
      out[p] = 0.35;
      out[p + 1] = 0.35;
      out[p + 2] = 0.35;
    } else {
      const t = span !== 0 ? (v - valueMin) * invSpan : 0.5;
      const [r, g, b] = cmap(t);
      out[p] = r / 255;
      out[p + 1] = g / 255;
      out[p + 2] = b / 255;
    }
  }
};
