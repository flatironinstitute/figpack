import os
import pathlib
import json
import pytest
from http.client import HTTPConnection
from figpack.core._server_manager import (
    ProcessServerManager,
    _is_process_alive,
)


def test_is_process_alive():
    # Test with current process
    assert _is_process_alive(os.getpid()) is True
    # Test with invalid PID
    assert _is_process_alive(999999) is False


def create_test_process_dir(
    temp_dir: pathlib.Path, pid: int = None, port: int = None
) -> pathlib.Path:
    dir_name = f"figpack_process_{os.getpid()}"
    process_dir = temp_dir / dir_name
    process_dir.mkdir()

    process_info = {"pid": pid if pid is not None else os.getpid(), "port": port}

    with open(process_dir / "process_info.json", "w") as f:
        json.dump(process_info, f)

    return process_dir


class TestProcessServerManager:
    @pytest.fixture
    def manager(self):
        manager = ProcessServerManager()
        yield manager
        manager._cleanup()

    def test_singleton_pattern(self):
        manager1 = ProcessServerManager.get_instance()
        manager2 = ProcessServerManager.get_instance()
        assert manager1 is manager2

    def test_temp_dir_creation(self, manager):
        temp_dir = manager.get_temp_dir()
        assert temp_dir.exists()
        assert temp_dir.is_dir()
        assert temp_dir.name.startswith("figpack_process_")

    def test_figure_subdir_creation(self, manager):
        subdir = manager.create_figure_subdir()
        assert subdir.exists()
        assert subdir.is_dir()
        assert subdir.parent == manager.get_temp_dir()

    def test_server_start_stop(self, manager):
        # Start server
        url, port = manager.start_server()
        assert url == f"http://localhost:{port}"

        # Verify server is running
        conn = HTTPConnection("localhost", port)
        try:
            conn.request("GET", "/")
            response = conn.getresponse()
            assert response.status == 200
        finally:
            conn.close()

        # Stop server
        manager._cleanup()

        # Verify server is stopped
        with pytest.raises(Exception):
            conn = HTTPConnection("localhost", port)
            conn.request("GET", "/")
            conn.getresponse()

    def test_cors_headers(self, manager):
        # Start server with CORS
        allow_origin = "http://example.com"
        url, port = manager.start_server(allow_origin=allow_origin)

        # Check CORS headers
        conn = HTTPConnection("localhost", port)
        try:
            conn.request("OPTIONS", "/")
            response = conn.getresponse()
            assert response.status == 204
            headers = dict(response.getheaders())
            assert headers["Access-Control-Allow-Origin"] == allow_origin
            assert "GET, HEAD, OPTIONS" in headers["Access-Control-Allow-Methods"]
        finally:
            conn.close()

    def test_process_info_file(self, manager):
        temp_dir = manager.get_temp_dir()
        info_file = temp_dir / "process_info.json"

        assert info_file.exists()

        with open(info_file) as f:
            info = json.load(f)
            assert info["pid"] == os.getpid()

        # Start server and verify port is updated
        url, port = manager.start_server()
        with open(info_file) as f:
            info = json.load(f)
            assert info["port"] == port

    def test_cleanup(self, manager):
        # Setup
        temp_dir = manager.get_temp_dir()
        url, port = manager.start_server()

        # Cleanup
        manager._cleanup()

        # Verify
        assert not temp_dir.exists()
        with pytest.raises(Exception):
            conn = HTTPConnection("localhost", port)
            conn.request("GET", "/")
            conn.getresponse()
