"""
Tests for figpack upload bundle functionality
"""

import pytest
import tempfile
import pathlib
import json
import hashlib
from unittest.mock import Mock, patch, MagicMock, call
from datetime import datetime, timezone, timedelta
from concurrent.futures import Future

from figpack.core._upload_bundle import (
    _upload_bundle,
    _compute_deterministic_figure_id,
    _check_existing_figure,
    _find_available_figure_id,
    _upload_single_file,
    _upload_small_file,
    _upload_large_file,
    _determine_file_type,
    _determine_content_type,
    _is_zarr_chunk,
)


class TestComputeDeterministicFigureId:
    """Test _compute_deterministic_figure_id function"""

    def test_empty_directory(self, temp_dir):
        """Test with empty directory"""
        figure_id = _compute_deterministic_figure_id(temp_dir)
        assert isinstance(figure_id, str)
        assert len(figure_id) == 40  # SHA1 hash length

    def test_single_file(self, temp_dir):
        """Test with single file"""
        test_file = temp_dir / "test.txt"
        test_file.write_text("test content")

        figure_id = _compute_deterministic_figure_id(temp_dir)
        assert isinstance(figure_id, str)
        assert len(figure_id) == 40

    def test_multiple_files_deterministic(self, temp_dir):
        """Test that same files produce same figure ID"""
        # Create test files
        (temp_dir / "file1.txt").write_text("content1")
        (temp_dir / "file2.txt").write_text("content2")

        figure_id1 = _compute_deterministic_figure_id(temp_dir)
        figure_id2 = _compute_deterministic_figure_id(temp_dir)

        assert figure_id1 == figure_id2

    def test_different_content_different_id(self, temp_dir):
        """Test that different content produces different figure ID"""
        # First scenario
        (temp_dir / "test.txt").write_text("content1")
        figure_id1 = _compute_deterministic_figure_id(temp_dir)

        # Change content
        (temp_dir / "test.txt").write_text("content2")
        figure_id2 = _compute_deterministic_figure_id(temp_dir)

        assert figure_id1 != figure_id2

    def test_subdirectories(self, temp_dir):
        """Test with files in subdirectories"""
        subdir = temp_dir / "subdir"
        subdir.mkdir()
        (subdir / "nested.txt").write_text("nested content")

        figure_id = _compute_deterministic_figure_id(temp_dir)
        assert isinstance(figure_id, str)
        assert len(figure_id) == 40


class TestCheckExistingFigure:
    """Test _check_existing_figure function"""

    @patch("figpack.core._upload_bundle.requests.get")
    def test_figure_exists_completed(self, mock_get):
        """Test checking existing completed figure"""
        mock_response = Mock()
        mock_response.ok = True
        mock_response.json.return_value = {"status": "completed"}
        mock_get.return_value = mock_response

        result = _check_existing_figure("test_figure_id")

        assert result["exists"] is True
        assert result["status"] == "completed"
        mock_get.assert_called_once()

    @patch("figpack.core._upload_bundle.requests.get")
    def test_figure_exists_uploading(self, mock_get):
        """Test checking existing uploading figure"""
        mock_response = Mock()
        mock_response.ok = True
        mock_response.json.return_value = {"status": "uploading"}
        mock_get.return_value = mock_response

        result = _check_existing_figure("test_figure_id")

        assert result["exists"] is True
        assert result["status"] == "uploading"

    @patch("figpack.core._upload_bundle.requests.get")
    def test_figure_not_exists(self, mock_get):
        """Test checking non-existent figure"""
        mock_response = Mock()
        mock_response.ok = False
        mock_get.return_value = mock_response

        result = _check_existing_figure("test_figure_id")

        assert result["exists"] is False

    @patch("figpack.core._upload_bundle.requests.get")
    def test_network_error(self, mock_get):
        """Test network error during check"""
        mock_get.side_effect = Exception("Network error")

        result = _check_existing_figure("test_figure_id")

        assert result["exists"] is False


