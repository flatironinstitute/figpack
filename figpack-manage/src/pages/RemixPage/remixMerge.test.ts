import { describe, expect, it } from "vitest";
import type { SpecNode } from "./remixPatch";
import {
  composePatches,
  groupPathsFromZmetadata,
  mergeRemixPatch,
  parseRemixPatch,
} from "./remixMerge";

// Merge cases shared with figpack's Python tests (tests/test_remix_patch.py)
type MergeCase = {
  description: string;
  spec: SpecNode;
  zarr_groups: string[];
  patch: SpecNode;
  expected: SpecNode;
  warnings: string[];
};

const cases = import.meta.glob<MergeCase>(
  "../../../../tests/remix_patch_cases/*.json",
  { eager: true, import: "default" },
);

describe("mergeRemixPatch (shared cases)", () => {
  it("finds the shared cases", () => {
    expect(Object.keys(cases).length).toBeGreaterThan(5);
  });
  for (const [path, c] of Object.entries(cases)) {
    it(`${path.split("/").pop()}: ${c.description}`, () => {
      const before = JSON.stringify(c.spec);
      const { merged, warnings } = mergeRemixPatch(
        c.spec,
        c.patch,
        new Set(c.zarr_groups),
      );
      expect(merged).toEqual(c.expected);
      expect(warnings).toEqual(c.warnings);
      expect(JSON.stringify(c.spec)).toBe(before);
    });
  }
});

describe("parseRemixPatch", () => {
  it("accepts a patch and rejects other files", () => {
    const patch = { figpack_remix_patch: 1, patch: { props: { a: 1 } } };
    expect(parseRemixPatch(patch)).toBe(patch);
    expect(() => parseRemixPatch({ patch: {} })).toThrow("Not a remix patch");
    expect(() =>
      parseRemixPatch({ figpack_remix_patch: 2, patch: {} }),
    ).toThrow("not supported");
    expect(() => parseRemixPatch({ figpack_remix_patch: 1 })).toThrow(
      "no 'patch'",
    );
  });
});

describe("groupPathsFromZmetadata", () => {
  it("lists the groups", () => {
    const zmetadata = {
      metadata: {
        ".zgroup": {},
        ".zattrs": {},
        "item_0/.zgroup": {},
        "item_0/Graph 1/.zgroup": {},
        "item_0/Graph 1/t/.zarray": {},
      },
    };
    expect(groupPathsFromZmetadata(zmetadata)).toEqual(
      new Set(["", "item_0", "item_0/Graph 1"]),
    );
  });
});

describe("composePatches", () => {
  it("applies the second patch over the first", () => {
    expect(
      composePatches(
        {
          props: { a: 1, b: [1] },
          children: { x: { props: { c: 1 } }, y: { data: "/y" } },
        },
        { props: { b: [2] }, children: { x: { props: { d: 2 } }, z: {} } },
      ),
    ).toEqual({
      props: { a: 1, b: [2] },
      children: {
        x: { props: { c: 1, d: 2 } },
        y: { data: "/y" },
        z: {},
      },
    });
  });
});
