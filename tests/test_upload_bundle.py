"""
Tests for figpack upload bundle functionality
"""

import json
import os
import pathlib
import tempfile
from unittest import mock

import pytest
from figpack.core._upload_bundle import (
    _determine_content_type,
    _compute_deterministic_figure_hash,
    _create_or_get_figure,
    _upload_single_file,
    _finalize_figure,
    _upload_bundle,
)


def test_determine_content_type():
    """Test content type determination for various file types"""
    assert _determine_content_type("test.json") == "application/json"
    assert _determine_content_type("test.html") == "text/html"
    assert _determine_content_type("test.css") == "text/css"
    assert _determine_content_type("test.js") == "application/javascript"
    assert _determine_content_type("test.png") == "image/png"
    assert _determine_content_type("test.zattrs") == "application/json"
    assert _determine_content_type("test.unknown") == "application/octet-stream"
    assert _determine_content_type("no_extension") == "application/octet-stream"


def test_compute_deterministic_figure_hash():
    """Test figure hash computation from directory contents"""
    with tempfile.TemporaryDirectory() as tmpdir:
        # Create some test files
        tmpdir_path = pathlib.Path(tmpdir)

        # Create file 1
        file1 = tmpdir_path / "test1.txt"
        file1.write_text("test content 1")

        # Create file 2 in subdirectory
        subdir = tmpdir_path / "subdir"
        subdir.mkdir()
        file2 = subdir / "test2.txt"
        file2.write_text("test content 2")

        # Compute hash
        hash1 = _compute_deterministic_figure_hash(tmpdir_path)

        # Hash should be 40 characters (SHA1)
        assert len(hash1) == 40

        # Same content should produce same hash
        hash2 = _compute_deterministic_figure_hash(tmpdir_path)
        assert hash1 == hash2

        # Different content should produce different hash
        file1.write_text("modified content")
        hash3 = _compute_deterministic_figure_hash(tmpdir_path)
        assert hash1 != hash3


@mock.patch("requests.post")
def test_create_or_get_figure_new(mock_post):
    """Test creating a new figure"""
    # Mock successful response
    mock_response = mock.Mock()
    mock_response.ok = True
    mock_response.json.return_value = {
        "success": True,
        "figure": {"figureUrl": "test-figure-url", "status": "pending"},
    }
    mock_post.return_value = mock_response

    result = _create_or_get_figure("test-hash", "test-api-key", 5, 1000)

    assert result["success"] == True
    assert result["figure"]["figureUrl"] == "test-figure-url"
    assert result["figure"]["status"] == "pending"

    # Verify API was called with correct data
    mock_post.assert_called_once()
    call_args = mock_post.call_args[1]["json"]
    assert call_args["figureHash"] == "test-hash"
    assert call_args["apiKey"] == "test-api-key"
    assert call_args["totalFiles"] == 5
    assert call_args["totalSize"] == 1000


@mock.patch("requests.post")
def test_create_or_get_figure_error(mock_post):
    """Test error handling when creating a figure"""
    # Mock error response
    mock_response = mock.Mock()
    mock_response.ok = True
    mock_response.json.return_value = {
        "success": False,
        "message": "Test error message",
    }
    mock_post.return_value = mock_response

    with pytest.raises(Exception) as exc_info:
        _create_or_get_figure("test-hash", "test-api-key")

    assert "Test error message" in str(exc_info.value)


@mock.patch("requests.post")
def test_finalize_figure(mock_post):
    """Test figure finalization"""
    # Mock successful response
    mock_response = mock.Mock()
    mock_response.ok = True
    mock_response.json.return_value = {
        "success": True,
        "figure": {"status": "completed"},
    }
    mock_post.return_value = mock_response

    result = _finalize_figure("test-figure-url", "test-api-key")

    assert result["success"] == True
    assert result["figure"]["status"] == "completed"

    # Verify API was called with correct data
    mock_post.assert_called_once()
    call_args = mock_post.call_args[1]["json"]
    assert call_args["figureUrl"] == "test-figure-url"
    assert call_args["apiKey"] == "test-api-key"


@mock.patch("requests.post")
def test_finalize_figure_error(mock_post):
    """Test error handling during figure finalization"""
    # Mock error response that fails HTTP check
    mock_response = mock.Mock()
    mock_response.ok = False
    mock_response.status_code = 500

    # Mock json method to simulate error response
    mock_response.json.side_effect = Exception("Invalid JSON")

    mock_post.return_value = mock_response

    with pytest.raises(Exception) as exc_info:
        _finalize_figure("test-figure-url", "test-api-key")

    assert "HTTP 500" in str(exc_info.value)


