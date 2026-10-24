import { diffSpec, describeSpecDiff, type SpecNode } from "./remixPatch";
import {
  groupPathsFromZmetadata,
  mergeRemixPatch,
  parseRemixPatch,
} from "./remixMerge";
import { getSpecScript, parseSpecScript, replaceSpecInHtml } from "./specHtml";

export type PatchApplication = {
  html: string;
  // What changed in the spec, one line per node
  changes: string[];
  // Parts of the patch that were skipped
  warnings: string[];
  // Whether the spec script had code besides the JSON spec (now replaced)
  codeReplaced: boolean;
};

// Apply a remix patch file's text to the remix page: merge it into the spec
// the page rendered (with the same rules as figpack's remix=), then rewrite
// the spec script as JSON
export const applyPatchToRemix = async (
  patchText: string,
  renderedSpec: SpecNode,
  html: string,
  figureDirUrl: string,
): Promise<PatchApplication> => {
  let value: unknown;
  try {
    value = JSON.parse(patchText);
  } catch {
    throw new Error("The file is not JSON");
  }
  const patch = parseRemixPatch(value);
  const response = await fetch(figureDirUrl + "data.zarr/.zmetadata", {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(
      `Could not load data.zarr/.zmetadata (HTTP ${response.status})`,
    );
  }
  const groupPaths = groupPathsFromZmetadata(await response.json());
  const { merged, warnings } = mergeRemixPatch(
    renderedSpec,
    patch.patch,
    groupPaths,
  );
  const script = getSpecScript(html);
  return {
    html: replaceSpecInHtml(html, merged),
    changes: describeSpecDiff(diffSpec(renderedSpec, merged)),
    warnings,
    codeReplaced: script !== null && parseSpecScript(script) === null,
  };
};
