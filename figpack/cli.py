"""
Command-line interface for figpack
"""

import argparse
import json
import pathlib
import socket
import sys
import tarfile
import tempfile
import threading
import webbrowser
from concurrent.futures import ThreadPoolExecutor, as_completed
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from typing import Dict, Tuple, Union
from urllib.parse import urljoin

import requests

from . import __version__
from .core._server_manager import CORSRequestHandler

MAX_WORKERS_FOR_DOWNLOAD = 16


def get_figure_base_url(figure_url: str) -> str:
    """
    Get the base URL from any figpack URL

    Args:
        figure_url: Any figpack URL (may or may not end with /index.html)

    Returns:
        str: The base URL for the figure directory
    """
    # Handle URLs that end with /index.html
    if figure_url.endswith("/index.html"):
        base_url = figure_url[:-11]  # Remove "/index.html"
    elif figure_url.endswith("/"):
        base_url = figure_url[:-1]  # Remove trailing slash
    else:
        # Assume it's already a directory URL
        base_url = figure_url

    # Ensure it ends with a slash for urljoin to work properly
    if not base_url.endswith("/"):
        base_url += "/"

    return base_url


def download_file(
    base_url: str, file_info: Dict, temp_dir: pathlib.Path
) -> Tuple[str, bool]:
    """
    Download a single file from the figure

    Args:
        base_url: The base URL for the figure
        file_info: Dictionary with 'path' and 'size' keys
        temp_dir: Temporary directory to download to

    Returns:
        Tuple of (file_path, success)
    """
    file_path = file_info["path"]
    file_url = urljoin(base_url, file_path)

    try:
        response = requests.get(file_url, timeout=30)
        response.raise_for_status()

        # Create directory structure if needed
        local_file_path = temp_dir / file_path
        local_file_path.parent.mkdir(parents=True, exist_ok=True)

        # Write file content
        if file_path.endswith(
            (
                ".json",
                ".html",
                ".css",
                ".js",
                ".zattrs",
                ".zgroup",
                ".zarray",
                ".zmetadata",
            )
        ):
            # Text files
            local_file_path.write_text(response.text, encoding="utf-8")
        else:
            # Binary files
            local_file_path.write_bytes(response.content)

        return file_path, True

    except Exception as e:
        print(f"Failed to download {file_path}: {e}")
        return file_path, False


