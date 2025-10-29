import atexit
import json
import os
import pathlib
import psutil
import shutil
import socket
import tempfile
import threading
import time
import uuid
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from typing import Optional, Union


class CORSRequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, allow_origin=None, **kwargs):
        self.allow_origin = allow_origin
        super().__init__(*args, **kwargs)

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

        # Always send Accept-Ranges header to indicate byte-range support
        self.send_header("Accept-Ranges", "bytes")

        # Prevent browser caching - important for when we are editing figures in place
        # This ensures the browser always fetches the latest version of files
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")

        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204, "No Content")
        self.end_headers()

    def do_PUT(self):
        """Reject PUT requests when file upload is not enabled."""
        self.send_error(405, "Method Not Allowed")

    def do_GET(self):
        """Handle GET requests with support for Range requests."""
        # Translate path and check if file exists
        path = self.translate_path(self.path)

        # Check if path is a file
        if not os.path.isfile(path):
            # Let parent class handle directories and 404s
            return super().do_GET()

        # Check for Range header
        range_header = self.headers.get("Range")

        if range_header is None:
            # No range request, use parent's implementation
            return super().do_GET()

        # Parse range header
        try:
            # Range header format: "bytes=start-end"
            if not range_header.startswith("bytes="):
                # Invalid range format, ignore and serve full file
                return super().do_GET()

            range_spec = range_header[6:]  # Remove "bytes=" prefix

            # Get file size
            file_size = os.path.getsize(path)

            # Parse range specification
            if "-" not in range_spec:
                # Invalid format
                self.send_error(400, "Invalid Range header")
                return

            range_parts = range_spec.split("-", 1)

            # Determine start and end positions
            if range_parts[0]:  # Start position specified
                start = int(range_parts[0])
                if range_parts[1]:  # End position also specified
                    end = int(range_parts[1])
                else:  # Open-ended range (e.g., "1024-")
                    end = file_size - 1
            else:  # Suffix range (e.g., "-500" means last 500 bytes)
                if not range_parts[1]:
                    self.send_error(400, "Invalid Range header")
                    return
                suffix_length = int(range_parts[1])
                start = max(0, file_size - suffix_length)
                end = file_size - 1

            # Validate range
            if start < 0 or end >= file_size or start > end:
                self.send_response(416, "Range Not Satisfiable")
                self.send_header("Content-Range", f"bytes */{file_size}")
                self.end_headers()
                return

            # Calculate content length
            content_length = end - start + 1

            # Guess content type
            import mimetypes

            content_type = mimetypes.guess_type(path)[0] or "application/octet-stream"

            # Send 206 Partial Content response
            self.send_response(206, "Partial Content")
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(content_length))
            self.send_header("Content-Range", f"bytes {start}-{end}/{file_size}")
            self.end_headers()

            # Send the requested byte range
            with open(path, "rb") as f:
                f.seek(start)
                remaining = content_length
                while remaining > 0:
                    chunk_size = min(8192, remaining)
                    chunk = f.read(chunk_size)
                    if not chunk:
                        break
                    self.wfile.write(chunk)
                    remaining -= len(chunk)

        except ValueError:
            # Invalid range values
            self.send_error(400, "Invalid Range header")
        except Exception as e:
            # Log error and return 500
            self.send_error(500, f"Internal Server Error: {str(e)}")

    def log_message(self, format, *args):
        pass


def _is_process_alive(pid: int) -> bool:
    """Check if a process with the given PID is still alive."""
    try:
        return psutil.pid_exists(pid)
    except Exception:
        return False


