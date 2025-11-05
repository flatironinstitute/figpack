from typing import Optional, Union
import hashlib
import json
import pathlib
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests

from .. import __version__

from .config import FIGPACK_API_BASE_URL, FIGPACK_BUCKET

thisdir = pathlib.Path(__file__).parent.resolve()


def _get_batch_signed_urls(figure_url: str, files_batch: list, api_key: str) -> dict:
    """
    Get signed URLs for a batch of files

    Args:
        figure_url: The figure URL
        files_batch: List of tuples (relative_path, file_path)
        api_key: API key for authentication

    Returns:
        dict: Mapping of relative_path to signed_url
    """
    # Prepare batch request
    files_data = []
    for relative_path, file_path in files_batch:
        file_size = file_path.stat().st_size
        files_data.append({"relativePath": relative_path, "size": file_size})

    payload = {
        "figureUrl": figure_url,
        "files": files_data,
    }

    headers = {
        "Content-Type": "application/json",
        "x-api-key": api_key if api_key else "",
    }

    response = requests.post(
        f"{FIGPACK_API_BASE_URL}/upload", json=payload, headers=headers
    )

    if not response.ok:
        try:
            error_data = response.json()
            error_msg = error_data.get("message", "Unknown error")
        except:
            error_msg = f"HTTP {response.status_code}"
        raise Exception(f"Failed to get signed URLs for batch: {error_msg}")

    response_data = response.json()
    if not response_data.get("success"):
        raise Exception(
            f"Failed to get signed URLs for batch: {response_data.get('message', 'Unknown error')}"
        )

    signed_urls_data = response_data.get("signedUrls", [])
    if not signed_urls_data:
        raise Exception("No signed URLs returned for batch")

    # Convert to mapping
    signed_urls_map = {}
    for item in signed_urls_data:
        signed_urls_map[item["relativePath"]] = item["signedUrl"]

    return signed_urls_map


def _upload_single_file_with_signed_url(
    relative_path: str, file_path: pathlib.Path, signed_url: str, num_retries: int = 4
) -> str:
    """
    Upload a single file using a pre-obtained signed URL with exponential backoff retries

    Args:
        relative_path: The relative path of the file
        file_path: The path to the file to upload
        signed_url: The signed URL to upload to
        num_retries: Number of retries on failure with exponential backoff (default: 4)

    Returns:
        str: The relative path of the uploaded file

    Raises:
        Exception: If upload fails after all retries are exhausted
    """
    content_type = _determine_content_type(relative_path)
    retries_remaining = num_retries
    last_exception = None

    while retries_remaining >= 0:
        try:
            with open(file_path, "rb") as f:
                upload_response = requests.put(
                    signed_url, data=f, headers={"Content-Type": content_type}
                )

            if upload_response.ok:
                return relative_path

            last_exception = Exception(
                f"Failed to upload {relative_path} to signed URL: HTTP {upload_response.status_code}"
            )
        except Exception as e:
            last_exception = e

        if retries_remaining > 0:
            backoff_seconds = 2 ** (num_retries - retries_remaining)
            print(
                f"Upload failed for {relative_path}, retrying in {backoff_seconds} seconds..."
            )
            time.sleep(backoff_seconds)
            retries_remaining -= 1
        else:
            break

    assert last_exception is not None
    raise last_exception


MAX_WORKERS_FOR_UPLOAD = 16


