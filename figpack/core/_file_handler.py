import os
import pathlib
import urllib.parse
from http.server import SimpleHTTPRequestHandler
from typing import Optional

from ._server_manager import CORSRequestHandler


class FileUploadCORSRequestHandler(CORSRequestHandler):
    """
    Extended CORS request handler that supports PUT requests for file uploads.
    Only allows file operations within the served directory.
    """

    def __init__(
        self,
        *args,
        allow_origin=None,
        enable_file_upload=False,
        max_file_size=10 * 1024 * 1024,
        **kwargs,
    ):
        self.enable_file_upload = enable_file_upload
        self.max_file_size = max_file_size  # Default 10MB
        super().__init__(*args, allow_origin=allow_origin, **kwargs)

    def end_headers(self):
        if self.allow_origin is not None:
            self.send_header("Access-Control-Allow-Origin", self.allow_origin)
            self.send_header("Vary", "Origin")
            # Add PUT to allowed methods if file upload is enabled
            methods = "GET, HEAD, OPTIONS"
            if self.enable_file_upload:
                methods += ", PUT"
            self.send_header("Access-Control-Allow-Methods", methods)
            self.send_header(
                "Access-Control-Allow-Headers", "Content-Type, Range, Content-Length"
            )
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

        super(SimpleHTTPRequestHandler, self).end_headers()

    def do_PUT(self):
        """Handle PUT requests for file uploads."""
        if not self.enable_file_upload:
            self.send_error(405, "Method Not Allowed")
            return

        try:
            # Parse and validate the path
            file_path = self._get_safe_file_path()
            if file_path is None:
                return  # Error already sent

            # Check content length
            content_length = self._get_content_length()
            if content_length is None:
                return  # Error already sent

            # Determine if this will be a create or update
            is_new_file = not file_path.exists()

            # Read and write the file
            if self._write_file_content(file_path, content_length):
                # Send appropriate status code
                status_code = 201 if is_new_file else 200
                self.send_response(status_code)
                self.send_header("Content-Type", "application/json")
                self.end_headers()

                response_data = f'{{"status": "success", "path": "{file_path.relative_to(pathlib.Path(self.directory))}"}}'
                self.wfile.write(response_data.encode("utf-8"))

        except Exception as e:
            self.log_error(f"Error in PUT request: {e}")
            self.send_error(500, f"Internal Server Error: {str(e)}")

    def _get_safe_file_path(self) -> Optional[pathlib.Path]:
        """
        Parse and validate the requested file path.
        Returns None if the path is invalid or unsafe.
        """
        # Parse the URL path
        parsed_path = urllib.parse.urlparse(self.path).path

        # Remove leading slash and decode URL encoding
        relative_path = urllib.parse.unquote(parsed_path.lstrip("/"))

        # Prevent empty paths
        if not relative_path:
            self.send_error(400, "Bad Request: Empty file path")
            return None

        # Get the served directory
        served_dir = pathlib.Path(self.directory).resolve()

        # Construct the target file path
        target_path = served_dir / relative_path

        try:
            # Resolve the path to handle any .. or . components
            resolved_path = target_path.resolve()

            # Ensure the resolved path is within the served directory
            if not str(resolved_path).startswith(str(served_dir)):
                self.send_error(403, "Forbidden: Path outside served directory")
                return None

        except (OSError, ValueError) as e:
            self.send_error(400, f"Bad Request: Invalid path - {str(e)}")
            return None

        return resolved_path

    def _get_content_length(self) -> Optional[int]:
        """
        Get and validate the content length from headers.
        Returns None if invalid or too large.
        """
        content_length_header = self.headers.get("Content-Length")
        if not content_length_header:
            self.send_error(400, "Bad Request: Content-Length header required")
            return None

        try:
            content_length = int(content_length_header)
        except ValueError:
            self.send_error(400, "Bad Request: Invalid Content-Length")
            return None

        if content_length < 0:
            self.send_error(400, "Bad Request: Negative Content-Length")
            return None

        if content_length > self.max_file_size:
            self.send_error(
                413,
                f"Payload Too Large: Maximum file size is {self.max_file_size} bytes",
            )
            return None

        return content_length

    def _write_file_content(self, file_path: pathlib.Path, content_length: int) -> bool:
        """
        Write the request body content to the specified file.
        Returns True on success, False on failure (error already sent).
        """
        try:
            # Create parent directories if they don't exist
            file_path.parent.mkdir(parents=True, exist_ok=True)

            # Write the file content
            with open(file_path, "wb") as f:
                remaining = content_length
                while remaining > 0:
                    # Read in chunks to handle large files efficiently
                    chunk_size = min(8192, remaining)
                    chunk = self.rfile.read(chunk_size)

                    if not chunk:
                        # Unexpected end of data
                        self.send_error(400, "Bad Request: Incomplete data")
                        return False

                    f.write(chunk)
                    remaining -= len(chunk)

            return True

        except OSError as e:
            self.send_error(
                500, f"Internal Server Error: Could not write file - {str(e)}"
            )
            return False
        except Exception as e:
            self.send_error(500, f"Internal Server Error: {str(e)}")
            return False

    def log_message(self, format, *args):
        """Override to suppress default logging (same as parent class)."""
        pass
