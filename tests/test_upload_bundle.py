"""
Tests for figpack upload bundle functionality
"""

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