def _create_or_get_figure(
    api_key: Optional[str],
    total_files: Optional[int] = None,
    total_size: Optional[int] = None,
    title: Optional[str] = None,
    ephemeral: bool = False,
) -> dict:
    """
    Create a new figure or get existing figure information

    Args:
        api_key: The API key for authentication (required for non-ephemeral)
        total_files: Optional total number of files
        total_size: Optional total size of files
        title: Optional title for the figure
        ephemeral: Whether to create an ephemeral figure

    Returns:
        dict: Figure information from the API
    """
    # Validate API key requirement
    if not ephemeral and api_key is None:
        raise ValueError("API key is required for non-ephemeral figures")

    payload: dict[str, Union[str, int]] = {
        "figpackVersion": __version__,
        "bucket": FIGPACK_BUCKET,
    }

    # API key is optional for ephemeral figures
    # if api_key is not None:
    #     payload["apiKey"] = api_key

    if total_files is not None:
        payload["totalFiles"] = total_files
    if total_size is not None:
        payload["totalSize"] = total_size
    if title is not None:
        payload["title"] = title
    if ephemeral:
        payload["ephemeral"] = True

    # Use the same endpoint for both regular and ephemeral figures
    url = f"{FIGPACK_API_BASE_URL}/figures/create"
    headers = {
        "Content-Type": "application/json",
        "x-api-key": api_key if api_key else "",
    }
    response = requests.post(url, json=payload, headers=headers)

    if not response.ok:
        try:
            error_data = response.json()
            error_msg = error_data.get("message", "Unknown error")
        except:
            error_msg = f"HTTP {response.status_code}"
        raise Exception(f"Failed to create figure: {error_msg}")

    response_data = response.json()
    if not response_data.get("success"):
        raise Exception(
            f"Failed to create figure: {response_data.get('message', 'Unknown error')}"
        )

    return response_data


def _finalize_figure(figure_url: str, api_key: str) -> dict:
    """
    Finalize a figure upload

    Returns:
        dict: Figure information from the API
    """
    payload = {
        "figureUrl": figure_url,
    }

    headers = {
        "Content-Type": "application/json",
        "x-api-key": api_key if api_key else "",
    }

    response = requests.post(
        f"{FIGPACK_API_BASE_URL}/figures/finalize", json=payload, headers=headers
    )

    if not response.ok:
        try:
            error_data = response.json()
            error_msg = error_data.get("message", "Unknown error")
        except:
            error_msg = f"HTTP {response.status_code}"
        raise Exception(f"Failed to finalize figure {figure_url}: {error_msg}")

    response_data = response.json()
    if not response_data.get("success"):
        raise Exception(
            f"Failed to finalize figure {figure_url}: {response_data.get('message', 'Unknown error')}"
        )

    return response_data


