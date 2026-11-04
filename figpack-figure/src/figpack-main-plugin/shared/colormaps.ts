// Colormaps as evenly spaced control points, interpolated linearly. A name
// ending in "_r" gives the reversed map (e.g. "gray_r" is white to black).
type RGB = [number, number, number];

const COLORMAPS: { [name: string]: RGB[] } = {
  viridis: [
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
  ],
  plasma: [
    [13, 8, 135],
    [65, 4, 157],
    [106, 0, 168],
    [143, 13, 164],
    [177, 42, 144],
    [204, 71, 120],
    [225, 100, 98],
    [242, 132, 75],
    [252, 166, 54],
    [252, 206, 37],
    [240, 249, 33],
  ],
  inferno: [
    [0, 0, 4],
    [22, 11, 57],
    [66, 10, 104],
    [106, 23, 110],
    [147, 38, 103],
    [188, 55, 84],
    [221, 81, 58],
    [243, 120, 25],
    [252, 165, 10],
    [246, 215, 70],
    [252, 255, 164],
  ],
  magma: [
    [0, 0, 4],
    [20, 14, 54],
    [59, 15, 112],
    [100, 26, 128],
    [140, 41, 129],
    [183, 55, 121],
    [222, 73, 104],
    [247, 112, 92],
    [254, 159, 109],
    [254, 207, 146],
    [252, 253, 191],
  ],
  gray: [
    [0, 0, 0],
    [255, 255, 255],
  ],
};

export const colormapNames = Object.keys(COLORMAPS);

// Returns a function from a value in [0, 1] to an RGB color; unknown names
// fall back to defaultName
export const colormapFunction = (
  name: string | undefined,
  defaultName: string = "viridis",
): ((value: number) => RGB) => {
  const reversed = !!name && name.endsWith("_r");
  const baseName = reversed ? name!.slice(0, -2) : name;
  const points =
    (baseName && COLORMAPS[baseName]) || COLORMAPS[defaultName] || [];
  const n = points.length;
  return (value: number) => {
    let v = Math.max(0, Math.min(1, isNaN(value) ? 0 : value));
    if (reversed) v = 1 - v;
    const scaled = v * (n - 1);
    const i = Math.min(Math.floor(scaled), n - 2);
    const f = scaled - i;
    const c1 = points[i];
    const c2 = points[i + 1];
    return [
      Math.round(c1[0] + (c2[0] - c1[0]) * f),
      Math.round(c1[1] + (c2[1] - c1[1]) * f),
      Math.round(c1[2] + (c2[2] - c1[2]) * f),
    ];
  };
};
