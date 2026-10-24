import { describe, expect, it } from "vitest";
import { describeSpecDiff, diffSpec, patchFileName } from "./remixPatch";
import {
  findChangesOutsideSpec,
  formatSpecJson,
  parseSpecFromHtml,
  replaceSpecInHtml,
} from "./specHtml";

const original = {
  props: { title: "Demo", direction: "horizontal", items: [{ name: "a" }] },
  children: {
    item_0: {
      props: { y_label: "V" },
      children: { s0: { props: { color: "blue" } } },
    },
  },
};

describe("diffSpec", () => {
  it("is empty for an unchanged spec", () => {
    expect(diffSpec(original, structuredClone(original))).toEqual({});
  });

  it("keeps only changed props, with whole list values", () => {
    const remixed = structuredClone(original);
    remixed.props.items = [{ name: "a" }, { name: "b" }];
    remixed.children.item_0.children.s0.props.color = "red";
    const diff = diffSpec(original, remixed);
    expect(diff).toEqual({
      props: { items: [{ name: "a" }, { name: "b" }] },
      children: { item_0: { children: { s0: { props: { color: "red" } } } } },
    });
    expect(describeSpecDiff(diff)).toEqual([
      "root: props.items",
      "item_0/s0: props.color",
    ]);
  });

  it("gives new children in full and records data and view_type", () => {
    const remixed = {
      ...structuredClone(original),
      children: {
        ...structuredClone(original.children),
        notes: { data: null, view_type: "Markdown", props: { content: "x" } },
      },
    };
    expect(diffSpec(original, remixed)).toEqual({
      children: {
        notes: { data: null, view_type: "Markdown", props: { content: "x" } },
      },
    });
  });

  it("ignores removed props and children", () => {
    expect(diffSpec(original, { props: { title: "Demo" } })).toEqual({});
  });
});

const page = (spec: string, extra = "") => `<!doctype html>
<html>
  <head>
    <title>figpack figure</title>${extra}
  </head>
  <body>
    <div id="root"></div>
    <script type="text/markdown" data-figpack-spec-docs>
# Figure spec reference
    </script>
    <script type="module" data-figpack-spec>
    ${spec}
    </script>
  </body>
</html>`;

describe("specHtml", () => {
  const json = JSON.stringify(original, null, 2);

  it("parses the spec written by figpack", () => {
    const html = page(`figpack.render(${json}, { specVersion: 1 });`);
    expect(parseSpecFromHtml(html)).toEqual(original);
  });

  it("finds no changes when only the spec and its reference changed", () => {
    const a = page(`figpack.render(${json}, { specVersion: 1 });`);
    const b = page(
      `figpack.render({"props": {}}, { specVersion: 1 });`,
    ).replace("# Figure spec reference", "# Edited reference");
    expect(findChangesOutsideSpec(a, b)).toEqual([]);
  });

  it("lists changes outside the spec script", () => {
    const a = page(`figpack.render(${json}, { specVersion: 1 });`);
    const b = page(
      `const s = ${json};\n    s.props.title = "X";\n    figpack.render(s);`,
      "\n    <style>body { background: black; }</style>",
    );
    expect(findChangesOutsideSpec(a, b)).toEqual([
      "The spec script contains code besides the JSON spec; only the spec it passed to figpack.render is in the patch",
      "Added: <style>body { background: black; }</style>",
    ]);
  });
});

describe("formatSpecJson", () => {
  it("formats like figpack's Python format_spec_json", () => {
    const value = {
      props: {
        title: "T",
        items: [
          { name: "item_0", title: "x".repeat(60) },
          { name: "item_1", title: "y".repeat(60) },
        ],
      },
      children: { a: { props: { c: [1, 2], d: null, e: true } } },
    };
    // format_spec_json(value, indent=4) in figpack/core/_figure_spec.py
    const expected =
      '{\n      "props": {\n        "title": "T",\n        "items": [\n          {"name": "item_0", "title": "' +
      "x".repeat(60) +
      '"},\n          {"name": "item_1", "title": "' +
      "y".repeat(60) +
      '"}\n        ]\n      },\n      "children": {"a": {"props": {"c": [1, 2], "d": null, "e": true}}}\n    }';
    expect(formatSpecJson(value, 4)).toBe(expected);
  });
});

describe("replaceSpecInHtml", () => {
  it("replaces a spec script (even one with other code) with JSON", () => {
    const html = page(
      `const s = {"props": {}};\n    figpack.render(s, { specVersion: 1 });`,
    );
    const spec = { props: { title: "a </script> b" } };
    const out = replaceSpecInHtml(html, spec);
    expect(parseSpecFromHtml(out)).toEqual(spec);
    expect(out).toContain("<\\/script>");
    expect(findChangesOutsideSpec(html, out)).toEqual([]);
  });
});

describe("patchFileName", () => {
  it("makes a file name from the title", () => {
    expect(patchFileName("My Figure: v2")).toBe("my-figure-v2-remix.json");
    expect(patchFileName("")).toBe("figure-remix.json");
  });
});
