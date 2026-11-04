/* eslint-disable @typescript-eslint/no-explicit-any */

// Appearance settings of a view, from its `style` attr, e.g.
//   style: { label_font_size: 16, tick_font_size: 12 }
// All fields are optional; unset fields keep the view's defaults.
export type ViewStyle = {
  labelFontSize?: number;
  tickFontSize?: number;
};

export const defaultLabelFontSize = 13;
export const defaultTickFontSize = 10;

const positiveNumber = (v: any): number | undefined =>
  typeof v === "number" && isFinite(v) && v > 0 ? v : undefined;

export const viewStyleFromAttr = (attr: any): ViewStyle => {
  if (!attr || typeof attr !== "object") return {};
  return {
    labelFontSize: positiveNumber(attr["label_font_size"]),
    tickFontSize: positiveNumber(attr["tick_font_size"]),
  };
};
