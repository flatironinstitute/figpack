import zarr
import tempfile

import pathlib

import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

from .views import TimeseriesGraph


def _show_view(view: TimeseriesGraph):
    with tempfile.TemporaryDirectory(prefix="figpack_") as tmpdir:
        zarr_group = zarr.open_group(
            pathlib.Path(tmpdir),
            mode="w",
            synchronizer=zarr.ThreadSynchronizer()
        )
        
        # Write the graph data to the Zarr group
        view._write_to_zarr_group(zarr_group)

        zarr.consolidate_metadata(zarr_group.store)

        serve_files(tmpdir, 3004)

ALLOW_ORIGIN = "http://localhost:5173"

class CORSRequestHandler(SimpleHTTPRequestHandler):
    # Serve only GET/HEAD/OPTIONS; add CORS headers on every response
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", ALLOW_ORIGIN)
        self.send_header("Vary", "Origin")
        self.send_header("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Range")
        self.send_header("Access-Control-Expose-Headers",
                         "Accept-Ranges, Content-Encoding, Content-Length, Content-Range")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204, "No Content")
        self.end_headers()

    # (Optional) quieter logging
    # def log_message(self, fmt, *args): pass

def serve_files(tmpdir: str, port: int):
    tmpdir = pathlib.Path(tmpdir)
    tmpdir = tmpdir.resolve()
    if not tmpdir.exists() or not tmpdir.is_dir():
        raise SystemExit(f"Directory not found: {tmpdir}")

    # Bind handler to the desired directory
    def handler_factory(*args, **kwargs):
        return CORSRequestHandler(*args, directory=str(tmpdir), **kwargs)

    httpd = ThreadingHTTPServer(("0.0.0.0", port), handler_factory)
    print(f"Serving {tmpdir} at http://localhost:{port} (CORS → {ALLOW_ORIGIN})")
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()

    try:
        input("Press Enter to stop...\n")
    except (KeyboardInterrupt, EOFError):
        pass
    finally:
        print("Shutting down server...")
        httpd.shutdown()
        httpd.server_close()
        thread.join()