@mock.patch("requests.post")
@mock.patch("requests.put")
def test_upload_single_file_error(mock_put, mock_post):
    """Test error handling during file upload"""
    # Create a temporary file
    with tempfile.NamedTemporaryFile(suffix=".txt") as tmp_file:
        tmp_file.write(b"test content")
        tmp_file.flush()

        # Mock error response for signed URL request
        mock_post_response = mock.Mock()
        mock_post_response.ok = False
        mock_post_response.status_code = 403
        # Mock json method to simulate error response
        mock_post_response.json.side_effect = Exception("Invalid JSON")
        mock_post.return_value = mock_post_response

        # Test file upload failure
        with pytest.raises(Exception) as exc_info:
            _upload_single_file(
                "test-figure-url",
                "test.txt",
                pathlib.Path(tmp_file.name),
                "test-api-key",
            )

        assert "HTTP 403" in str(exc_info.value)
        mock_put.assert_not_called()  # PUT should not be called if POST fails


@mock.patch("requests.post")
@mock.patch("requests.put")
def test_upload_single_file(mock_put, mock_post):
    """Test uploading a single file"""
    # Create a temporary file
    with tempfile.NamedTemporaryFile(suffix=".txt") as tmp_file:
        tmp_file.write(b"test content")
        tmp_file.flush()

        # Mock successful signed URL response
        mock_post_response = mock.Mock()
        mock_post_response.ok = True
        mock_post_response.json.return_value = {
            "success": True,
            "signedUrl": "https://test-signed-url",
        }
        mock_post.return_value = mock_post_response

        # Mock successful upload
        mock_put_response = mock.Mock()
        mock_put_response.ok = True
        mock_put.return_value = mock_put_response

        # Upload file
        result = _upload_single_file(
            "test-figure-url", "test.txt", pathlib.Path(tmp_file.name), "test-api-key"
        )

        assert result == "test.txt"

        # Verify correct API calls were made
        mock_post.assert_called_once()
        mock_put.assert_called_once()

        # Verify signed URL was requested with correct data
        post_args = mock_post.call_args[1]["json"]
        assert post_args["figureUrl"] == "test-figure-url"
        assert post_args["relativePath"] == "test.txt"
        assert post_args["apiKey"] == "test-api-key"

        # Verify file was uploaded to signed URL
        assert mock_put.call_args[0][0] == "https://test-signed-url"
        assert (
            mock_put.call_args[1]["headers"]["Content-Type"]
            == "application/octet-stream"
        )


def test_determine_content_type_edge_cases():
    """Test edge cases for content type determination"""
    # Test nested paths
    assert _determine_content_type("path/to/file.json") == "application/json"
    assert _determine_content_type("deep/nested/path/file.html") == "text/html"

    # Test zarr-specific extensions
    assert _determine_content_type("data.zgroup") == "application/json"
    assert _determine_content_type("data.zarray") == "application/json"
    assert _determine_content_type("data.zmetadata") == "application/json"

    # Test files with multiple dots
    assert _determine_content_type("file.min.js") == "application/javascript"
    assert _determine_content_type("style.min.css") == "text/css"


def test_compute_deterministic_figure_hash_empty_dir():
    """Test hash computation for empty directory"""
    with tempfile.TemporaryDirectory() as tmpdir:
        tmpdir_path = pathlib.Path(tmpdir)
        hash_result = _compute_deterministic_figure_hash(tmpdir_path)

        # Should still produce a valid hash even for empty directory
        assert len(hash_result) == 40
        assert isinstance(hash_result, str)


def test_compute_deterministic_figure_hash_ordering():
    """Test that file ordering doesn't affect hash"""
    with tempfile.TemporaryDirectory() as tmpdir1, tempfile.TemporaryDirectory() as tmpdir2:
        # Create same files in different order
        tmpdir1_path = pathlib.Path(tmpdir1)
        tmpdir2_path = pathlib.Path(tmpdir2)

        # Directory 1: create files in order a, b, c
        (tmpdir1_path / "a.txt").write_text("content a")
        (tmpdir1_path / "b.txt").write_text("content b")
        (tmpdir1_path / "c.txt").write_text("content c")

        # Directory 2: create files in order c, a, b
        (tmpdir2_path / "c.txt").write_text("content c")
        (tmpdir2_path / "a.txt").write_text("content a")
        (tmpdir2_path / "b.txt").write_text("content b")

        hash1 = _compute_deterministic_figure_hash(tmpdir1_path)
        hash2 = _compute_deterministic_figure_hash(tmpdir2_path)

        # Hashes should be identical regardless of creation order
        assert hash1 == hash2


