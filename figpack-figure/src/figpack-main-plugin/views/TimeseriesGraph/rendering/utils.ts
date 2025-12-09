// Cache for darkened colors to avoid expensive recalculations
const darkenColorCache = new Map<string, string>();

// Helper function to darken a color by a given factor (0-1)
export const darkenColor = (color: string, factor: number = 0.3): string => {
  const cacheKey = `${color}_${factor}`;

  // Check cache first
  const cached = darkenColorCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  // Parse color - handles hex, rgb, rgba, and named colors
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext("2d");
  if (!ctx) return color;

  ctx.fillStyle = color;
  const computedColor = ctx.fillStyle;

  let result: string;

  // Parse hex color
  if (computedColor.startsWith("#")) {
    const hex = computedColor.slice(1);
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);

    const darkenedR = Math.floor(r * (1 - factor));
    const darkenedG = Math.floor(g * (1 - factor));
    const darkenedB = Math.floor(b * (1 - factor));

    result = `rgb(${darkenedR}, ${darkenedG}, ${darkenedB})`;
  } else {
    // Parse rgb/rgba color
    const rgbMatch = computedColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (rgbMatch) {
      const r = parseInt(rgbMatch[1]);
      const g = parseInt(rgbMatch[2]);
      const b = parseInt(rgbMatch[3]);

      const darkenedR = Math.floor(r * (1 - factor));
      const darkenedG = Math.floor(g * (1 - factor));
      const darkenedB = Math.floor(b * (1 - factor));

      result = `rgb(${darkenedR}, ${darkenedG}, ${darkenedB})`;
    } else {
      result = color; // Fallback
    }
  }

  // Store in cache
  darkenColorCache.set(cacheKey, result);
  return result;
};
