import type { SpecNode } from "./remixPatch";

// Reading the figure spec script of a page, and finding the changes a remix
// makes outside of it (which a remix patch cannot carry)

// The spec script, <script type="module" data-figpack-spec>, but not the
// spec reference <script type="text/markdown" data-figpack-spec-docs>
const SPEC_SCRIPT_REGEX =
  /<script\b[^>]*\sdata-figpack-spec(?=[\s>=/])[^>]*>([\s\S]*?)<\/script>/i;
const SPEC_DOCS_SCRIPT_REGEX =
  /<script\b[^>]*\sdata-figpack-spec-docs(?=[\s>=/])[^>]*>[\s\S]*?<\/script>/i;

// The spec in a spec script written by figpack:
// figpack.render(<JSON spec>, { specVersion: 1 });
// Returns null if the script is anything else.
export const parseSpecScript = (script: string): SpecNode | null => {
  const m = /^figpack\.render\(([\s\S]*)\)\s*;?$/.exec(script.trim());
  if (!m) return null;
  const candidates = [m[1], m[1].replace(/,\s*\{[^{}]*\}\s*$/, "")];
  for (const c of candidates) {
    try {
      const spec = JSON.parse(c);
      if (spec && typeof spec === "object" && !Array.isArray(spec)) {
        return spec as SpecNode;
      }
    } catch {
      // try the next candidate
    }
  }
  return null;
};

export const getSpecScript = (html: string): string | null =>
  SPEC_SCRIPT_REGEX.exec(html)?.[1] ?? null;

// The spec of a page whose spec script was written by figpack
export const parseSpecFromHtml = (html: string): SpecNode | null => {
  const script = getSpecScript(html);
  return script === null ? null : parseSpecScript(script);
};

const MAX_DIFF_LINES = 3000;
const MAX_ITEM_CHARS = 300;

const pageLines = (html: string) =>
  html
    .replace(SPEC_SCRIPT_REGEX, "")
    .replace(SPEC_DOCS_SCRIPT_REGEX, "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l);

const summarize = (lines: string[]) => {
  const text = lines.join(" ");
  return text.length > MAX_ITEM_CHARS
    ? text.slice(0, MAX_ITEM_CHARS) + " ..."
    : text;
};

// Changes from the original page to the remix outside the spec script (the
// spec reference block is ignored, since figpack writes it anew), one item
// per changed run of lines, plus a note if the spec script itself contains
// code other than a JSON spec
export const findChangesOutsideSpec = (
  originalHtml: string,
  remixHtml: string,
): string[] => {
  const items: string[] = [];
  const script = getSpecScript(remixHtml);
  if (script === null) {
    items.push(
      "The page has no data-figpack-spec script; only the spec passed to figpack.render is in the patch",
    );
  } else if (parseSpecScript(script) === null) {
    items.push(
      "The spec script contains code besides the JSON spec; only the spec it passed to figpack.render is in the patch",
    );
  }
  const a = pageLines(originalHtml);
  const b = pageLines(remixHtml);
  if (a.length > MAX_DIFF_LINES || b.length > MAX_DIFF_LINES) {
    if (a.join("\n") !== b.join("\n")) {
      items.push("The page outside the spec script was changed");
    }
    return items;
  }
  // Longest common subsequence of lines, then runs of removed/added lines
  const n = a.length;
  const m = b.length;
  const lcs = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] =
        a[i] === b[j]
          ? lcs[i + 1][j + 1] + 1
          : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  let i = 0;
  let j = 0;
  let removed: string[] = [];
  let added: string[] = [];
  const flush = () => {
    if (removed.length && added.length) {
      items.push(`Changed: ${summarize(removed)} → ${summarize(added)}`);
    } else if (removed.length) {
      items.push(`Removed: ${summarize(removed)}`);
    } else if (added.length) {
      items.push(`Added: ${summarize(added)}`);
    }
    removed = [];
    added = [];
  };
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) {
      flush();
      i++;
      j++;
    } else if (j < m && (i >= n || lcs[i][j + 1] >= lcs[i + 1][j])) {
      added.push(b[j++]);
    } else {
      removed.push(a[i++]);
    }
  }
  flush();
  return items;
};
