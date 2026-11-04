import { ViewStyle } from "./viewStyle";

// Title bars and borders of layouts (Box, VerticalLayout). Item titles use
// title_font_size; the layout's own title is 2 px larger. color and
// fontFamily are undefined when the style sets none, so that the DOM title
// bars inherit the page's; the canvas* fields are for drawing exports.
export const titleBarStyle = (style: ViewStyle) => {
  const itemFontSize = style.titleFontSize ?? 12;
  return {
    itemFontSize,
    layoutFontSize: itemFontSize + 2,
    height: Math.max(30, Math.round(itemFontSize * 2.5)),
    background: style.titleBackgroundColor ?? "#f5f5f5",
    color: style.titleColor,
    canvasColor: style.titleColor ?? "#000",
    fontFamily: style.fontFamily,
    canvasFontFamily: style.fontFamily ?? "sans-serif",
    border: style.borderColor ?? "#ddd",
  };
};
