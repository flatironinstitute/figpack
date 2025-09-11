import json
import os
import pathlib
import tempfile
import threading
import time
from http.client import HTTPConnection
from unittest.mock import patch

import pytest

from figpack.core._server_manager import ProcessServerManager


class TestFileUploadHandler:
    @pytest.fixture
    def manager(self):
        manager = ProcessServerManager()
        yield manager
        manager._cleanup()

    def test_file_upload_disabled_by_default(self, manager):
        """Test that PUT requests are rejected when file upload is disabled."""
        url, port = manager.start_server(enable_file_upload=False)

        conn = HTTPConnection("localhost", port)
        try:
            conn.request("PUT", "/test.txt", body=b"test content")
            response = conn.getresponse()
            assert response.status == 405  # Method Not Allowed
        finally:
            conn.close()

    def test_file_upload_enabled(self, manager):
        """Test that PUT requests work when file upload is enabled."""
        url, port = manager.start_server(enable_file_upload=True, allow_origin="*")

        test_content = b"Hello, World!"
        conn = HTTPConnection("localhost", port)
        try:
            # Upload a new file
            conn.request(
                "PUT",
                "/test.txt",
                body=test_content,
                headers={"Content-Length": str(len(test_content))},
            )
            response = conn.getresponse()
            assert response.status == 201  # Created

            response_data = json.loads(response.read().decode())
            assert response_data["status"] == "success"
            assert response_data["path"] == "test.txt"

            # Verify file was created
            temp_dir = manager.get_temp_dir()
            created_file = temp_dir / "test.txt"
            assert created_file.exists()
            assert created_file.read_bytes() == test_content

        finally:
            conn.close()

    def test_file_update(self, manager):
        """Test updating an existing file."""
        url, port = manager.start_server(enable_file_upload=True)

        # Create initial file
        temp_dir = manager.get_temp_dir()
        test_file = temp_dir / "existing.txt"
        test_file.write_text("original content")

        new_content = b"updated content"
        conn = HTTPConnection("localhost", port)
        try:
            # Update the existing file
            conn.request(
                "PUT",
                "/existing.txt",
                body=new_content,
                headers={"Content-Length": str(len(new_content))},
            )
            response = conn.getresponse()
            assert response.status == 200  # OK (updated)

            # Verify file was updated
            assert test_file.read_bytes() == new_content

        finally:
            conn.close()

    def test_subdirectory_creation(self, manager):
        """Test that subdirectories are created automatically."""
        url, port = manager.start_server(enable_file_upload=True)

        test_content = b"nested file content"
        conn = HTTPConnection("localhost", port)
        try:
            # Upload to a nested path
            conn.request(
                "PUT",
                "/subdir/nested/file.txt",
                body=test_content,
                headers={"Content-Length": str(len(test_content))},
            )
            response = conn.getresponse()
            assert response.status == 201

            # Verify nested directories and file were created
            temp_dir = manager.get_temp_dir()
            nested_file = temp_dir / "subdir" / "nested" / "file.txt"
            assert nested_file.exists()
            assert nested_file.read_bytes() == test_content

        finally:
            conn.close()

    def test_path_traversal_protection(self, manager):
        """Test that directory traversal attacks are prevented."""
        url, port = manager.start_server(enable_file_upload=True)

        malicious_paths = [
            "/../../../etc/passwd",
            "/subdir/../../outside.txt",
            "/../outside.txt",
            "/./../../outside.txt",
        ]

        conn = HTTPConnection("localhost", port)
        try:
            for path in malicious_paths:
                conn.request(
                    "PUT",
                    path,
                    body=b"malicious content",
                    headers={"Content-Length": "17"},
                )
                response = conn.getresponse()
                assert response.status == 403  # Forbidden
                response.read()  # Consume response body

        finally:
            conn.close()

    def test_file_size_limit(self, manager):
        """Test that file size limits are enforced."""
        max_size = 1024  # 1KB limit
        url, port = manager.start_server(
            enable_file_upload=True, max_file_size=max_size
        )

        # Try to upload a file larger than the limit
        large_content = b"x" * (max_size + 1)
        conn = HTTPConnection("localhost", port)
        try:
            conn.request(
                "PUT",
                "/large.txt",
                body=large_content,
                headers={"Content-Length": str(len(large_content))},
            )
            response = conn.getresponse()
            assert response.status == 413  # Payload Too Large

        finally:
            conn.close()

    def test_missing_content_length(self, manager):
        """Test that requests without Content-Length header are rejected."""
        url, port = manager.start_server(enable_file_upload=True)

        conn = HTTPConnection("localhost", port)
        try:
            # Manually construct request without Content-Length header
            conn.putrequest("PUT", "/test.txt")
            conn.putheader("Content-Type", "text/plain")
            conn.endheaders()
            # Send body without Content-Length
            conn.send(b"test content")

            response = conn.getresponse()
            assert response.status == 400  # Bad Request

        finally:
            conn.close()

    def test_invalid_content_length(self, manager):
        """Test that invalid Content-Length values are rejected."""
        url, port = manager.start_server(enable_file_upload=True)

        invalid_lengths = ["not-a-number", "-1", ""]

        conn = HTTPConnection("localhost", port)
        try:
            for length in invalid_lengths:
                conn.request(
                    "PUT", "/test.txt", body=b"test", headers={"Content-Length": length}
                )
                response = conn.getresponse()
                assert response.status == 400  # Bad Request
                response.read()  # Consume response body

        finally:
            conn.close()

    def test_empty_path(self, manager):
        """Test that empty file paths are rejected."""
        url, port = manager.start_server(enable_file_upload=True)

        conn = HTTPConnection("localhost", port)
        try:
            conn.request("PUT", "/", body=b"content", headers={"Content-Length": "7"})
            response = conn.getresponse()
            assert response.status == 400  # Bad Request

        finally:
            conn.close()

    def test_cors_headers_with_put(self, manager):
        """Test that CORS headers include PUT when file upload is enabled."""
        allow_origin = "https://example.com"
        url, port = manager.start_server(
            enable_file_upload=True, allow_origin=allow_origin
        )

        conn = HTTPConnection("localhost", port)
        try:
            conn.request("OPTIONS", "/")
            response = conn.getresponse()
            headers = dict(response.getheaders())

            assert headers["Access-Control-Allow-Origin"] == allow_origin
            assert "PUT" in headers["Access-Control-Allow-Methods"]
            assert "Content-Length" in headers["Access-Control-Allow-Headers"]

        finally:
            conn.close()

    def test_cors_headers_without_put(self, manager):
        """Test that CORS headers don't include PUT when file upload is disabled."""
        allow_origin = "https://example.com"
        url, port = manager.start_server(
            enable_file_upload=False, allow_origin=allow_origin
        )

        conn = HTTPConnection("localhost", port)
        try:
            conn.request("OPTIONS", "/")
            response = conn.getresponse()
            headers = dict(response.getheaders())

            assert headers["Access-Control-Allow-Origin"] == allow_origin
            assert "PUT" not in headers["Access-Control-Allow-Methods"]

        finally:
            conn.close()

    def test_url_encoding_in_paths(self, manager):
        """Test that URL-encoded paths are handled correctly."""
        url, port = manager.start_server(enable_file_upload=True)

        # Test file with spaces and special characters
        test_content = b"special file content"
        encoded_path = "/my%20file%20with%20spaces%26symbols.txt"
        expected_filename = "my file with spaces&symbols.txt"

        conn = HTTPConnection("localhost", port)
        try:
            conn.request(
                "PUT",
                encoded_path,
                body=test_content,
                headers={"Content-Length": str(len(test_content))},
            )
            response = conn.getresponse()
            assert response.status == 201

            # Verify file was created with correct name
            temp_dir = manager.get_temp_dir()
            created_file = temp_dir / expected_filename
            assert created_file.exists()
            assert created_file.read_bytes() == test_content

        finally:
            conn.close()

    def test_concurrent_uploads(self, manager):
        """Test that concurrent file uploads work correctly."""
        url, port = manager.start_server(enable_file_upload=True)

        def upload_file(filename, content):
            conn = HTTPConnection("localhost", port)
            try:
                conn.request(
                    "PUT",
                    f"/{filename}",
                    body=content.encode(),
                    headers={"Content-Length": str(len(content))},
                )
                response = conn.getresponse()
                return response.status
            finally:
                conn.close()

        # Start multiple uploads concurrently
        threads = []
        results = []

        for i in range(5):
            content = f"Content for file {i}"
            thread = threading.Thread(
                target=lambda i=i, c=content: results.append(
                    upload_file(f"file{i}.txt", c)
                )
            )
            threads.append(thread)
            thread.start()

        # Wait for all uploads to complete
        for thread in threads:
            thread.join()

        # Verify all uploads succeeded
        assert all(status == 201 for status in results)

        # Verify all files were created
        temp_dir = manager.get_temp_dir()
        for i in range(5):
            file_path = temp_dir / f"file{i}.txt"
            assert file_path.exists()
            assert file_path.read_text() == f"Content for file {i}"
