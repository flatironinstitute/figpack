import {
  describeSpecDiff,
  makeRemixPatch,
  patchFileName,
  type RemixPatch,
  type SpecNode,
} from "./remixPatch";
import { composePatches } from "./remixMerge";
import {
  findChangesOutsideSpec,
  getRemixRecord,
  parseSpecFromHtml,
} from "./specHtml";

export type PatchExport = {
  patch: RemixPatch;
  fileName: string;
  // What the patch changes, one line per node
  changes: string[];
  // Changes in the remix that the patch does not carry
  leftOut: string[];
  // If the figure was made with a remix patch: that patch's file name (it
  // is included in this patch)
  includesPatch: string | null;
};

// The patch from the figure's original spec (in its index.html, written by
// figpack as pure JSON) to the spec that the remixed page rendered. If the
// figure was itself made with a remix patch, that patch comes first, so the
// result reproduces the remix from a figure made without a patch.
export const prepareExport = async (
  remixedSpec: SpecNode,
  html: string,
  figureDirUrl: string,
): Promise<PatchExport> => {
  const indexUrl = figureDirUrl + "index.html";
  const response = await fetch(indexUrl, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(
      `Could not load the figure's index.html (HTTP ${response.status})`,
    );
  }
  const indexHtml = await response.text();
  const original = parseSpecFromHtml(indexHtml);
  if (!original) {
    throw new Error(
      "Could not read the figure spec in the figure's index.html",
    );
  }
  const patch = makeRemixPatch(original, remixedSpec, indexUrl);
  const record = getRemixRecord(indexHtml);
  if (record) patch.patch = composePatches(record.patch, patch.patch);
  const title = remixedSpec.props?.title ?? original.props?.title;
  return {
    patch,
    fileName: patchFileName(typeof title === "string" ? title : undefined),
    changes: describeSpecDiff(patch.patch),
    leftOut: findChangesOutsideSpec(indexHtml, html),
    includesPatch: record ? record.file || "unnamed patch" : null,
  };
};

export const downloadJson = (value: unknown, fileName: string) => {
  const blob = new Blob([JSON.stringify(value, null, 2) + "\n"], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