class TestFindAvailableFigureId:
    """Test _find_available_figure_id function"""

    @patch("figpack.core._upload_bundle._check_existing_figure")
    def test_base_id_available(self, mock_check):
        """Test when base figure ID is available"""
        mock_check.return_value = {"exists": False}

        figure_id, completed_id = _find_available_figure_id("base_id")

        assert figure_id == "base_id"
        assert completed_id is None
        mock_check.assert_called_once_with("base_id")

    @patch("figpack.core._upload_bundle._check_existing_figure")
    def test_base_id_completed(self, mock_check):
        """Test when base figure ID exists and is completed"""
        mock_check.return_value = {"exists": True, "status": "completed"}

        figure_id, completed_id = _find_available_figure_id("base_id")

        assert figure_id is None
        assert completed_id == "base_id"

    @patch("figpack.core._upload_bundle._check_existing_figure")
    def test_find_suffix_available(self, mock_check):
        """Test finding available ID with suffix"""
        # Base ID exists but not completed, first suffix is available
        mock_check.side_effect = [
            {"exists": True, "status": "uploading"},  # base_id
            {"exists": False},  # base_id-1
        ]

        figure_id, completed_id = _find_available_figure_id("base_id")

        assert figure_id == "base_id-1"
        assert completed_id is None
        assert mock_check.call_count == 2

    @patch("figpack.core._upload_bundle._check_existing_figure")
    def test_find_suffix_completed(self, mock_check):
        """Test finding completed ID with suffix"""
        # Base ID exists but not completed, first suffix is completed
        mock_check.side_effect = [
            {"exists": True, "status": "uploading"},  # base_id
            {"exists": True, "status": "completed"},  # base_id-1
        ]

        figure_id, completed_id = _find_available_figure_id("base_id")

        assert figure_id is None
        assert completed_id == "base_id-1"

    @patch("figpack.core._upload_bundle._check_existing_figure")
    def test_too_many_variants(self, mock_check):
        """Test exception when too many variants exist"""
        # All IDs exist and are not completed
        mock_check.return_value = {"exists": True, "status": "uploading"}

        with pytest.raises(Exception, match="Too many existing figure variants"):
            _find_available_figure_id("base_id")


class TestDetermineFileType:
    """Test _determine_file_type function"""

    def test_figpack_json(self):
        """Test figpack.json is small file"""
        assert _determine_file_type("figpack.json") == "small"

    def test_index_html(self):
        """Test index.html is small file"""
        assert _determine_file_type("index.html") == "small"

    def test_zarr_metadata_files(self):
        """Test zarr metadata files are small"""
        assert _determine_file_type("test.zattrs") == "small"
        assert _determine_file_type("test.zgroup") == "small"
        assert _determine_file_type("test.zarray") == "small"
        assert _determine_file_type("test.zmetadata") == "small"

    def test_html_files(self):
        """Test HTML files are small"""
        assert _determine_file_type("page.html") == "small"

    def test_zarr_chunks(self):
        """Test zarr chunks are large files"""
        assert _determine_file_type("data.zarr/0.0.1") == "large"
        assert _determine_file_type("data.zarr/1.2.3") == "large"

    def test_zarr_metadata_in_subdir(self):
        """Test zarr metadata in subdirectories are small"""
        assert _determine_file_type("data.zarr/group.zattrs") == "small"
        assert _determine_file_type("data.zarr/array.zarray") == "small"

    def test_assets_js_css(self):
        """Test assets JS/CSS files are large"""
        assert _determine_file_type("assets/main.js") == "large"
        assert _determine_file_type("assets/style.css") == "large"

    def test_default_large(self):
        """Test default case is large file"""
        assert _determine_file_type("random.bin") == "large"
        assert _determine_file_type("data.txt") == "large"


class TestIsZarrChunk:
    """Test _is_zarr_chunk function"""

    def test_valid_zarr_chunks(self):
        """Test valid zarr chunk patterns"""
        assert _is_zarr_chunk("0") is True
        assert _is_zarr_chunk("0.0") is True
        assert _is_zarr_chunk("0.0.1") is True
        assert _is_zarr_chunk("123.456.789") is True

    def test_invalid_zarr_chunks(self):
        """Test invalid zarr chunk patterns"""
        assert _is_zarr_chunk("") is False
        assert _is_zarr_chunk(".0") is False
        assert _is_zarr_chunk("0.") is False
        assert _is_zarr_chunk("0.a.1") is False
        assert _is_zarr_chunk("test.txt") is False


