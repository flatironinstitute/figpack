"""
Core functionality for editing a remote figure locally

Downloads the figure's index.html into a local directory and serves that
directory on localhost. Requests for files that are not present locally
(data.zarr/, assets/, extension .js files, ...) are proxied to the remote
figure, so the edited page reads the same underlying data via relative paths.

Served .html pages get a small client script injected (not written to disk)
that reloads the page when local files change and forwards the browser
console to a log file, so that an AI agent can see errors from its edits.
"""

import datetime
import http.server
import json
import pathlib
import socket
import threading
from typing import Union
from urllib.parse import urljoin

import requests

from ._figure_utils import get_figure_base_url
from ._server_manager import CORSRequestHandler

EDITS_DIR = pathlib.Path.home() / ".figpack" / "edits"

CONSOLE_LOG_FILENAME = ".console.log"

_ENDPOINT_PREFIX = "/__figpack_edit__/"

# Headers passed through from the remote response to the browser
_PASSTHROUGH_RESPONSE_HEADERS = [
    "Content-Type",
    "Content-Length",
    "Content-Range",
    "Accept-Ranges",
    "Content-Encoding",
    "Last-Modified",
    "ETag",
]

_CLIENT_JS = r"""
(function () {
  var prefix = "/__figpack_edit__/";
  var page = location.pathname;

  // Forward console output and uncaught errors to the edit server
  var queue = [];
  var flushTimer = null;
  function flush() {
    flushTimer = null;
    if (!queue.length) return;
    var entries = queue;
    queue = [];
    fetch(prefix + "log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entries),
      keepalive: true,
    }).catch(function () {});
  }
  function format(arg) {
    if (typeof arg === "string") return arg;
    if (arg instanceof Error) return arg.stack || String(arg);
    try { return JSON.stringify(arg); } catch (e) { return String(arg); }
  }
  function push(level, args) {
    var text = Array.prototype.map.call(args, format).join(" ");
    if (text.length > 4000) text = text.slice(0, 4000) + " ...[truncated]";
    queue.push({ level: level, page: page, text: text });
    if (!flushTimer) flushTimer = setTimeout(flush, 200);
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
  push("page-load", ["--- page loaded: " + location.href + " ---"]);

  // Reload when local files change
  var version = null;
  setInterval(function () {
    fetch(prefix + "version").then(function (r) { return r.text(); }).then(function (v) {
      if (version === null) version = v;
      else if (v !== version) location.reload();
    }).catch(function () {});
  }, 1000);
})();
"""

_CLIENT_SCRIPT_TAG = f'<script src="{_ENDPOINT_PREFIX}client.js"></script>'


def _local_files_version(local_dir: pathlib.Path) -> str:
    """A string that changes whenever a (non-hidden) local file is added, removed or modified"""
    parts = []
    for p in sorted(local_dir.rglob("*")):
        rel = p.relative_to(local_dir)
        if any(part.startswith(".") for part in rel.parts) or not p.is_file():
            continue
        st = p.stat()
        parts.append(f"{rel}:{st.st_mtime_ns}:{st.st_size}")
    return str(hash("\n".join(parts)))


def _inject_client_script(html: str) -> str:
    lower = html.lower()
    idx = lower.find("<head>")
    if idx >= 0:
        idx += len("<head>")
        return html[:idx] + "\n    " + _CLIENT_SCRIPT_TAG + html[idx:]
    return _CLIENT_SCRIPT_TAG + html


