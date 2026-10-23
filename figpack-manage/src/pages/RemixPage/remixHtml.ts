import { CONSOLE_CLIENT_JS } from "./consoleCapture";
import { CAPTURE_CLIENT_JS } from "./screenshotCapture";

// Helpers for the in-memory remix page. A remix is a modified copy of a
// figure's page (index.html) that reuses the original figure's data and
// code; it is rendered in a sandboxed iframe via srcdoc.

// The figure directory URL (with trailing slash), with any trailing page
// name such as index.html removed
export const toFigureDirUrl = (figureUrl: string) => {
  const url = figureUrl.split("?")[0].split("#")[0];
  const lastSlash = url.lastIndexOf("/");
  if (url.slice(lastSlash + 1).endsWith(".html")) {
    return url.slice(0, lastSlash + 1);
  }
  return url.endsWith("/") ? url : url + "/";
};

// The URL of the page to remix: the page named in the figure URL (such as
// a saved remix-1.html), or the figure's index.html
export const toPageUrl = (figureUrl: string) => {
  const url = figureUrl.split("?")[0].split("#")[0];
  return url.endsWith(".html") ? url : toFigureDirUrl(url) + "index.html";
};

// Pages built with a figpack-figure bundle that supports remixing contain a
// figure spec script
export const hasFigureSpec = (html: string) =>
  html.includes("data-figpack-spec");

const escapeAttr = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

// Insert tags at the start of <head> (or at the start of the page if there
// is no <head>), so that they come before anything that loads resources
const insertAtHeadStart = (html: string, tags: string) => {
  const m = /<head(\s[^>]*)?>/i.exec(html);
  if (m) {
    const idx = m.index + m[0].length;
    return html.slice(0, idx) + "\n    " + tags + html.slice(idx);
  }
  return tags + html;
};

// The srcdoc for the preview iframe: the page with a <base href> pointing at
// the figure directory, so that ./assets/..., data.zarr/ and extension
// scripts load from the original figure, and the console and screenshot
// capture scripts
export const toSrcdoc = (html: string, figureDirUrl: string) =>
  insertAtHeadStart(
    html,
    `<base href="${escapeAttr(figureDirUrl)}">\n    <script>${CONSOLE_CLIENT_JS}</script>\n    <script>${CAPTURE_CLIENT_JS}</script>`,
  );
