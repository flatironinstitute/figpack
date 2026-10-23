// Console capture for the remix preview. A script injected at the start of
// the remix page forwards console output, uncaught errors and failed
// resource loads to this app with postMessage.

export const CONSOLE_MESSAGE_TYPE = "figpack-remix-console";

export type ConsoleLevel =
  | "log"
  | "info"
  | "warn"
  | "error"
  | "debug"
  | "uncaught"
  | "unhandledrejection"
  | "resource-error"
  | "page-load";

export type ConsoleEntry = {
  id: number;
  time: number;
  level: ConsoleLevel;
  text: string;
};

const LEVELS: ConsoleLevel[] = [
  "log",
  "info",
  "warn",
  "error",
  "debug",
  "uncaught",
  "unhandledrejection",
  "resource-error",
  "page-load",
];

const MAX_TEXT_LENGTH = 4000;

// Messages come from the agent-written page, so check their shape
export const parseConsoleMessage = (
  data: unknown,
): { level: ConsoleLevel; text: string } | null => {
  if (!data || typeof data !== "object") return null;
  const d = data as { type?: unknown; level?: unknown; text?: unknown };
  if (d.type !== CONSOLE_MESSAGE_TYPE) return null;
  if (!LEVELS.includes(d.level as ConsoleLevel)) return null;
  if (typeof d.text !== "string") return null;
  return {
    level: d.level as ConsoleLevel,
    text: d.text.slice(0, MAX_TEXT_LENGTH + 20),
  };
};

export const isErrorLevel = (level: ConsoleLevel) =>
  level === "error" ||
  level === "uncaught" ||
  level === "unhandledrejection" ||
  level === "resource-error";

// Runs in the remix page, before any of its own scripts
export const CONSOLE_CLIENT_JS = `
(function () {
  var TYPE = ${JSON.stringify(CONSOLE_MESSAGE_TYPE)};
  var MAX = ${MAX_TEXT_LENGTH};
  function format(arg) {
    if (typeof arg === "string") return arg;
    if (arg instanceof Error) return arg.stack || String(arg);
    try { return JSON.stringify(arg); } catch (e) { return String(arg); }
  }
  function push(level, args) {
    var text = Array.prototype.map.call(args, format).join(" ");
    if (text.length > MAX) text = text.slice(0, MAX) + " ...[truncated]";
    try { parent.postMessage({ type: TYPE, level: level, text: text }, "*"); } catch (e) {}
  }
  ["log", "info", "warn", "error", "debug"].forEach(function (level) {
    var orig = console[level];
    console[level] = function () {
      push(level, arguments);
      return orig.apply(console, arguments);
    };
  });
  window.addEventListener("error", function (e) {
    if (e.error) push("uncaught", [e.error]);
    else if (e.target && e.target !== window) push("resource-error", ["Failed to load " + (e.target.src || e.target.href)]);
    else push("uncaught", [e.message + " (" + e.filename + ":" + e.lineno + ")"]);
  }, true);
  window.addEventListener("unhandledrejection", function (e) {
    push("unhandledrejection", [e.reason]);
  });
  // Report fetch failures (including CORS errors) and HTTP error statuses,
  // except a 404 for the optional figpack.json and annotations.json
  function isOptional(url) {
    var path = url.split("?")[0];
    return /[/](figpack|annotations)[.]json$/.test(path);
  }
  var origFetch = window.fetch;
  window.fetch = function (input, init) {
    var url = typeof input === "string" ? input : (input && input.url) || String(input);
    return origFetch.apply(this, arguments).then(function (r) {
      if (r.status >= 400 && !(r.status === 404 && isOptional(r.url))) push("resource-error", ["fetch " + url + " returned HTTP " + r.status]);
      return r;
    }, function (err) {
      push("resource-error", ["fetch " + url + " failed: " + err]);
      throw err;
    });
  };
  push("page-load", ["--- page loaded ---"]);
})();
`;