class TestDetermineContentType:
    """Test _determine_content_type function"""

    def test_json_files(self):
        """Test JSON content type"""
        assert _determine_content_type("test.json") == "application/json"
        assert _determine_content_type("data.zarr/test.zattrs") == "application/json"

    def test_html_files(self):
        """Test HTML content type"""
        assert _determine_content_type("index.html") == "text/html"

    def test_css_files(self):
        """Test CSS content type"""
        assert _determine_content_type("style.css") == "text/css"

    def test_js_files(self):
        """Test JavaScript content type"""
        assert _determine_content_type("script.js") == "application/javascript"

    def test_png_files(self):
        """Test PNG content type"""
        assert _determine_content_type("image.png") == "image/png"

    def test_default_content_type(self):
        """Test default content type"""
        assert _determine_content_type("unknown.xyz") == "application/octet-stream"


class TestUploadSmallFile:
    """Test _upload_small_file function"""

    @patch("figpack.core._upload_bundle.requests.post")
    def test_upload_small_file_success(self, mock_post):
        """Test successful small file upload"""
        mock_response = Mock()
        mock_response.ok = True
        mock_post.return_value = mock_response

        _upload_small_file("test_id", "test.json", '{"test": "data"}', "passcode")

        mock_post.assert_called_once()
        call_args = mock_post.call_args
        assert call_args[1]["json"]["content"] == '{"test": "data"}'
        assert call_args[1]["json"]["passcode"] == "passcode"

    @patch("figpack.core._upload_bundle.requests.post")
    def test_upload_small_file_failure(self, mock_post):
        """Test small file upload failure"""
        mock_response = Mock()
        mock_response.ok = False
        mock_response.status_code = 500
        mock_response.json.return_value = {"message": "Server error"}
        mock_post.return_value = mock_response

        with pytest.raises(Exception, match="Failed to upload test.json"):
            _upload_small_file("test_id", "test.json", '{"test": "data"}', "passcode")

    @patch("figpack.core._upload_bundle.requests.post")
    def test_upload_small_file_non_utf8(self, mock_post):
        """Test small file upload with non-UTF8 content"""
        # Create a string that contains invalid UTF-8 when encoded
        # Use a surrogate character that can't be encoded to UTF-8
        invalid_content = "\udcff"  # This is a surrogate character

        with pytest.raises(Exception, match="not UTF-8 encodable"):
            _upload_small_file("test_id", "test.json", invalid_content, "passcode")

        # Should not make any HTTP requests since it fails before that
        mock_post.assert_not_called()


class TestUploadLargeFile:
    """Test _upload_large_file function"""

    @patch("figpack.core._upload_bundle.requests.put")
    @patch("figpack.core._upload_bundle.requests.post")
    def test_upload_large_file_success(self, mock_post, mock_put, temp_dir):
        """Test successful large file upload"""
        # Create test file
        test_file = temp_dir / "test.bin"
        test_file.write_bytes(b"binary data")

        # Mock signed URL response
        mock_post_response = Mock()
        mock_post_response.ok = True
        mock_post_response.json.return_value = {
            "success": True,
            "signedUrl": "https://s3.example.com/signed-url",
        }
        mock_post.return_value = mock_post_response

        # Mock upload response
        mock_put_response = Mock()
        mock_put_response.ok = True
        mock_put.return_value = mock_put_response

        _upload_large_file("test_id", "test.bin", test_file, "passcode")

        # Verify signed URL request
        mock_post.assert_called_once()
        post_call_args = mock_post.call_args
        assert post_call_args[1]["json"]["size"] == 11  # len(b"binary data")

        # Verify file upload
        mock_put.assert_called_once()
        put_call_args = mock_put.call_args
        assert put_call_args[0][0] == "https://s3.example.com/signed-url"

    @patch("figpack.core._upload_bundle.requests.post")
    def test_upload_large_file_signed_url_failure(self, mock_post, temp_dir):
        """Test large file upload with signed URL failure"""
        test_file = temp_dir / "test.bin"
        test_file.write_bytes(b"binary data")

        mock_response = Mock()
        mock_response.ok = False
        mock_response.status_code = 400
        mock_response.json.return_value = {"message": "Bad request"}
        mock_post.return_value = mock_response

        with pytest.raises(Exception, match="Failed to get signed URL"):
            _upload_large_file("test_id", "test.bin", test_file, "passcode")

    @patch("figpack.core._upload_bundle.requests.put")
    @patch("figpack.core._upload_bundle.requests.post")
    def test_upload_large_file_upload_failure(self, mock_post, mock_put, temp_dir):
        """Test large file upload with upload failure"""
        test_file = temp_dir / "test.bin"
        test_file.write_bytes(b"binary data")

        # Mock successful signed URL response
        mock_post_response = Mock()
        mock_post_response.ok = True
        mock_post_response.json.return_value = {
            "success": True,
            "signedUrl": "https://s3.example.com/signed-url",
        }
        mock_post.return_value = mock_post_response

        # Mock failed upload response
        mock_put_response = Mock()
        mock_put_response.ok = False
        mock_put_response.status_code = 500
        mock_put.return_value = mock_put_response

        with pytest.raises(Exception, match="Failed to upload test.bin to signed URL"):
            _upload_large_file("test_id", "test.bin", test_file, "passcode")


