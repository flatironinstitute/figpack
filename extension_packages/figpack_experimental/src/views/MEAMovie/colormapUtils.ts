/**
 * Color scheme functions for MEA electrode visualization
 */
const colorSchemes: Record<string, (normalizedValue: number) => string> = {
  "blue-red": (normalizedValue: number): string => {
    // 0 = blue (negative), 0.5 = gray (zero), 1 = red (positive)
    const red = Math.round(255 * normalizedValue);
    const blue = Math.round(255 * (1 - normalizedValue));
    const green = Math.round(128 * (1 - Math.abs(normalizedValue - 0.5) * 2));
    return `rgb(${red}, ${green}, ${blue})`;
  },

  viridis: (normalizedValue: number): string => {
    // Viridis color scheme approximation
    const v = normalizedValue;
    let r: number, g: number, b: number;

    if (v < 0.25) {
      const t = v / 0.25;
      r = 68 + (59 - 68) * t;
      g = 1 + (82 - 1) * t;
      b = 84 + (139 - 84) * t;
    } else if (v < 0.5) {
      const t = (v - 0.25) / 0.25;
      r = 59 + (33 - 59) * t;
      g = 82 + (144 - 82) * t;
      b = 139 + (140 - 139) * t;
    } else if (v < 0.75) {
      const t = (v - 0.5) / 0.25;
      r = 33 + (93 - 33) * t;
      g = 144 + (201 - 144) * t;
      b = 140 + (99 - 140) * t;
    } else {
      const t = (v - 0.75) / 0.25;
      r = 93 + (253 - 93) * t;
      g = 201 + (231 - 201) * t;
      b = 99 + (37 - 99) * t;
    }

    return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
  },

  hot: (normalizedValue: number): string => {
    // Hot color scheme: black -> red -> yellow -> white
    const v = normalizedValue;
    let r: number, g: number, b: number;

    if (v < 0.33) {
      r = 255 * (v / 0.33);
      g = 0;
      b = 0;
    } else if (v < 0.67) {
      r = 255;
      g = 255 * ((v - 0.33) / 0.34);
      b = 0;
    } else {
      r = 255;
      g = 255;
      b = 255 * ((v - 0.67) / 0.33);
    }

    return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
  },

  grayscale: (normalizedValue: number): string => {
    const intensity = Math.round(255 * normalizedValue);
    return `rgb(${intensity}, ${intensity}, ${intensity})`;
  },

  cool: (normalizedValue: number): string => {
    // Cool color scheme: cyan to magenta
    const r = Math.round(255 * normalizedValue);
    const g = Math.round(255 * (1 - normalizedValue));
    const b = 255;
    return `rgb(${r}, ${g}, ${b})`;
  },
};

/**
 * Convert a normalized value (0-1) to a color using specified color scheme
 */
export const valueToColor = (
  normalizedValue: number,
  scheme: string = "grayscale",
): string => {
  const colorFunc = colorSchemes[scheme] || colorSchemes["grayscale"];
  return colorFunc(normalizedValue);
};
