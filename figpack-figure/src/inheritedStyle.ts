/* eslint-disable @typescript-eslint/no-explicit-any */
import { ZarrGroup } from "./figpack-interface";

// Makes the `style` attr cascade: each view group's style is its parent
// view's (effective) style with its own keys merged over it. So a style set
// on the root (or on a layout) applies to every view inside it, and views
// read the result from attrs.style as usual. Only groups with a view_type
// take part; data groups (e.g. the series of a TimeseriesGraph) are returned
// as they are.
export const withInheritedStyle = (
  group: ZarrGroup,
  parentStyle: { [key: string]: any } = {},
): ZarrGroup => {
  const ownStyle = asStyle(group.attrs["style"]);
  const style = { ...parentStyle, ...ownStyle };
  const attrs =
    Object.keys(style).length > 0 ? { ...group.attrs, style } : group.attrs;

  // Wrap each child once, so that repeated getGroup(name) calls return the
  // same group object
  const childCache: { [name: string]: Promise<ZarrGroup | undefined> } = {};

  return {
    ...group,
    attrs,
    getGroup: (name: string) => {
      if (!(name in childCache)) {
        childCache[name] = group
          .getGroup(name)
          .then((child) =>
            child && child.attrs["view_type"]
              ? withInheritedStyle(child, style)
              : child,
          );
      }
      return childCache[name];
    },
  };
};

const asStyle = (v: any): { [key: string]: any } =>
  v && typeof v === "object" && !Array.isArray(v) ? v : {};
