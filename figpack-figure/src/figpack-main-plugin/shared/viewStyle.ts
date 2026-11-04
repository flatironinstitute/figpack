/* eslint-disable @typescript-eslint/no-explicit-any */

// Appearance settings of a view, from its `style` attr, e.g.
//   style: { label_font_size: 16, tick_font_size: 12 }
// All fields are optional; unset fields keep the view's defaults.
export type ViewStyle = {
  labelFontSize?: number;
  tickFontSize?: number;
  legendFontSize?: number;
  fontFamily?: string;
  textColor?: string;
  backgroundColor?: string;
  gridlineColor?: string;
  minorGridlineColor?: string;
  titleFontSize?: number;
  titleColor?: string;
  titleBackgroundColor?: string;
  colormap?: string;
  borderColor?: string;
};

export const defaultLabelFontSize = 13;
export const defaultTickFontSize = 10;
export const defaultLegendFontSize = 12;

const nonEmptyString = (v: any): string | undefined =>
  typeof v === "string" && v.trim() !== "" ? v : undefined;

const positiveNumber = (v: any): number | undefined =>
  typeof v === "number" && isFinite(v) && v > 0 ? v : undefined;

export const viewStyleFromAttr = (attr: any): ViewStyle => {
  if (!attr || typeof attr !== "object") return {};
  return {
    labelFontSize: positiveNumber(attr["label_font_size"]),
    tickFontSize: positiveNumber(attr["tick_font_size"]),
    legendFontSize: positiveNumber(attr["legend_font_size"]),
    fontFamily: nonEmptyString(attr["font_family"]),
    textColor: nonEmptyString(attr["text_color"]),
    backgroundColor: nonEmptyString(attr["background_color"]),
    gridlineColor: nonEmptyString(attr["gridline_color"]),
    minorGridlineColor: nonEmptyString(attr["minor_gridline_color"]),
    titleFontSize: positiveNumber(attr["title_font_size"]),
    titleColor: nonEmptyString(attr["title_color"]),
    titleBackgroundColor: nonEmptyString(attr["title_background_color"]),
    colormap: nonEmptyString(attr["colormap"]),
    borderColor: nonEmptyString(attr["border_color"]),
  };
};

// A canvas font string; defaultFamily is the view's own family when the
// style sets none
export const viewStyleFromGroup = (zarrGroup: { attrs: any }): ViewStyle =>
  viewStyleFromAttr(zarrGroup.attrs["style"]);

export const canvasFont = (
  size: number,
  style: ViewStyle | undefined,
  defaultFamily: string = "sans-serif",
) => `${size}px ${style?.fontFamily ?? defaultFamily}`;
