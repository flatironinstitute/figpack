"""
Core functionality for viewing figures locally
"""

import pathlib
import socket
import sys
import tarfile
import tempfile
import threading
import webbrowser
from typing import Union

from ._server_manager import CORSRequestHandler, ThreadingHTTPServer


def serve_files(
    tmpdir: str,
    *,
    port: Union[int, None],
    open_in_browser: bool = False,
    allow_origin: Union[str, None] = None,
):
    """
    Serve files from a directory using a simple HTTP server.

    Args:
        tmpdir: Directory to serve
        port: Port number for local server
        open_in_browser: Whether to open in browser automatically
        allow_origin: CORS allow origin header
    """
    # if port is None, find a free port
    if port is None:
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


def view_figure(figure_path: str, port: Union[int, None] = None) -> None:
    """
    Extract and serve a figure archive locally

    Args:
        figure_path: Path to a .tar.gz archive file or a directory
        port: Optional port number to serve on
    """
    figure_pathlib = pathlib.Path(figure_path)

    if not figure_pathlib.exists():
        print(f"Error: Archive file not found: {figure_path}")
        sys.exit(1)

    if figure_pathlib.is_dir():
        # We assume it's a directory
        serve_files(
            str(figure_pathlib),
            port=port,
            open_in_browser=True,
            allow_origin=None,
        )
        return

    if not figure_pathlib.suffix.lower() in [".gz", ".tgz"] or not str(
        figure_pathlib
    ).endswith(".tar.gz"):
        print(f"Error: Archive file must be a .tar.gz file: {figure_path}")
        sys.exit(1)

    print(f"Extracting figure archive: {figure_path}")

    # Create temporary directory and extract files
    with tempfile.TemporaryDirectory(prefix="figpack_view_") as temp_dir:
        temp_path = pathlib.Path(temp_dir)

        try:
            with tarfile.open(figure_path, "r:gz") as tar:
                tar.extractall(temp_path)

            # Count extracted files
            extracted_files = list(temp_path.rglob("*"))
            file_count = len([f for f in extracted_files if f.is_file()])
            print(f"Extracted {file_count} files")

            # Check if index.html exists
            index_html = temp_path / "index.html"
            if not index_html.exists():
                print("Warning: No index.html found in archive")
                print("Available files:")
                for f in sorted(extracted_files):
                    if f.is_file():
                        print(f"  {f.relative_to(temp_path)}")

            # Serve the files
            serve_files(
                str(temp_path),
                port=port,
                open_in_browser=True,
                allow_origin=None,
            )

        except tarfile.TarError as e:
            print(f"Error: Failed to extract archive: {e}")
            sys.exit(1)