class TestUploadSingleFile:
    """Test _upload_single_file function"""

    @patch("figpack.core._upload_bundle._upload_small_file")
    @patch("figpack.core._upload_bundle._determine_file_type")
    def test_upload_single_small_file(
        self, mock_determine_type, mock_upload_small, temp_dir
    ):
        """Test uploading single small file"""
        test_file = temp_dir / "test.json"
        test_file.write_text('{"test": "data"}')

        # Mock file type determination to return "small"
        mock_determine_type.return_value = "small"

        result = _upload_single_file("test_id", "test.json", test_file, "passcode")

        assert result == "test.json"
        mock_upload_small.assert_called_once_with(
            "test_id", "test.json", '{"test": "data"}', "passcode"
        )

    @patch("figpack.core._upload_bundle._upload_large_file")
    @patch("figpack.core._upload_bundle._determine_file_type")
    def test_upload_single_large_file(
        self, mock_determine_type, mock_upload_large, temp_dir
    ):
        """Test uploading single large file"""
        test_file = temp_dir / "test.bin"
        test_file.write_bytes(b"binary data")

        # Mock file type determination to return "large"
        mock_determine_type.return_value = "large"

        result = _upload_single_file("test_id", "test.bin", test_file, "passcode")

        assert result == "test.bin"
        mock_upload_large.assert_called_once_with(
            "test_id", "test.bin", test_file, "passcode"
        )


