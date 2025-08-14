import os

from typing import Union
import tempfile

import webbrowser

import pathlib

import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

from .figpack_view import FigpackView
from ._bundle_utils import prepare_figure_bundle

thisdir = pathlib.Path(__file__).parent.resolve()


def _show_view(
    view: FigpackView,
    *,
    open_in_browser: bool = False,
    port: Union[int, None] = None,
    allow_origin: Union[str, None] = None,
):
    with tempfile.TemporaryDirectory(prefix="figpack_") as tmpdir:
        prepare_figure_bundle(view, tmpdir)

        serve_files(
            tmpdir,
            port=port,
            open_in_browser=open_in_browser,
            allow_origin=allow_origin,
        )


class CORSRequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, allow_origin=None, **kwargs):
        self.allow_origin = allow_origin
        super().__init__(*args, **kwargs)

    # Serve only GET/HEAD/OPTIONS; add CORS headers on every response
    def end_headers(self):
        if self.allow_origin is not None:
            self.send_header("Access-Control-Allow-Origin", self.allow_origin)
            self.send_header("Vary", "Origin")
            self.send_header("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type, Range")
            self.send_header(
                "Access-Control-Expose-Headers",
                "Accept-Ranges, Content-Encoding, Content-Length, Content-Range",
            )
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204, "No Content")
        self.end_headers()

    def log_message(self, fmt, *args):
        pass


def serve_files(
    tmpdir: str,
    *,
    port: Union[int, None],
    open_in_browser: bool = False,
    allow_origin: Union[str, None] = None,
):
    # if port is None, find a free port
    if port is None:
        import socket

        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind(("", 0))
            port = s.getsockname()[1]

    tmpdir = pathlib.Path(tmpdir)
    tmpdir = tmpdir.resolve()
    if not tmpdir.exists() or not tmpdir.is_dir():
        raise SystemExit(f"Directory not found: {tmpdir}")

    # Configure handler with directory and allow_origin
    def handler_factory(*args, **kwargs):
        return CORSRequestHandler(
            *args, directory=str(tmpdir), allow_origin=allow_origin, **kwargs
        )

    httpd = ThreadingHTTPServer(("0.0.0.0", port), handler_factory)
    print(f"Serving {tmpdir} at http://localhost:{port} (CORS → {allow_origin})")
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()

    if open_in_browser:
        webbrowser.open(f"http://localhost:{port}")
        print(f"Opening http://localhost:{port} in your browser.")
    else:
        print(
            f"Open http://localhost:{port} in your browser to view the visualization."
        )

    try:
        input("Press Enter to stop...\n")
    except (KeyboardInterrupt, EOFError):
        pass
    finally:
        print("Shutting down server...")
        httpd.shutdown()
        httpd.server_close()
        thread.join()