def _upload_bundle(
    tmpdir: str,
    api_key: Optional[str],
    title: Optional[str] = None,
    ephemeral: bool = False,
    use_consolidated_metadata_only: bool = False,
) -> str:
    """
    Upload the prepared bundle to the cloud using the new database-driven approach

    Args:
        tmpdir: Path to the temporary directory containing the bundle
        api_key: API key for authentication
        title: Optional title for the figure
        ephemeral: Whether to create an ephemeral figure
        use_consolidated_metadata_only: If True, excludes individual zarr metadata files
            (.zgroup, .zarray, .zattrs) since they are included in .zmetadata
    """
    tmpdir_path = pathlib.Path(tmpdir)

    # Collect all files to upload
    all_files = []
    for file_path in tmpdir_path.rglob("*"):
        if file_path.is_file():
            relative_path = file_path.relative_to(tmpdir_path)
            # Skip individual zarr metadata files if using consolidated metadata only
            if use_consolidated_metadata_only:
                if str(relative_path).endswith((".zgroup", ".zarray", ".zattrs")):
                    continue
            all_files.append((str(relative_path), file_path))

    # Calculate total files and size for metadata
    total_files = len(all_files)
    total_size = sum(file_path.stat().st_size for _, file_path in all_files)
    print(
        f"Found {total_files} files to upload, total size: {total_size / (1024 * 1024):.2f} MB"
    )

    # Find available figure ID and create/get figure in database with metadata
    result = _create_or_get_figure(
        api_key,
        total_files,
        total_size,
        title=title,
        ephemeral=ephemeral,
    )
    figure_info = result.get("figure", {})
    figure_url = figure_info.get("figureUrl")

    if figure_info["status"] == "completed":
        print(f"Figure already exists. No upload needed.")
        return figure_url

    files_to_upload = all_files
    total_files_to_upload = len(files_to_upload)

    if total_files_to_upload == 0:
        print("No files to upload")
    else:
        print(
            f"Uploading {total_files_to_upload} files in batches of 20 with up to {MAX_WORKERS_FOR_UPLOAD} concurrent uploads per batch..."
        )

        # Thread-safe progress tracking
        uploaded_count = 0
        count_lock = threading.Lock()

        # Process files in batches of 20
        batch_size = 20
        for i in range(0, total_files_to_upload, batch_size):
            batch = files_to_upload[i : i + batch_size]
            batch_num = i // batch_size + 1
            total_batches = (total_files_to_upload + batch_size - 1) // batch_size

            print(
                f"Processing batch {batch_num}/{total_batches} ({len(batch)} files)..."
            )

            # Get signed URLs for this batch
            try:
                signed_urls_map = _get_batch_signed_urls(
                    figure_url, batch, api_key if api_key else ""
                )
            except Exception as e:
                print(f"Failed to get signed URLs for batch {batch_num}: {e}")
                raise

            # Upload files in this batch in parallel
            with ThreadPoolExecutor(max_workers=MAX_WORKERS_FOR_UPLOAD) as executor:
                # Submit upload tasks for this batch
                future_to_file = {}
                for rel_path, file_path in batch:
                    if rel_path in signed_urls_map:
                        future = executor.submit(
                            _upload_single_file_with_signed_url,
                            rel_path,
                            file_path,
                            signed_urls_map[rel_path],
                        )
                        future_to_file[future] = rel_path
                    else:
                        print(f"Warning: No signed URL found for {rel_path}")

                # Process completed uploads for this batch
                for future in as_completed(future_to_file):
                    relative_path = future_to_file[future]
                    try:
                        future.result()  # This will raise any exception that occurred during upload

                        # Thread-safe progress update
                        with count_lock:
                            uploaded_count += 1
                            print(
                                f"Uploaded {uploaded_count}/{total_files_to_upload}: {relative_path}"
                            )

                    except Exception as e:
                        print(f"Failed to upload {relative_path}: {e}")
                        raise  # Re-raise the exception to stop the upload process

    # Create manifest for finalization
    print("Creating manifest...")
    manifest = {
        "timestamp": time.time(),
        "files": [],
        "total_size": 0,
        "total_files": len(files_to_upload),
    }

    for rel_path, file_path in files_to_upload:
        file_size = file_path.stat().st_size
        manifest["files"].append({"path": rel_path, "size": file_size})
        manifest["total_size"] += file_size

    print(f"Total size: {manifest['total_size'] / (1024 * 1024):.2f} MB")

    # Upload manifest.json using batch API
    print("Uploading manifest.json...")
    manifest_content = json.dumps(manifest, indent=2)
    manifest_size = len(manifest_content.encode("utf-8"))

    # Create a temporary file for the manifest
    import tempfile

    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".json", delete=False
    ) as temp_file:
        temp_file.write(manifest_content)
        temp_file_path = pathlib.Path(temp_file.name)

    try:
        # Use batch API for manifest
        manifest_batch = [("manifest.json", temp_file_path)]
        signed_urls_map = _get_batch_signed_urls(
            figure_url, manifest_batch, api_key if api_key else ""
        )

        if "manifest.json" not in signed_urls_map:
            raise Exception("No signed URL returned for manifest.json")

        # Upload manifest using the same retry function
        _upload_single_file_with_signed_url(
            "manifest.json",
            temp_file_path,
            signed_urls_map["manifest.json"],
            num_retries=4,
        )
    finally:
        # Clean up temporary file
        temp_file_path.unlink(missing_ok=True)

    # Finalize the figure upload
    print("Finalizing figure...")
    _finalize_figure(figure_url, api_key if api_key else "")
    print("Upload completed successfully")

    return figure_url


def _determine_content_type(file_path: str) -> str:
    """
    Determine content type for upload based on file extension
    """
    file_name = file_path.split("/")[-1]
    extension = file_name.split(".")[-1] if "." in file_name else ""

    content_type_map = {
        "json": "application/json",
        "html": "text/html",
        "css": "text/css",
        "js": "application/javascript",
        "png": "image/png",
        "zattrs": "application/json",
        "zgroup": "application/json",
        "zarray": "application/json",
        "zmetadata": "application/json",
    }

    return content_type_map.get(extension, "application/octet-stream")