@mock.patch("requests.post")
def test_create_or_get_figure_http_error(mock_post):
    """Test HTTP error handling when creating a figure"""
    # Mock HTTP error response
    mock_response = mock.Mock()
    mock_response.ok = False
    mock_response.status_code = 500
    mock_response.json.side_effect = Exception("Invalid JSON")
    mock_post.return_value = mock_response

    with pytest.raises(Exception) as exc_info:
        _create_or_get_figure("test-hash", "test-api-key")

    assert "HTTP 500" in str(exc_info.value)


@mock.patch("requests.post")
def test_create_or_get_figure_without_metadata(mock_post):
    """Test creating a figure without total files/size metadata"""
    # Mock successful response
    mock_response = mock.Mock()
    mock_response.ok = True
    mock_response.json.return_value = {
        "success": True,
        "figure": {"figureUrl": "test-figure-url", "status": "pending"},
    }
    mock_post.return_value = mock_response

    result = _create_or_get_figure("test-hash", "test-api-key")

    assert result["success"] == True

    # Verify API was called without metadata
    call_args = mock_post.call_args[1]["json"]
    assert "totalFiles" not in call_args
    assert "totalSize" not in call_args


@mock.patch("requests.post")
def test_finalize_figure_success_false(mock_post):
    """Test finalize figure when API returns success=False"""
    # Mock response with success=False
    mock_response = mock.Mock()
    mock_response.ok = True
    mock_response.json.return_value = {
        "success": False,
        "message": "Finalization failed",
    }
    mock_post.return_value = mock_response

    with pytest.raises(Exception) as exc_info:
        _finalize_figure("test-figure-url", "test-api-key")

    assert "Finalization failed" in str(exc_info.value)


@mock.patch("requests.post")
@mock.patch("requests.put")
def test_upload_single_file_success_false(mock_put, mock_post):
    """Test upload single file when signed URL request returns success=False"""
    with tempfile.NamedTemporaryFile(suffix=".txt") as tmp_file:
        tmp_file.write(b"test content")
        tmp_file.flush()

        # Mock response with success=False
        mock_post_response = mock.Mock()
        mock_post_response.ok = True
        mock_post_response.json.return_value = {
            "success": False,
            "message": "Signed URL generation failed",
        }
        mock_post.return_value = mock_post_response

        with pytest.raises(Exception) as exc_info:
            _upload_single_file(
                "test-figure-url",
                "test.txt",
                pathlib.Path(tmp_file.name),
                "test-api-key",
            )

        assert "Signed URL generation failed" in str(exc_info.value)
        mock_put.assert_not_called()


@mock.patch("requests.post")
@mock.patch("requests.put")
def test_upload_single_file_no_signed_url(mock_put, mock_post):
    """Test upload single file when no signed URL is returned"""
    with tempfile.NamedTemporaryFile(suffix=".txt") as tmp_file:
        tmp_file.write(b"test content")
        tmp_file.flush()

        # Mock response with success=True but no signedUrl
        mock_post_response = mock.Mock()
        mock_post_response.ok = True
        mock_post_response.json.return_value = {
            "success": True,
            # Missing signedUrl
        }
        mock_post.return_value = mock_post_response

        with pytest.raises(Exception) as exc_info:
            _upload_single_file(
                "test-figure-url",
                "test.txt",
                pathlib.Path(tmp_file.name),
                "test-api-key",
            )

        assert "No signed URL returned" in str(exc_info.value)
        mock_put.assert_not_called()


@mock.patch("requests.post")
@mock.patch("requests.put")
def test_upload_single_file_upload_failure(mock_put, mock_post):
    """Test upload single file when the actual upload fails"""
    with tempfile.NamedTemporaryFile(suffix=".txt") as tmp_file:
        tmp_file.write(b"test content")
        tmp_file.flush()

        # Mock successful signed URL response
        mock_post_response = mock.Mock()
        mock_post_response.ok = True
        mock_post_response.json.return_value = {
            "success": True,
            "signedUrl": "https://test-signed-url",
        }
        mock_post.return_value = mock_post_response

        # Mock failed upload
        mock_put_response = mock.Mock()
        mock_put_response.ok = False
        mock_put_response.status_code = 403
        mock_put.return_value = mock_put_response

        with pytest.raises(Exception) as exc_info:
            _upload_single_file(
                "test-figure-url",
                "test.txt",
                pathlib.Path(tmp_file.name),
                "test-api-key",
            )

        assert "HTTP 403" in str(exc_info.value)