def _is_port_in_use(port: int) -> bool:
    """Check if a port is currently in use."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(1)
            result = s.connect_ex(("localhost", port))
            return result == 0
    except Exception:
        return False


def _cleanup_orphaned_directories():
    """Clean up orphaned figpack process directories."""
    temp_root = pathlib.Path(tempfile.gettempdir())

    for item in temp_root.iterdir():
        if item.is_dir() and item.name.startswith("figpack_process_"):
            process_info_file = item / "process_info.json"

            if process_info_file.exists():
                try:
                    with open(process_info_file, "r") as f:
                        info = json.load(f)

                    pid = info.get("pid")
                    port = info.get("port")

                    # Check if process is dead or port is not in use
                    process_dead = pid is None or not _is_process_alive(pid)
                    port_free = port is None or not _is_port_in_use(port)

                    if process_dead or port_free:
                        print(f"Cleaning up orphaned directory: {item}")
                        shutil.rmtree(item)

                except Exception as e:
                    # If we can't read the process info, assume it's orphaned
                    print(f"Cleaning up unreadable directory: {item} (error: {e})")
                    try:
                        shutil.rmtree(item)
                    except Exception:
                        pass
            else:
                # No process info file, likely orphaned
                print(f"Cleaning up directory without process info: {item}")
                try:
                    shutil.rmtree(item)
                except Exception:
                    pass


class ProcessServerManager:
    """
    Manages a single server and temporary directory per process.
    """

    _instance: Optional["ProcessServerManager"] = None
    _lock = threading.Lock()

    def __init__(self):
        self._temp_dir: Optional[pathlib.Path] = None
        self._server: Optional[ThreadingHTTPServer] = None
        self._server_thread: Optional[threading.Thread] = None
        self._port: Optional[int] = None
        self._allow_origin: Optional[str] = None
        self._monitor_thread: Optional[threading.Thread] = None
        self._stop_monitoring = threading.Event()

        # Register cleanup on process exit
        atexit.register(self._cleanup)

    @classmethod
    def get_instance(cls) -> "ProcessServerManager":
        """Get the singleton instance of the server manager."""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = cls()
        return cls._instance

    def get_temp_dir(self) -> pathlib.Path:
        """Get or create the process-level temporary directory."""
        if self._temp_dir is None:
            # Clean up orphaned directories before creating new one
            _cleanup_orphaned_directories()

            self._temp_dir = pathlib.Path(tempfile.mkdtemp(prefix="figpack_process_"))

            # Create process info file
            self._create_process_info_file()
        return self._temp_dir

    def create_figure_subdir(
        self, *, _local_figure_name: Optional[str] = None
    ) -> pathlib.Path:
        """Create a unique subdirectory for a figure within the process temp dir."""
        temp_dir = self.get_temp_dir()
        local_figure_name = (
            "figure_" + str(uuid.uuid4())[:8]
            if _local_figure_name is None
            else _local_figure_name
        )
        figure_dir = temp_dir / f"{local_figure_name}"
        figure_dir.mkdir(exist_ok=True)
        return figure_dir

    def start_server(
        self,
        port: Optional[int] = None,
        allow_origin: Optional[str] = None,
        enable_file_upload: bool = False,
        max_file_size: int = 10 * 1024 * 1024,
    ) -> tuple[str, int]:
        """
        Start the server if not already running, or return existing server info.

        Args:
            port: Port to bind to (auto-selected if None)
            allow_origin: CORS origin to allow (None for no CORS)
            enable_file_upload: Whether to enable PUT requests for file uploads
            max_file_size: Maximum file size in bytes for uploads (default 10MB)

        Returns:
            tuple: (base_url, port)
        """
        # If server is already running with compatible settings, return existing info
        if (
            self._server is not None
            and self._server_thread is not None
            and self._server_thread.is_alive()
            and (allow_origin is None or self._allow_origin == allow_origin)
        ):
            assert self._port is not None
            return f"http://localhost:{self._port}", self._port

        # Stop existing server if settings are incompatible
        if self._server is not None:
            self._stop_server()

        # Find available port if not specified
        if port is None:
            import socket

            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(("", 0))
                port = s.getsockname()[1]

        temp_dir = self.get_temp_dir()

        # Choose handler based on file upload requirement
        if enable_file_upload:
            from ._file_handler import FileUploadCORSRequestHandler

            def handler_factory_enable_upload(*args, **kwargs):
                return FileUploadCORSRequestHandler(
                    *args,
                    directory=str(temp_dir),
                    allow_origin=allow_origin,
                    enable_file_upload=True,
                    max_file_size=max_file_size,
                    **kwargs,
                )

            assert port is not None
            self._server = ThreadingHTTPServer(
                ("0.0.0.0", port), handler_factory_enable_upload
            )

        else:

            def handler_factory(*args, **kwargs):
                return CORSRequestHandler(
                    *args, directory=str(temp_dir), allow_origin=allow_origin, **kwargs
                )

            assert port is not None
            self._server = ThreadingHTTPServer(("0.0.0.0", port), handler_factory)
        self._port = port
        self._allow_origin = allow_origin

        # Start server in daemon thread
        self._server_thread = threading.Thread(
            target=self._server.serve_forever, daemon=True
        )
        self._server_thread.start()

        # Update process info file with port information
        self._update_process_info_file()

        # Start directory monitoring thread
        self._start_directory_monitor()

        return f"http://localhost:{port}", port

    def _stop_server(self):
        """Stop the current server."""
        if self._server is not None:
            self._server.shutdown()
            self._server.server_close()
            if self._server_thread is not None:
                self._server_thread.join(timeout=1.0)
            self._server = None
            self._server_thread = None
            self._port = None
            self._allow_origin = None

    def _create_process_info_file(self):
        """Create the process info file in the temporary directory."""
        if self._temp_dir is not None:
            process_info = {
                "pid": os.getpid(),
                "port": self._port,
                "created_at": time.time(),
            }

            process_info_file = self._temp_dir / "process_info.json"
            try:
                with open(process_info_file, "w") as f:
                    json.dump(process_info, f, indent=2)
            except Exception as e:
                print(f"Warning: Failed to create process info file: {e}")

    def _update_process_info_file(self):
        """Update the process info file with current port information."""
        if self._temp_dir is not None:
            process_info_file = self._temp_dir / "process_info.json"
            try:
                # Read existing info
                if process_info_file.exists():
                    with open(process_info_file, "r") as f:
                        process_info = json.load(f)
                else:
                    process_info = {"pid": os.getpid(), "created_at": time.time()}

                # Update with current port
                process_info["port"] = self._port
                process_info["updated_at"] = time.time()

                # Write back
                with open(process_info_file, "w") as f:
                    json.dump(process_info, f, indent=2)
            except Exception as e:
                print(f"Warning: Failed to update process info file: {e}")

    def _start_directory_monitor(self):
        """Start monitoring thread to detect if directory is deleted."""
        if self._monitor_thread is None or not self._monitor_thread.is_alive():
            self._stop_monitoring.clear()
            self._monitor_thread = threading.Thread(
                target=self._monitor_directory, daemon=True
            )
            self._monitor_thread.start()

    def _monitor_directory(self):
        """Monitor the temporary directory and stop server if it's deleted."""
        while not self._stop_monitoring.is_set():
            try:
                if self._temp_dir is not None and not self._temp_dir.exists():
                    print(
                        f"Temporary directory {self._temp_dir} was deleted, stopping server"
                    )
                    self._stop_server()
                    self._stop_monitoring.set()
                    break

                # Check every 5 seconds
                self._stop_monitoring.wait(5.0)

            except Exception as e:
                print(f"Warning: Error in directory monitor: {e}")
                break

    def _cleanup(self):
        """Cleanup server and temporary directory on process exit."""
        # Stop monitoring
        self._stop_monitoring.set()
        if self._monitor_thread is not None:
            self._monitor_thread.join(timeout=1.0)

        # Stop server
        self._stop_server()

        # Remove temporary directory
        if self._temp_dir is not None and self._temp_dir.exists():
            try:
                shutil.rmtree(self._temp_dir)
            except Exception as e:
                # Don't raise exceptions during cleanup
                print(
                    f"Warning: Failed to cleanup temporary directory {self._temp_dir}: {e}"
                )
            self._temp_dir = None
