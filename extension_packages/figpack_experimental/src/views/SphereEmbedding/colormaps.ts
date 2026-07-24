/**
 * Colormaps for the SphereEmbedding view.
 * Each colormap maps a normalized value in [0, 1] to [r, g, b] in [0, 255].
 */

export type ColormapFunc = (t: number) => [number, number, number];

const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

// Piecewise-linear interpolation through control points (r, g, b in 0-255)
const makeInterpolated = (stops: [number, number, number][]): ColormapFunc => {
  const n = stops.length;
  return (t: number) => {
    t = clamp01(t);
    const x = t * (n - 1);
    const i = Math.min(n - 2, Math.floor(x));
    const f = x - i;
    const a = stops[i];
    const b = stops[i + 1];
    return [
      Math.round(a[0] + (b[0] - a[0]) * f),
      Math.round(a[1] + (b[1] - a[1]) * f),
      Math.round(a[2] + (b[2] - a[2]) * f),
    ];
  };
};

// Control points sampled from matplotlib colormaps
const viridis = makeInterpolated([
  [68, 1, 84],
  [72, 40, 120],
  [62, 74, 137],
  [49, 104, 142],
  [38, 130, 142],
  [31, 158, 137],
  [53, 183, 121],
  [109, 205, 89],
  [180, 222, 44],
  [253, 231, 37],
]);

const plasma = makeInterpolated([
  [13, 8, 135],
  [84, 2, 163],
  [139, 10, 165],
  [185, 50, 137],
  [219, 92, 104],
  [244, 136, 73],
  [254, 188, 43],
  [240, 249, 33],
]);

const inferno = makeInterpolated([
  [0, 0, 4],
  [40, 11, 84],
  [101, 21, 110],
  [159, 42, 99],
  [212, 72, 66],
  [245, 125, 21],
  [250, 193, 39],
  [252, 255, 164],
]);

const coolwarm = makeInterpolated([
  [59, 76, 192],
  [124, 159, 249],
  [192, 212, 245],
  [242, 242, 242],
  [245, 195, 157],
  [222, 96, 77],
  [180, 4, 38],
]);

const jet = makeInterpolated([
  [0, 0, 128],
  [0, 0, 255],
  [0, 255, 255],
  [0, 255, 0],
  [255, 255, 0],
  [255, 0, 0],
  [128, 0, 0],
]);

const grayscale: ColormapFunc = (t: number) => {
  const v = Math.round(clamp01(t) * 255);
  return [v, v, v];
};

export const colormaps: Record<string, ColormapFunc> = {
  viridis,
  plasma,
  inferno,
  coolwarm,
  jet,
  grayscale,
};

export const colormapNames = Object.keys(colormaps);