class TestUploadBundle:
    """Test _upload_bundle function"""

    @patch("figpack.core._upload_bundle._find_available_figure_id")
    @patch("figpack.core._upload_bundle._compute_deterministic_figure_id")
    def test_upload_bundle_existing_completed(
        self, mock_compute_id, mock_find_id, temp_dir
    ):
        """Test upload when figure already exists and is completed"""
        mock_compute_id.return_value = "base_figure_id"
        mock_find_id.return_value = (None, "completed_figure_id")

        result = _upload_bundle(str(temp_dir), "test_passcode")

        expected_url = (
            "https://figures.figpack.org/figures/default/completed_figure_id/index.html"
        )
        assert result == expected_url

    @patch("figpack.core._upload_bundle.ThreadPoolExecutor")
    @patch("figpack.core._upload_bundle.as_completed")
    @patch("figpack.core._upload_bundle._upload_small_file")
    @patch("figpack.core._upload_bundle._find_available_figure_id")
    @patch("figpack.core._upload_bundle._compute_deterministic_figure_id")
    def test_upload_bundle_success(
        self,
        mock_compute_id,
        mock_find_id,
        mock_upload_small,
        mock_as_completed,
        mock_executor_class,
        temp_dir,
    ):
        """Test successful bundle upload"""
        # Setup test files
        (temp_dir / "index.html").write_text("<html></html>")
        (temp_dir / "data.json").write_text('{"data": "test"}')

        # Setup mocks
        mock_compute_id.return_value = "base_figure_id"
        mock_find_id.return_value = ("new_figure_id", None)

        # Setup executor mock
        mock_executor = MagicMock()
        mock_executor_class.return_value.__enter__.return_value = mock_executor

        # Setup future mocks
        mock_future1 = Mock()
        mock_future1.result.return_value = "index.html"
        mock_future2 = Mock()
        mock_future2.result.return_value = "data.json"

        mock_executor.submit.side_effect = [mock_future1, mock_future2]
        mock_as_completed.return_value = [mock_future1, mock_future2]

        result = _upload_bundle(str(temp_dir), "test_passcode")

        expected_url = (
            "https://figures.figpack.org/figures/default/new_figure_id/index.html"
        )
        assert result == expected_url

        # Verify initial figpack.json upload
        assert mock_upload_small.call_count >= 3  # Initial, manifest, final

        # Verify parallel upload was set up
        mock_executor.submit.assert_called()
        assert mock_executor.submit.call_count == 2  # Two files excluding figpack.json

    @patch("figpack.core._upload_bundle.ThreadPoolExecutor")
    @patch("figpack.core._upload_bundle.as_completed")
    @patch("figpack.core._upload_bundle._upload_small_file")
    @patch("figpack.core._upload_bundle._find_available_figure_id")
    @patch("figpack.core._upload_bundle._compute_deterministic_figure_id")
    def test_upload_bundle_upload_failure(
        self,
        mock_compute_id,
        mock_find_id,
        mock_upload_small,
        mock_as_completed,
        mock_executor_class,
        temp_dir,
    ):
        """Test bundle upload with file upload failure"""
        # Setup test files
        (temp_dir / "index.html").write_text("<html></html>")

        # Setup mocks
        mock_compute_id.return_value = "base_figure_id"
        mock_find_id.return_value = ("new_figure_id", None)

        # Setup executor mock
        mock_executor = MagicMock()
        mock_executor_class.return_value.__enter__.return_value = mock_executor

        # Setup future mock that raises exception
        mock_future = Mock()
        mock_future.result.side_effect = Exception("Upload failed")

        mock_executor.submit.return_value = mock_future
        mock_as_completed.return_value = [mock_future]

        with pytest.raises(Exception, match="Upload failed"):
            _upload_bundle(str(temp_dir), "test_passcode")

    @patch("figpack.core._upload_bundle._upload_small_file")
    @patch("figpack.core._upload_bundle._find_available_figure_id")
    @patch("figpack.core._upload_bundle._compute_deterministic_figure_id")
    def test_upload_bundle_no_files(
        self, mock_compute_id, mock_find_id, mock_upload_small, temp_dir
    ):
        """Test bundle upload with no files to upload"""
        mock_compute_id.return_value = "base_figure_id"
        mock_find_id.return_value = ("new_figure_id", None)

        result = _upload_bundle(str(temp_dir), "test_passcode")

        expected_url = (
            "https://figures.figpack.org/figures/default/new_figure_id/index.html"
        )
        assert result == expected_url

        # Should still upload figpack.json and manifest.json
        assert mock_upload_small.call_count >= 2

    @patch("figpack.core._upload_bundle.time.time")
    @patch("figpack.core._upload_bundle.ThreadPoolExecutor")
    @patch("figpack.core._upload_bundle.as_completed")
    @patch("figpack.core._upload_bundle._upload_small_file")
    @patch("figpack.core._upload_bundle._find_available_figure_id")
    @patch("figpack.core._upload_bundle._compute_deterministic_figure_id")
    def test_upload_bundle_progress_update(
        self,
        mock_compute_id,
        mock_find_id,
        mock_upload_small,
        mock_as_completed,
        mock_executor_class,
        mock_time,
        temp_dir,
    ):
        """Test bundle upload with progress updates"""
        # Setup test files
        for i in range(5):
            (temp_dir / f"file{i}.txt").write_text(f"content{i}")

        # Setup mocks
        mock_compute_id.return_value = "base_figure_id"
        mock_find_id.return_value = ("new_figure_id", None)

        # Mock time to trigger progress update
        # Provide enough values for all the time.time() calls in the function
        mock_time.side_effect = [0, 0, 70, 70, 140, 140, 200, 200, 260, 260]

        # Setup executor mock
        mock_executor = MagicMock()
        mock_executor_class.return_value.__enter__.return_value = mock_executor

        # Setup future mocks
        futures = []
        for i in range(5):
            future = Mock()
            future.result.return_value = f"file{i}.txt"
            futures.append(future)

        mock_executor.submit.side_effect = futures
        mock_as_completed.return_value = futures

        result = _upload_bundle(str(temp_dir), "test_passcode")

        expected_url = (
            "https://figures.figpack.org/figures/default/new_figure_id/index.html"
        )
        assert result == expected_url

        # Should have uploaded progress update
        upload_calls = mock_upload_small.call_args_list
        progress_calls = [
            call for call in upload_calls if "upload_progress" in str(call)
        ]
        assert len(progress_calls) > 0
