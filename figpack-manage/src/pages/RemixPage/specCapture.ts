// Spec capture for the remix preview. The page's spec script may have been
// edited into JavaScript that is not pure JSON, so rather than parsing the
// HTML, a script injected at the start of the page wraps figpack.render
// (defined by the figure bundle) and posts each spec it receives to this app.

export const SPEC_MESSAGE_TYPE = "figpack-remix-spec";

export type SpecMessage =
  | { ok: true; spec: Record<string, unknown> }
  | { ok: false; error: string };

// Messages come from the agent-written page, so check their shape
export const parseSpecMessage = (data: unknown): SpecMessage | null => {
  if (!data || typeof data !== "object") return null;
  const d = data as { type?: unknown; spec?: unknown; error?: unknown };
  if (d.type !== SPEC_MESSAGE_TYPE) return null;
  if (typeof d.error === "string") return { ok: false, error: d.error };
  if (!d.spec || typeof d.spec !== "object" || Array.isArray(d.spec)) {
    return null;
  }
  return { ok: true, spec: d.spec as Record<string, unknown> };
};

// Runs in the remix page, before any of its own scripts. The bundle sets
// window.figpack = { ...window.figpack, render }, so a setter on window
// sees the render function as soon as it is defined.
export const SPEC_CLIENT_JS = `
(function () {
  var TYPE = ${JSON.stringify(SPEC_MESSAGE_TYPE)};
  function post(msg) {
    msg.type = TYPE;
    try { parent.postMessage(msg, "*"); } catch (e) {}
  }
  function wrap(fp) {
    if (!fp || typeof fp.render !== "function" || fp.render.__figpackRemixWrapped) return fp;
    var orig = fp.render;
    var render = function (spec) {
      var copy;
      try { copy = JSON.parse(JSON.stringify(spec)); } catch (e) { copy = undefined; }
      if (copy && typeof copy === "object" && !Array.isArray(copy)) post({ spec: copy });
      else post({ error: "figpack.render was called with a spec that is not a JSON object" });
      return orig.apply(this, arguments);
    };
    render.__figpackRemixWrapped = true;
    fp.render = render;
    return fp;
  }
  var current = wrap(window.figpack);
  try {
    Object.defineProperty(window, "figpack", {
      configurable: true,
      enumerable: true,
      get: function () { return current; },
      set: function (v) { current = wrap(v); },
    });
  } catch (e) {}
})();
`;