@mock.patch("requests.post")
@mock.patch("requests.put")
def test_upload_single_file_with_json_content_type(mock_put, mock_post):
    """Test upload single file with JSON content type"""
    with tempfile.NamedTemporaryFile(suffix=".json") as tmp_file:
        tmp_file.write(b'{"test": "data"}')
        tmp_file.flush()

        # Mock successful responses
        mock_post_response = mock.Mock()
        mock_post_response.ok = True
        mock_post_response.json.return_value = {
            "success": True,
            "signedUrl": "https://test-signed-url",
        }
        mock_post.return_value = mock_post_response

        mock_put_response = mock.Mock()
        mock_put_response.ok = True
        mock_put.return_value = mock_put_response

        result = _upload_single_file(
            "test-figure-url", "test.json", pathlib.Path(tmp_file.name), "test-api-key"
        )

        assert result == "test.json"

        # Verify JSON content type was used
        assert mock_put.call_args[1]["headers"]["Content-Type"] == "application/json"


@mock.patch("figpack.core._upload_bundle._compute_deterministic_figure_hash")
@mock.patch("figpack.core._upload_bundle._create_or_get_figure")
@mock.patch("figpack.core._upload_bundle._upload_single_file")
@mock.patch("figpack.core._upload_bundle._finalize_figure")
@mock.patch("requests.post")
@mock.patch("requests.put")
def test_upload_bundle_existing_figure(
    mock_put, mock_post, mock_finalize, mock_upload_file, mock_create_figure, mock_hash
):
    """Test upload bundle when figure already exists"""
    with tempfile.TemporaryDirectory() as tmpdir:
        # Create test files
        tmpdir_path = pathlib.Path(tmpdir)
        (tmpdir_path / "test.txt").write_text("test content")

        # Mock hash computation
        mock_hash.return_value = "test-hash"

        # Mock figure already exists
        mock_create_figure.return_value = {
            "success": True,
            "figure": {
                "figureUrl": "https://existing-figure-url",
                "status": "completed",
            },
        }

        result = _upload_bundle(tmpdir, "test-api-key")

        assert result == "https://existing-figure-url"

        # Should not upload files or finalize if figure already exists
        mock_upload_file.assert_not_called()
        mock_finalize.assert_not_called()


@mock.patch("figpack.core._upload_bundle._compute_deterministic_figure_hash")
@mock.patch("figpack.core._upload_bundle._create_or_get_figure")
@mock.patch("figpack.core._upload_bundle._upload_single_file")
@mock.patch("figpack.core._upload_bundle._finalize_figure")
@mock.patch("requests.post")
@mock.patch("requests.put")
def test_upload_bundle_no_files(
    mock_put, mock_post, mock_finalize, mock_upload_file, mock_create_figure, mock_hash
):
    """Test upload bundle with no files to upload"""
    with tempfile.TemporaryDirectory() as tmpdir:
        # Empty directory
        tmpdir_path = pathlib.Path(tmpdir)

        # Mock hash computation
        mock_hash.return_value = "test-hash"

        # Mock figure creation
        mock_create_figure.return_value = {
            "success": True,
            "figure": {"figureUrl": "https://test-figure-url", "status": "pending"},
        }

        # Mock manifest upload
        mock_manifest_response = mock.Mock()
        mock_manifest_response.ok = True
        mock_manifest_response.json.return_value = {
            "success": True,
            "signedUrl": "https://manifest-signed-url",
        }
        mock_post.return_value = mock_manifest_response

        mock_put_response = mock.Mock()
        mock_put_response.ok = True
        mock_put.return_value = mock_put_response

        result = _upload_bundle(tmpdir, "test-api-key")

        assert result == "https://test-figure-url"

        # Should not upload any files but should still upload manifest and finalize
        mock_upload_file.assert_not_called()
        mock_finalize.assert_called_once()


