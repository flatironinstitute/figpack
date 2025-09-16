// Helper functions to manipulate hex colors without external dependencies

/**
 * Convert hex color to RGB values
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

/**
 * Convert RGB values to hex color
 */
function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = Math.round(Math.max(0, Math.min(255, n))).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Darken a hex color by a given factor
 * Factor of 1 = no change, factor > 1 = darker
 */
function darkenColor(hex: string, factor: number): string {
  const { r, g, b } = hexToRgb(hex);
  const darkenFactor = 1 / factor;
  return rgbToHex(r * darkenFactor, g * darkenFactor, b * darkenFactor);
}

/**
 * Brighten a hex color by a given factor
 * Factor of 1 = no change, factor > 1 = brighter
 */
function brightenColor(hex: string, factor: number): string {
  const { r, g, b } = hexToRgb(hex);
  // Brighten by moving towards white (255)
  const brightenFactor = factor;
  const newR = r + ((255 - r) * (brightenFactor - 1)) / brightenFactor;
  const newG = g + ((255 - g) * (brightenFactor - 1)) / brightenFactor;
  const newB = b + ((255 - b) * (brightenFactor - 1)) / brightenFactor;
  return rgbToHex(newR, newG, newB);
}

// these are used by plotly
const colorList = [
  "#1f77b4",
  "#ff7f0e",
  "#2ca02c",
  "#d62728",
  "#9467bd",
  "#8c564b",
  "#e377c2",
  "#7f7f7f",
  "#bcbd22",
  "#17becf",
];

const n = colorList.length;
for (let i = 0; i < n; i++) {
  colorList.push(darkenColor(colorList[i], 2));
}
for (let i = 0; i < n; i++) {
  colorList.push(brightenColor(colorList[i], 1.5));
}

export default colorList;
