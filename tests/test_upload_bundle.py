from unittest import mock

import pytest
import requests

from figpack.core._upload_bundle import (
    _create_or_get_figure,
    _determine_content_type,
    _finalize_figure,
    _get_batch_signed_urls,
    _upload_bundle,
    _upload_single_file_with_signed_url,
)


def test_get_batch_signed_urls(tmp_path):
    # Create temporary test files
    file1 = tmp_path / "test1.txt"
    file2 = tmp_path / "test2.txt"
    file1.write_text("test content 1")
    file2.write_text("test content 2")

    figure_url = "test-figure-url"
    files_batch = [
        ("path1.txt", file1),
        ("path2.txt", file2),
    ]
    api_key = "test-api-key"

    mock_response = mock.Mock()
    mock_response.ok = True
    mock_response.json.return_value = {
        "success": True,
        "signedUrls": [
            {"relativePath": "path1.txt", "signedUrl": "signed-url-1"},
            {"relativePath": "path2.txt", "signedUrl": "signed-url-2"},
        ],
    }

    with mock.patch("requests.post") as mock_post:
        mock_post.return_value = mock_response
        result = _get_batch_signed_urls(figure_url, files_batch, api_key)

        assert result == {"path1.txt": "signed-url-1", "path2.txt": "signed-url-2"}

        # Verify proper API call
        mock_post.assert_called_once()
        called_url = mock_post.call_args[0][0]
        called_payload = mock_post.call_args[1]["json"]
        assert "upload" in called_url
        assert called_payload["figureUrl"] == figure_url
        assert len(called_payload["files"]) == 2


def test_get_batch_signed_urls_http_error():
    with mock.patch("requests.post") as mock_post:
        mock_post.return_value.ok = False
        mock_post.return_value.status_code = 500

        with pytest.raises(Exception, match="Failed to get signed URLs for batch"):
            _get_batch_signed_urls("test-url", [], "test-key")


def test_get_batch_signed_urls_api_error(tmp_path):
    # Create test file
    test_file = tmp_path / "test.txt"
    test_file.write_text("test content")
    files_batch = [("test.txt", test_file)]

    mock_response = mock.Mock()
    mock_response.ok = True
    mock_response.json.return_value = {"success": False, "message": "API error message"}

    with mock.patch("requests.post") as mock_post:
        mock_post.return_value = mock_response
        with pytest.raises(
            Exception, match="Failed to get signed URLs for batch: API error message"
        ):
            _get_batch_signed_urls("test-url", files_batch, "test-key")


def test_upload_single_file_with_signed_url(tmp_path):
    # Create a temporary test file
    test_file = tmp_path / "test.txt"
    test_file.write_text("test content")

    with mock.patch("requests.put") as mock_put:
        mock_put.return_value.ok = True

        result = _upload_single_file_with_signed_url(
            "test.txt", test_file, "signed-url", num_retries=2
        )

        assert result == "test.txt"
        mock_put.assert_called_once()
        assert (
            mock_put.call_args[1]["headers"]["Content-Type"]
            == "application/octet-stream"
        )


def test_upload_single_file_with_retry(tmp_path):
    test_file = tmp_path / "test.txt"
    test_file.write_text("test content")

    with mock.patch("requests.put") as mock_put, mock.patch("time.sleep"):
        # First attempt fails, second succeeds
        mock_put.side_effect = [
            mock.Mock(ok=False, status_code=500),
            mock.Mock(ok=True),
        ]

        result = _upload_single_file_with_signed_url(
            "test.txt", test_file, "signed-url", num_retries=2
        )

        assert result == "test.txt"
        assert mock_put.call_count == 2


def test_create_or_get_figure():
    api_key = "test-key"

    mock_response = mock.Mock()
    mock_response.ok = True
    mock_response.json.return_value = {
        "success": True,
        "figure": {"figureUrl": "test-url", "status": "pending"},
    }

    with mock.patch("requests.post") as mock_post:
        mock_post.return_value = mock_response
        result = _create_or_get_figure(api_key)

        assert result["success"]
        assert result["figure"]["figureUrl"] == "test-url"
        assert result["figure"]["status"] == "pending"

        mock_post.assert_called_once()


