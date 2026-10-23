// Screenshots of the remix preview. The preview is a cross-origin
// (sandboxed) iframe, so this app cannot read its pixels; instead a script
// in the page captures it with html-to-image and posts the image back.
//
// Before capturing, the script waits for the page to load and for its
// network activity (fetch, XMLHttpRequest and other resource loads) to
// stay idle for a while, so that the figure's data has arrived and been
// drawn, up to a time limit.

export const CAPTURE_REQUEST_TYPE = "figpack-remix-capture";
export const CAPTURE_RESULT_TYPE = "figpack-remix-capture-result";

export type CaptureRequest = {
  type: typeof CAPTURE_REQUEST_TYPE;
  requestId: string;
  maxWaitMs: number;
  idleMs: number;
  maxWidth: number;
  // Source of the html-to-image library, loaded into the page on first use
  librarySource: string;
};

export type CaptureResult = {
  requestId: string;
  dataUrl: string | null;
  error: string | null;
  waitedMs: number;
  idle: boolean;
  pendingRequests: number;
  width: number;
  height: number;
};

// Results come from the agent-written page, so check their shape
export const parseCaptureResult = (data: unknown): CaptureResult | null => {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  if (d.type !== CAPTURE_RESULT_TYPE || typeof d.requestId !== "string") {
    return null;
  }
  const dataUrl =
    typeof d.dataUrl === "string" && d.dataUrl.startsWith("data:image/jpeg;")
      ? d.dataUrl
      : null;
  const num = (v: unknown) => (typeof v === "number" && isFinite(v) ? v : 0);
  return {
    requestId: d.requestId,
    dataUrl,
    error: typeof d.error === "string" ? d.error.slice(0, 500) : null,
    waitedMs: num(d.waitedMs),
    idle: d.idle === true,
    pendingRequests: num(d.pendingRequests),
    width: num(d.width),
    height: num(d.height),
  };
};

// Runs in the remix page from the start, so that it sees all requests
export const CAPTURE_CLIENT_JS = `
(function () {
  var REQUEST = ${JSON.stringify(CAPTURE_REQUEST_TYPE)};
  var RESULT = ${JSON.stringify(CAPTURE_RESULT_TYPE)};
  var inFlight = 0;
  var lastActivity = Date.now();
  function begin() { inFlight++; lastActivity = Date.now(); }
  function end() { inFlight = Math.max(0, inFlight - 1); lastActivity = Date.now(); }
  var origFetch = window.fetch;
  window.fetch = function () {
    begin();
    var p;
    try { p = origFetch.apply(this, arguments); } catch (e) { end(); throw e; }
    return p.then(function (r) { end(); return r; }, function (e) { end(); throw e; });
  };
  var origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function () {
    begin();
    this.addEventListener("loadend", end);
    return origSend.apply(this, arguments);
  };
  // Other resource loads (scripts, images, ...) show up as resource timing
  // entries; keep them all so that their count keeps changing
  try { performance.setResourceTimingBufferSize(1000000); } catch (e) {}
  function resourceCount() {
    try { return performance.getEntriesByType("resource").length; } catch (e) { return 0; }
  }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function frame() { return new Promise(function (r) { requestAnimationFrame(function () { r(); }); }); }
  function loadLibrary(source) {
    if (window.htmlToImage) return;
    var s = document.createElement("script");
    s.textContent = source;
    document.head.appendChild(s);
    s.remove();
    if (!window.htmlToImage) throw new Error("Could not load the screenshot library");
  }
  async function capture(req) {
    var start = Date.now();
    var deadline = start + req.maxWaitMs;
    while (document.readyState !== "complete" && Date.now() < deadline) await sleep(100);
    var idle = false;
    var count = resourceCount();
    while (Date.now() < deadline) {
      var c = resourceCount();
      if (c !== count) { count = c; lastActivity = Date.now(); }
      if (inFlight === 0 && Date.now() - lastActivity >= req.idleMs) { idle = true; break; }
      await sleep(100);
    }
    var waitedMs = Date.now() - start;
    var pending = inFlight;
    await frame();
    await frame();
    loadLibrary(req.librarySource);
    var width = document.documentElement.clientWidth;
    var height = document.documentElement.clientHeight;
    var ratio = Math.min(1, req.maxWidth / width);
    var canvas = await window.htmlToImage.toCanvas(document.documentElement, {
      width: width, height: height, pixelRatio: ratio, backgroundColor: "white"
    });
    return {
      dataUrl: canvas.toDataURL("image/jpeg", 0.8),
      waitedMs: waitedMs, idle: idle, pendingRequests: pending,
      width: canvas.width, height: canvas.height
    };
  }
  window.addEventListener("message", function (e) {
    var req = e.data;
    if (e.source !== parent || !req || req.type !== REQUEST) return;
    capture(req).then(function (r) {
      r.type = RESULT; r.requestId = req.requestId; r.error = null;
      parent.postMessage(r, "*");
    }, function (err) {
      parent.postMessage({ type: RESULT, requestId: req.requestId, dataUrl: null, error: String(err), waitedMs: 0, idle: false, pendingRequests: inFlight }, "*");
    });
  });
})();
`;

export const loadCaptureLibrarySource = async () =>
  (await import("html-to-image/dist/html-to-image.js?raw")).default;