@mock.patch("figpack.core._upload_bundle._compute_deterministic_figure_hash")
@mock.patch("figpack.core._upload_bundle._create_or_get_figure")
@mock.patch("figpack.core._upload_bundle._upload_single_file")
@mock.patch("figpack.core._upload_bundle._finalize_figure")
@mock.patch("requests.post")
@mock.patch("requests.put")
def test_upload_bundle_upload_failure(
    mock_put, mock_post, mock_finalize, mock_upload_file, mock_create_figure, mock_hash
):
    """Test upload bundle when file upload fails"""
    with tempfile.TemporaryDirectory() as tmpdir:
        # Create test files
        tmpdir_path = pathlib.Path(tmpdir)
        (tmpdir_path / "test.txt").write_text("test content")

        # Mock hash computation
        mock_hash.return_value = "test-hash"

        # Mock figure creation
        mock_create_figure.return_value = {
            "success": True,
            "figure": {"figureUrl": "https://test-figure-url", "status": "pending"},
        }

        # Mock file upload failure
        mock_upload_file.side_effect = Exception("Upload failed")

        with pytest.raises(Exception) as exc_info:
            _upload_bundle(tmpdir, "test-api-key")

        assert "Upload failed" in str(exc_info.value)

        # Should not finalize if upload fails
        mock_finalize.assert_not_called()


@mock.patch("figpack.core._upload_bundle._compute_deterministic_figure_hash")
@mock.patch("figpack.core._upload_bundle._create_or_get_figure")
@mock.patch("figpack.core._upload_bundle._upload_single_file")
@mock.patch("figpack.core._upload_bundle._finalize_figure")
@mock.patch("requests.post")
@mock.patch("requests.put")
def test_upload_bundle_manifest_upload_failure(
    mock_put, mock_post, mock_finalize, mock_upload_file, mock_create_figure, mock_hash
):
    """Test upload bundle when manifest upload fails"""
    with tempfile.TemporaryDirectory() as tmpdir:
        # Create test files
        tmpdir_path = pathlib.Path(tmpdir)
        (tmpdir_path / "test.txt").write_text("test content")

        # Mock hash computation
        mock_hash.return_value = "test-hash"

        # Mock figure creation
        mock_create_figure.return_value = {
            "success": True,
            "figure": {"figureUrl": "https://test-figure-url", "status": "pending"},
        }

        # Mock successful file upload
        mock_upload_file.return_value = "test.txt"

        # Mock manifest upload failure
        mock_manifest_response = mock.Mock()
        mock_manifest_response.ok = False
        mock_manifest_response.status_code = 500
        mock_manifest_response.json.side_effect = Exception("Invalid JSON")
        mock_post.return_value = mock_manifest_response

        with pytest.raises(Exception) as exc_info:
            _upload_bundle(tmpdir, "test-api-key")

        assert "HTTP 500" in str(exc_info.value)
        assert "manifest.json" in str(exc_info.value)


@mock.patch("figpack.core._upload_bundle._compute_deterministic_figure_hash")
@mock.patch("figpack.core._upload_bundle._create_or_get_figure")
@mock.patch("figpack.core._upload_bundle._upload_single_file")
@mock.patch("figpack.core._upload_bundle._finalize_figure")
@mock.patch("requests.post")
@mock.patch("requests.put")
def test_upload_bundle_complete_flow(
    mock_put, mock_post, mock_finalize, mock_upload_file, mock_create_figure, mock_hash
):
    """Test complete upload bundle flow"""
    with tempfile.TemporaryDirectory() as tmpdir:
        # Create test files
        tmpdir_path = pathlib.Path(tmpdir)
        (tmpdir_path / "test1.txt").write_text("test content 1")
        (tmpdir_path / "test2.json").write_text('{"test": "data"}')

        subdir = tmpdir_path / "subdir"
        subdir.mkdir()
        (subdir / "test3.html").write_text("<html></html>")

        # Mock hash computation
        mock_hash.return_value = "test-hash"

        # Mock figure creation
        mock_create_figure.return_value = {
            "success": True,
            "figure": {"figureUrl": "https://test-figure-url", "status": "pending"},
        }

        # Mock successful file uploads
        mock_upload_file.side_effect = (
            lambda figure_url, rel_path, file_path, api_key: rel_path
        )

        # Mock manifest upload
        mock_manifest_response = mock.Mock()
        mock_manifest_response.ok = True
        mock_manifest_response.json.return_value = {
            "success": True,
            "signedUrl": "https://manifest-signed-url",
        }
        mock_post.return_value = mock_manifest_response

        mock_put_response = mock.Mock()
        mock_put_response.ok = True
        mock_put.return_value = mock_put_response

        result = _upload_bundle(tmpdir, "test-api-key")

        assert result == "https://test-figure-url"

        # Verify all files were uploaded
        assert mock_upload_file.call_count == 3

        # Verify manifest was uploaded
        mock_post.assert_called_once()
        mock_put.assert_called_once()

        # Verify finalization was called
        mock_finalize.assert_called_once_with("https://test-figure-url", "test-api-key")
