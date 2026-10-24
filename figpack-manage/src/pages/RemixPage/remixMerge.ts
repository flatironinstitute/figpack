import {
  REMIX_PATCH_VERSION,
  type RemixPatch,
  type SpecNode,
} from "./remixPatch";

// Merging a remix patch into a figure spec, with the same rules as figpack's
// Python implementation (figpack/core/_remix_patch.py):
//
// - props replace per key (whole values; lists and objects are not merged)
// - children merge by name
// - data and view_type replace; a data path must exist in data.zarr
//
// Parts that do not match the figure are skipped with a warning: a child
// that is neither in the spec nor a subgroup in data.zarr (unless the patch
// gives it its own data), a data path that does not exist, or a value of the
// wrong type. Both implementations run the shared cases in
// tests/remix_patch_cases, so keep them in step.

type Json = { [key: string]: unknown };

const NODE_KEYS = ["data", "view_type", "props", "children"];

const isObject = (x: unknown): x is Json =>
  !!x && typeof x === "object" && !Array.isArray(x);

// A remix patch file's contents, checked (throws if it is not a patch)
export const parseRemixPatch = (value: unknown): RemixPatch => {
  if (!isObject(value) || !("figpack_remix_patch" in value)) {
    throw new Error("Not a remix patch (missing figpack_remix_patch)");
  }
  const version = value.figpack_remix_patch;
  if (!Number.isInteger(version) || (version as number) > REMIX_PATCH_VERSION) {
    throw new Error(
      `Remix patch version ${version} is not supported here (supports ${REMIX_PATCH_VERSION})`,
    );
  }
  if (!isObject(value.patch))
    throw new Error("Remix patch has no 'patch' object");
  return value as RemixPatch;
};

// The paths of the groups in data.zarr ("" for the root), from its
// consolidated metadata
export const groupPathsFromZmetadata = (zmetadata: unknown): Set<string> => {
  const paths = new Set<string>([""]);
  const metadata = isObject(zmetadata) ? zmetadata.metadata : undefined;
  if (!isObject(metadata)) throw new Error("Invalid data.zarr/.zmetadata");
  for (const key of Object.keys(metadata)) {
    if (key === ".zgroup") continue;
    if (key.endsWith("/.zgroup")) paths.add(key.slice(0, -"/.zgroup".length));
  }
  return paths;
};

export const mergeRemixPatch = (
  spec: SpecNode,
  patch: SpecNode,
  groupPaths: Set<string>,
): { merged: SpecNode; warnings: string[] } => {
  const warnings: string[] = [];
  const merged = mergeNode(spec, patch as Json, "", "", groupPaths, warnings);
  return { merged, warnings };
};

const normalizePath = (path: string) => path.replace(/^\/+|\/+$/g, "");

const where = (specPath: string) => specPath || "root";

const mergeNode = (
  node: SpecNode,
  patch: Json,
  base: string | null,
  specPath: string,
  groupPaths: Set<string>,
  warnings: string[],
): SpecNode => {
  // base: path of the node's counterpart group in data.zarr, if any
  const at = where(specPath);
  const result: SpecNode = structuredClone(node);
  for (const key of Object.keys(patch)) {
    if (!NODE_KEYS.includes(key)) {
      warnings.push(`remix: unknown key '${key}' at '${at}'; skipped`);
    }
  }
  if ("data" in patch) {
    const data = patch.data;
    if (data === null) {
      result.data = null;
    } else if (
      typeof data === "string" &&
      groupPaths.has(normalizePath(data))
    ) {
      result.data = data;
    } else if (typeof data === "string") {
      warnings.push(
        `remix: data path '${data}' at '${at}' is not in data.zarr; skipped`,
      );
    } else {
      warnings.push(`remix: data at '${at}' is not a string; skipped`);
    }
  }
  if ("view_type" in patch) {
    if (typeof patch.view_type === "string") {
      result.view_type = patch.view_type;
    } else {
      warnings.push(`remix: view_type at '${at}' is not a string; skipped`);
    }
  }
  if ("props" in patch) {
    if (isObject(patch.props)) {
      result.props = { ...(result.props || {}), ...patch.props };
    } else {
      warnings.push(`remix: props at '${at}' is not an object; skipped`);
    }
  }
  if ("data" in result) {
    base = result.data === null ? null : normalizePath(result.data as string);
  }
  if ("children" in patch) {
    if (isObject(patch.children)) {
      const children = result.children || {};
      for (const [name, childPatch] of Object.entries(patch.children)) {
        const childPath = specPath ? `${specPath}/${name}` : name;
        if (!isObject(childPatch)) {
          warnings.push(
            `remix: child '${where(childPath)}' is not an object; skipped`,
          );
          continue;
        }
        let counterpart: string | null = null;
        if (base !== null) {
          const p = base ? `${base}/${name}` : name;
          counterpart = groupPaths.has(p) ? p : null;
        }
        if (!(name in children) && counterpart === null) {
          if (!hasOwnData(childPatch, groupPaths)) {
            warnings.push(`remix: no child '${name}' under '${at}'; skipped`);
            continue;
          }
        }
        children[name] = mergeNode(
          children[name] || {},
          childPatch,
          counterpart,
          childPath,
          groupPaths,
          warnings,
        );
      }
      if (Object.keys(children).length) result.children = children;
    } else {
      warnings.push(`remix: children at '${at}' is not an object; skipped`);
    }
  }
  return result;
};

// Whether a patch node defines its own base: data null (a node defined only
// by the spec) or an existing data path
const hasOwnData = (patch: Json, groupPaths: Set<string>) => {
  if (!("data" in patch)) return false;
  const data = patch.data;
  return (
    data === null ||
    (typeof data === "string" && groupPaths.has(normalizePath(data)))
  );
};

// One patch followed by another, as a single patch: props by key, children
// by name, data and view_type replaced (no checks against a figure)
export const composePatches = (first: SpecNode, second: SpecNode): SpecNode => {
  const result: SpecNode = structuredClone(first);
  if ("data" in second) result.data = second.data;
  if ("view_type" in second) result.view_type = second.view_type;
  if (second.props) result.props = { ...(result.props || {}), ...second.props };
  if (second.children) {
    const children = result.children || {};
    for (const [name, child] of Object.entries(second.children)) {
      children[name] = composePatches(children[name] || {}, child);
    }
    result.children = children;
  }
  return result;
};