def _make_handler(
    local_dir: pathlib.Path, remote_base_url: str, console_log_path: pathlib.Path
):
    log_lock = threading.Lock()

    # CORSRequestHandler serves local files with support for Range requests
    class EditFigureRequestHandler(CORSRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(local_dir), **kwargs)

        def end_headers(self):
            # Local files change while editing; don't let the browser cache them
            self.send_header("Cache-Control", "no-store")
            super().end_headers()

        def do_GET(self):
            self._handle(head_only=False)

        def do_HEAD(self):
            self._handle(head_only=True)

        def do_POST(self):
            if self.path == _ENDPOINT_PREFIX + "log":
                self._handle_log()
            else:
                self.send_error(404)

        def _handle(self, *, head_only: bool):
            if self.path.startswith(_ENDPOINT_PREFIX):
                self._handle_endpoint(head_only=head_only)
                return
            local_path = pathlib.Path(self.translate_path(self.path))
            if local_path.is_dir():
                local_path = local_path / "index.html"
            if local_path.is_file():
                if local_path.suffix == ".html":
                    self._send_html(local_path, head_only=head_only)
                elif head_only:
                    super().do_HEAD()
                else:
                    super().do_GET()
                return
            self._proxy(head_only=head_only)

        def _handle_endpoint(self, *, head_only: bool):
            name = self.path[len(_ENDPOINT_PREFIX) :].split("?")[0]
            if name == "client.js":
                self._send_bytes(
                    _CLIENT_JS.encode("utf-8"),
                    "application/javascript",
                    head_only=head_only,
                )
            elif name == "version":
                self._send_bytes(
                    _local_files_version(local_dir).encode("utf-8"),
                    "text/plain",
                    head_only=head_only,
                )
            else:
                self.send_error(404)

        def _send_html(self, path: pathlib.Path, *, head_only: bool):
            html = path.read_text(encoding="utf-8", errors="replace")
            self._send_bytes(
                _inject_client_script(html).encode("utf-8"),
                "text/html; charset=utf-8",
                head_only=head_only,
            )

        def _send_bytes(self, content: bytes, content_type: str, *, head_only: bool):
            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(content)))
            self.end_headers()
            if not head_only:
                self.wfile.write(content)

        def _handle_log(self):
            length = int(self.headers.get("Content-Length", "0"))
            try:
                entries = json.loads(self.rfile.read(length))
            except ValueError:
                self.send_error(400)
                return
            now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            lines = []
            for e in entries if isinstance(entries, list) else []:
                if not isinstance(e, dict):
                    continue
                lines.append(
                    f"{now} [{e.get('level')}] {e.get('page')}: {e.get('text')}\n"
                )
            with log_lock:
                with console_log_path.open("a", encoding="utf-8") as f:
                    f.writelines(lines)
            self.send_response(204)
            self.end_headers()

        def _proxy(self, *, head_only: bool):
            rel_path = self.path.lstrip("/")
            remote_url = urljoin(remote_base_url, rel_path)
            headers = {}
            if "Range" in self.headers:
                headers["Range"] = self.headers["Range"]
            try:
                resp = requests.request(
                    "HEAD" if head_only else "GET",
                    remote_url,
                    headers=headers,
                    stream=True,
                    timeout=60,
                )
            except requests.RequestException as e:
                self.send_error(502, f"Error fetching {remote_url}: {e}")
                return
            try:
                self.send_response(resp.status_code)
                for h in _PASSTHROUGH_RESPONSE_HEADERS:
                    if h in resp.headers:
                        self.send_header(h, resp.headers[h])
                self.end_headers()
                if not head_only:
                    # raw stream so that Content-Encoding/Content-Length stay consistent
                    for chunk in iter(lambda: resp.raw.read(65536), b""):
                        self.wfile.write(chunk)
            except (BrokenPipeError, ConnectionResetError):
                pass
            finally:
                resp.close()

        def log_message(self, format, *args):
            pass

    return EditFigureRequestHandler


def edit_figure(
    figure_url: str,
    *,
    dir_path: Union[str, None] = None,
    port: Union[int, None] = None,
) -> None:
    """
    Download a figure's index.html and serve it locally for editing

    Args:
        figure_url: The figpack URL of the figure to edit
        dir_path: Local directory for the editable files (default: ~/.figpack/edits/<figure id>)
        port: Port number to serve on (default: auto-select)
    """
    remote_base_url = get_figure_base_url(figure_url)

    if dir_path is None:
        figure_id = remote_base_url.rstrip("/").split("/")[-1]
        local_dir = EDITS_DIR / figure_id
    else:
        local_dir = pathlib.Path(dir_path).resolve()
    local_dir.mkdir(parents=True, exist_ok=True)

    index_html = local_dir / "index.html"
    if index_html.exists():
        print(f"Using existing {index_html}")
    else:
        resp = requests.get(urljoin(remote_base_url, "index.html"), timeout=60)
        resp.raise_for_status()
        index_html.write_bytes(resp.content)
        print(f"Downloaded {index_html}")

    console_log_path = local_dir / CONSOLE_LOG_FILENAME
    console_log_path.write_text("", encoding="utf-8")

    if port is None:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind(("127.0.0.1", 0))
            port = s.getsockname()[1]

    handler = _make_handler(local_dir, remote_base_url, console_log_path)
    httpd = http.server.ThreadingHTTPServer(("127.0.0.1", port), handler)
    local_url = f"http://localhost:{port}/index.html"

    print(f"Serving {local_dir} at {local_url}")
    print(f"Files not in {local_dir} are fetched from {remote_base_url}")
    print("Pages reload when local files change.")
    print(f"Browser console output is written to {console_log_path}")
    print("")
    spec_note = ""
    if "data-figpack-spec" in index_html.read_text(encoding="utf-8", errors="replace"):
        spec_note = (
            "The figure's layout and settings are in the figpack.render(...) script at the end of the page, "
            "and the reference just above it documents the spec and the props of each view type. "
        )
    print("To edit with an AI agent, give it this line:")
    print("")
    print(
        f"Edit the figpack figure page {index_html} (preview: {local_url}). "
        f"{spec_note}"
        f"Files not in {local_dir} (data.zarr/, assets/, extension .js) are proxied from {remote_base_url}, "
        f"so keep relative references to them unchanged. "
        f"The open preview reloads on each edit, and its browser console is written to {console_log_path}; "
        f"check it for errors after each edit."
    )
    print("")
    print("Press Ctrl+C to stop.", flush=True)

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()