def test_create_or_get_figure_error():
    with mock.patch("requests.post") as mock_post:
        mock_post.return_value.ok = False
        mock_post.return_value.status_code = 500

        with pytest.raises(Exception, match="Failed to create figure"):
            _create_or_get_figure("test-hash", "test-key")


def test_finalize_figure():
    figure_url = "test-url"
    api_key = "test-key"

    mock_response = mock.Mock()
    mock_response.ok = True
    mock_response.json.return_value = {
        "success": True,
        "figure": {"status": "completed"},
    }

    with mock.patch("requests.post") as mock_post:
        mock_post.return_value = mock_response
        result = _finalize_figure(figure_url, api_key)

        assert result["success"]
        assert result["figure"]["status"] == "completed"

        mock_post.assert_called_once()
        assert mock_post.call_args[1]["json"]["figureUrl"] == figure_url


def test_determine_content_type():
    assert _determine_content_type("test.json") == "application/json"
    assert _determine_content_type("test.html") == "text/html"
    assert _determine_content_type("test.css") == "text/css"
    assert _determine_content_type("test.js") == "application/javascript"
    assert _determine_content_type("test.png") == "image/png"
    assert _determine_content_type("test.zattrs") == "application/json"
    assert _determine_content_type("test.unknown") == "application/octet-stream"
    assert _determine_content_type("no_extension") == "application/octet-stream"


def test_upload_bundle(tmp_path):
    # Create test files
    file1 = tmp_path / "test1.txt"
    file2 = tmp_path / "test2.txt"
    file1.write_text("content1")
    file2.write_text("content2")

    api_key = "test-key"
    figure_url = "test-figure-url"

    # Mock all external API calls
    mock_create_response = mock.Mock()
    mock_create_response.ok = True
    mock_create_response.json.return_value = {
        "success": True,
        "figure": {"figureUrl": figure_url, "status": "pending"},
    }

    # First batch for regular files
    mock_batch_files_response = mock.Mock()
    mock_batch_files_response.ok = True
    mock_batch_files_response.json.return_value = {
        "success": True,
        "signedUrls": [
            {"relativePath": str(file1.name), "signedUrl": "signed-url-1"},
            {"relativePath": str(file2.name), "signedUrl": "signed-url-2"},
        ],
    }

    # Second batch for manifest
    mock_batch_manifest_response = mock.Mock()
    mock_batch_manifest_response.ok = True
    mock_batch_manifest_response.json.return_value = {
        "success": True,
        "signedUrls": [
            {"relativePath": "manifest.json", "signedUrl": "signed-url-manifest"},
        ],
    }

    mock_upload_response = mock.Mock()
    mock_upload_response.ok = True

    mock_finalize_response = mock.Mock()
    mock_finalize_response.ok = True
    mock_finalize_response.json.return_value = {
        "success": True,
        "figure": {"status": "completed"},
    }

    with mock.patch.multiple(
        "requests",
        post=mock.Mock(
            side_effect=[
                mock_create_response,
                mock_batch_files_response,
                mock_batch_manifest_response,
                mock_finalize_response,
            ]
        ),
        put=mock.Mock(return_value=mock_upload_response),
    ):
        result = _upload_bundle(
            str(tmp_path), api_key, use_consolidated_metadata_only=True
        )

        assert result == figure_url

        # Verify all API calls in sequence
        api_calls = requests.post.call_args_list

        # 1. Create figure call
        create_call = api_calls[0]
        assert "create" in create_call[0][0]

        # 2. First batch signed URLs call (for regular files)
        batch_files_call = api_calls[1]
        assert "upload" in batch_files_call[0][0]

        # 3. Second batch signed URLs call (for manifest)
        batch_manifest_call = api_calls[2]
        assert "upload" in batch_manifest_call[0][0]

        # 4. Finalize call
        finalize_call = api_calls[3]
        assert "finalize" in finalize_call[0][0]

        # Verify file uploads
        assert requests.put.call_count >= 3  # 2 files + manifest
