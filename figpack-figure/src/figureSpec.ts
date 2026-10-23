/* eslint-disable @typescript-eslint/no-explicit-any */
import { useSyncExternalStore } from "react";
import { ZarrGroup } from "./figpack-interface";

// A figure spec lets a page (e.g. index.html) define the figure's view tree
// in a script, on top of the data in data.zarr:
//
//   <script type="module">
//     figpack.render({
//       props: { direction: "horizontal" },
//       children: {
//         item_0: { props: { y_label: "Voltage (mV)" } },
//       },
//     });
//   </script>
//
// Each spec node becomes a ZarrGroup that the existing view components
// consume unchanged: its attrs are the base group's attrs with `props`
// merged over them, and getGroup(name) returns the child spec node `name`
// if there is one (falling back to the base group's own subgroup).
//
// The base group of a node is:
//   - `data` if given: a path to a group in data.zarr (e.g. "/item_0")
//   - nothing if `data` is null (the node is defined entirely by the spec)
//   - otherwise its counterpart in the original figure: the root group for
//     the root node, or the parent base group's subgroup of the same name.
// The spec format version this bundle understands
export const FIGURE_SPEC_VERSION = 1;

export type FigureSpecNode = {
  data?: string | null;
  view_type?: string;
  props?: { [key: string]: any };
  children?: { [name: string]: FigureSpecNode };
};

type SpecState = {
  // false until the page's scripts have run, so that a figpack.render() call
  // in a module script after the bundle is seen before the first render
  ready: boolean;
  spec: FigureSpecNode | null;
  specError: string | null;
  version: number;
};

let state: SpecState = { ready: false, spec: null, specError: null, version: 0 };
const listeners = new Set<() => void>();

const setState = (s: SpecState) => {
  state = s;
  listeners.forEach((l) => l());
};

export const renderFigureSpec = (
  spec: FigureSpecNode,
  opts: { specVersion?: number } = {},
) => {
  const specVersion = opts.specVersion ?? FIGURE_SPEC_VERSION;
  const specError =
    specVersion > FIGURE_SPEC_VERSION
      ? `Figure spec version ${specVersion} is newer than this figpack-figure bundle supports (${FIGURE_SPEC_VERSION})`
      : null;
  if (specError) console.error(specError);
  setState({ ...state, spec, specError, version: state.version + 1 });
};

const markReady = () => {
  if (!state.ready) setState({ ...state, ready: true });
};
if (document.readyState === "complete") {
  markReady();
} else {
  document.addEventListener("DOMContentLoaded", markReady);
  window.addEventListener("load", markReady);
}

export const useFigureSpec = () =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
  );

export const resolveFigureSpec = async (
  root: ZarrGroup,
  spec: FigureSpecNode,
): Promise<ZarrGroup> => {
  return resolveNode(spec, root, async () => root, "spec:");
};

const resolveNode = async (
  node: FigureSpecNode,
  root: ZarrGroup,
  getCounterpart: () => Promise<ZarrGroup | undefined>,
  specPath: string,
): Promise<ZarrGroup> => {
  let base: ZarrGroup | undefined;
  if (node.data === null) {
    base = undefined;
  } else if (node.data !== undefined) {
    base = await root.file.getGroup(node.data);
    if (!base) {
      throw new Error(`Figure spec: group not found in data.zarr: ${node.data}`);
    }
  } else {
    base = await getCounterpart();
  }
  return makeSpecGroup(node, base, root, specPath);
};

const makeSpecGroup = (
  node: FigureSpecNode,
  base: ZarrGroup | undefined,
  root: ZarrGroup,
  specPath: string,
): ZarrGroup => {
  const attrs: { [key: string]: any } = { ...(base?.attrs || {}) };
  if (node.view_type) attrs["view_type"] = node.view_type;
  Object.assign(attrs, node.props || {});

  const children = node.children || {};
  const baseSubgroups = base?.subgroups || [];
  const subgroups = [
    ...baseSubgroups.map((sg) =>
      children[sg.name]
        ? { ...sg, attrs: { ...sg.attrs, ...(children[sg.name].props || {}) } }
        : sg,
    ),
    ...Object.keys(children)
      .filter((name) => !baseSubgroups.some((sg) => sg.name === name))
      .map((name) => ({
        name,
        path: `${specPath}/${name}`,
        attrs: children[name].props || {},
      })),
  ];

  const noData = (name: string) => {
    throw new Error(
      `Figure spec node ${specPath} has no data group (requested ${name})`,
    );
  };

  // Resolve each child once, so that repeated getGroup(name) calls return the
  // same group object
  const childCache: { [name: string]: Promise<ZarrGroup | undefined> } = {};

  return {
    file: base?.file || root.file,
    // keep the base path so that path-keyed state (e.g. annotations) and views
    // that use absolute paths keep working
    path: base?.path || specPath,
    subgroups,
    datasets: base?.datasets || [],
    attrs,
    getGroup: async (name: string) => {
      const child = children[name];
      if (!child) return base ? base.getGroup(name) : undefined;
      if (!(name in childCache)) {
        childCache[name] = resolveNode(
          child,
          root,
          async () => (base ? base.getGroup(name) : undefined),
          `${specPath}/${name}`,
        );
      }
      return childCache[name];
    },
    getDataset: async (name: string) =>
      base ? base.getDataset(name) : noData(name),
    getDatasetData: async (name: string, o: any) =>
      base ? base.getDatasetData(name, o) : noData(name),
  };
};
