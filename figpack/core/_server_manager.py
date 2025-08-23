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
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204, "No Content")
        self.end_headers()

    def log_message(self, fmt, *args):
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

    def create_figure_subdir(self) -> pathlib.Path:
        """Create a unique subdirectory for a figure within the process temp dir."""
        temp_dir = self.get_temp_dir()
        figure_id = str(uuid.uuid4())[:8]  # Short unique ID
        figure_dir = temp_dir / f"figure_{figure_id}"
        figure_dir.mkdir(exist_ok=True)
        return figure_dir

    def start_server(
        self, port: Optional[int] = None, allow_origin: Optional[str] = None
    ) -> tuple[str, int]:
        """
        Start the server if not already running, or return existing server info.

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

        # Configure handler with directory and allow_origin
        def handler_factory(*args, **kwargs):
            return CORSRequestHandler(
                *args, directory=str(temp_dir), allow_origin=allow_origin, **kwargs
            )

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

        print(f"Started figpack server at http://localhost:{port} serving {temp_dir}")

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