def download_figure(figure_url: str, dest_path: str) -> None:
    """
    Download a figure from a figpack URL and save as tar.gz

    Args:
        figure_url: The figpack URL
        dest_path: Destination path for the tar.gz file
    """
    print(f"Downloading figure from: {figure_url}")

    # Get base URL
    base_url = get_figure_base_url(figure_url)
    print(f"Base URL: {base_url}")

    # Check if manifest.json exists
    manifest_url = urljoin(base_url, "manifest.json")
    print("Checking for manifest.json...")

    try:
        response = requests.get(manifest_url, timeout=10)
        response.raise_for_status()
        manifest = response.json()
        print(f"Found manifest with {len(manifest['files'])} files")
    except requests.exceptions.RequestException as e:
        print(f"Error: Could not retrieve manifest.json from {manifest_url}: {e}")
        print("Make sure the URL points to a valid figpack figure with a manifest.")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid manifest.json format: {e}")
        sys.exit(1)

    # Create temporary directory for downloads
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = pathlib.Path(temp_dir)

        # Download all files in parallel
        print(
            f"Downloading {len(manifest['files'])} files with up to {MAX_WORKERS_FOR_DOWNLOAD} concurrent downloads..."
        )

        downloaded_count = 0
        failed_files = []
        count_lock = threading.Lock()

        with ThreadPoolExecutor(max_workers=MAX_WORKERS_FOR_DOWNLOAD) as executor:
            # Submit all download tasks
            future_to_file = {
                executor.submit(
                    download_file, base_url, file_info, temp_path
                ): file_info["path"]
                for file_info in manifest["files"]
            }

            # Process completed downloads
            for future in as_completed(future_to_file):
                file_path = future_to_file[future]
                try:
                    downloaded_path, success = future.result()

                    with count_lock:
                        if success:
                            downloaded_count += 1
                            print(
                                f"Downloaded {downloaded_count}/{len(manifest['files'])}: {downloaded_path}"
                            )
                        else:
                            failed_files.append(downloaded_path)

                except Exception as e:
                    with count_lock:
                        failed_files.append(file_path)
                        print(f"Failed to download {file_path}: {e}")

        if failed_files:
            print(f"Warning: Failed to download {len(failed_files)} files:")
            for failed_file in failed_files:
                print(f"  - {failed_file}")

            if len(failed_files) == len(manifest["files"]):
                print("Error: Failed to download any files. Aborting.")
                sys.exit(1)

        # Save manifest.json to temp directory
        manifest_path = temp_path / "manifest.json"
        manifest_path.write_text(json.dumps(manifest, indent=2))
        print("Added manifest.json to bundle")

        # Create tar.gz file
        print(f"Creating tar.gz archive: {dest_path}")
        dest_pathlib = pathlib.Path(dest_path)
        dest_pathlib.parent.mkdir(parents=True, exist_ok=True)

        with tarfile.open(dest_path, "w:gz") as tar:
            # Add all downloaded files (excluding figpack.json if it exists)
            for file_path in temp_path.rglob("*"):
                if file_path.is_file():
                    arcname = file_path.relative_to(temp_path)
                    # Skip figpack.json as requested
                    if str(arcname) != "figpack.json":
                        tar.add(file_path, arcname=arcname)

        # Count files in archive (excluding directories)
        archive_files = [
            f for f in temp_path.rglob("*") if f.is_file() and f.name != "figpack.json"
        ]
        total_size = sum(f.stat().st_size for f in archive_files)

        print(f"Archive created successfully!")
        print(
            f"Total files: {len(archive_files)} (including manifest.json, excluding figpack.json)"
        )
        print(f"Total size: {total_size / (1024 * 1024):.2f} MB")
        print(f"Archive saved to: {dest_path}")


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


def view_figure(archive_path: str, port: Union[int, None] = None) -> None:
    """
    Extract and serve a figure archive locally

    Args:
        archive_path: Path to the tar.gz archive
        port: Optional port number to serve on
    """
    archive_pathlib = pathlib.Path(archive_path)

    if not archive_pathlib.exists():
        print(f"Error: Archive file not found: {archive_path}")
        sys.exit(1)

    if not archive_pathlib.suffix.lower() in [".gz", ".tgz"] or not str(
        archive_pathlib
    ).endswith(".tar.gz"):
        print(f"Error: Expected a .tar.gz file, got: {archive_path}")
        sys.exit(1)

    print(f"Extracting figure archive: {archive_path}")

    # Create temporary directory and extract files
    with tempfile.TemporaryDirectory(prefix="figpack_view_") as temp_dir:
        temp_path = pathlib.Path(temp_dir)

        try:
            with tarfile.open(archive_path, "r:gz") as tar:
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


def main():
    """Main CLI entry point"""
    parser = argparse.ArgumentParser(
        description="figpack - A Python package for creating shareable, interactive visualizations",
        prog="figpack",
    )
    parser.add_argument("--version", action="version", version=f"figpack {__version__}")

    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # Download command
    download_parser = subparsers.add_parser(
        "download", help="Download a figure from a figpack URL"
    )
    download_parser.add_argument("figure_url", help="The figpack URL to download")
    download_parser.add_argument("dest", help="Destination path for the tar.gz file")

    # View command
    view_parser = subparsers.add_parser(
        "view", help="Extract and serve a figure archive locally"
    )
    view_parser.add_argument("archive", help="Path to the tar.gz archive file")
    view_parser.add_argument(
        "--port", type=int, help="Port number to serve on (default: auto-select)"
    )

    args = parser.parse_args()

    if args.command == "download":
        download_figure(args.figure_url, args.dest)
    elif args.command == "view":
        view_figure(args.archive, port=args.port)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
