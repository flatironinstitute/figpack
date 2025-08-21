import hashlib
import json
import pathlib
import threading
import time
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta, timezone

import requests

from .. import __version__

from .config import FIGPACK_API_BASE_URL

thisdir = pathlib.Path(__file__).parent.resolve()


def _upload_single_file(
    figure_url: str, relative_path: str, file_path: pathlib.Path, api_key: str
) -> str:
    """
    Worker function to upload a single file using signed URL

    Returns:
        str: The relative path of the uploaded file
    """
    file_size = file_path.stat().st_size

    # Get signed URL
    payload = {
        "figureUrl": figure_url,
        "relativePath": relative_path,
        "apiKey": api_key,
        "size": file_size,
    }

    response = requests.post(f"{FIGPACK_API_BASE_URL}/api/upload", json=payload)

    if not response.ok:
        try:
            error_data = response.json()
            error_msg = error_data.get("message", "Unknown error")
        except:
            error_msg = f"HTTP {response.status_code}"
        raise Exception(f"Failed to get signed URL for {relative_path}: {error_msg}")

    response_data = response.json()
    if not response_data.get("success"):
        raise Exception(
            f"Failed to get signed URL for {relative_path}: {response_data.get('message', 'Unknown error')}"
        )

    signed_url = response_data.get("signedUrl")
    if not signed_url:
        raise Exception(f"No signed URL returned for {relative_path}")

    # Upload file to signed URL
    content_type = _determine_content_type(relative_path)
    with open(file_path, "rb") as f:
        upload_response = requests.put(
            signed_url, data=f, headers={"Content-Type": content_type}
        )

    if not upload_response.ok:
        raise Exception(
            f"Failed to upload {relative_path} to signed URL: HTTP {upload_response.status_code}"
        )

    return relative_path


MAX_WORKERS_FOR_UPLOAD = 16


def _compute_deterministic_figure_hash(tmpdir_path: pathlib.Path) -> str:
    """
    Compute a deterministic figure ID based on SHA1 hashes of all files

    Returns:
        str: 40-character SHA1 hash representing the content of all files
    """
    file_hashes = []

    # Collect all files and their hashes
    for file_path in sorted(tmpdir_path.rglob("*")):
        if file_path.is_file():
            relative_path = file_path.relative_to(tmpdir_path)

            # Compute SHA1 hash of file content
            sha1_hash = hashlib.sha1()
            with open(file_path, "rb") as f:
                for chunk in iter(lambda: f.read(4096), b""):
                    sha1_hash.update(chunk)

            # Include both the relative path and content hash to ensure uniqueness
            file_info = f"{relative_path}:{sha1_hash.hexdigest()}"
            file_hashes.append(file_info)

    # Create final hash from all file hashes
    combined_hash = hashlib.sha1()
    for file_hash in file_hashes:
        combined_hash.update(file_hash.encode("utf-8"))

    return combined_hash.hexdigest()


def _create_or_get_figure(
    figure_hash: str,
    api_key: str,
    total_files: int = None,
    total_size: int = None,
    title: str = None,
) -> dict:
    """
    Create a new figure or get existing figure information

    Args:
        figure_hash: The hash of the figure
        api_key: The API key for authentication
        total_files: Optional total number of files
        total_size: Optional total size of files
        title: Optional title for the figure

    Returns:
        dict: Figure information from the API
    """
    payload = {
        "figureHash": figure_hash,
        "apiKey": api_key,
        "figpackVersion": __version__,
    }

    if total_files is not None:
        payload["totalFiles"] = total_files
    if total_size is not None:
        payload["totalSize"] = total_size
    if title is not None:
        payload["title"] = title

    response = requests.post(f"{FIGPACK_API_BASE_URL}/api/figures/create", json=payload)

    if not response.ok:
        try:
            error_data = response.json()
            error_msg = error_data.get("message", "Unknown error")
        except:
            error_msg = f"HTTP {response.status_code}"
        raise Exception(f"Failed to create figure {figure_hash}: {error_msg}")

    response_data = response.json()
    if not response_data.get("success"):
        raise Exception(
            f"Failed to create figure {figure_hash}: {response_data.get('message', 'Unknown error')}"
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
        "apiKey": api_key,
    }

    response = requests.post(
        f"{FIGPACK_API_BASE_URL}/api/figures/finalize", json=payload
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


def _upload_bundle(tmpdir: str, api_key: str, title: str = None) -> str:
    """
    Upload the prepared bundle to the cloud using the new database-driven approach
    """
    tmpdir_path = pathlib.Path(tmpdir)

    # Compute deterministic figure ID based on file contents
    print("Computing deterministic figure ID...")
    figure_hash = _compute_deterministic_figure_hash(tmpdir_path)
    print(f"Figure hash: {figure_hash}")

    # Collect all files to upload
    all_files = []
    for file_path in tmpdir_path.rglob("*"):
        if file_path.is_file():
            relative_path = file_path.relative_to(tmpdir_path)
            all_files.append((str(relative_path), file_path))

    # Calculate total files and size for metadata
    total_files = len(all_files)
    total_size = sum(file_path.stat().st_size for _, file_path in all_files)
    print(
        f"Found {total_files} files to upload, total size: {total_size / (1024 * 1024):.2f} MB"
    )

    # Find available figure ID and create/get figure in database with metadata
    result = _create_or_get_figure(
        figure_hash, api_key, total_files, total_size, title=title
    )
    figure_info = result.get("figure", {})
    figure_url = figure_info.get("figureUrl")

    if figure_info["status"] == "completed":
        print(f"Figure already exists at: {figure_url}")
        return figure_url

    print(f"Using figure URL: {figure_url}")

    files_to_upload = all_files
    total_files_to_upload = len(files_to_upload)

    if total_files_to_upload == 0:
        print("No files to upload")
    else:
        print(
            f"Uploading {total_files_to_upload} files with up to {MAX_WORKERS_FOR_UPLOAD} concurrent uploads..."
        )

        # Thread-safe progress tracking
        uploaded_count = 0
        count_lock = threading.Lock()

        # Upload files in parallel with concurrent uploads
        with ThreadPoolExecutor(max_workers=MAX_WORKERS_FOR_UPLOAD) as executor:
            # Submit all upload tasks
            future_to_file = {
                executor.submit(
                    _upload_single_file, figure_url, rel_path, file_path, api_key
                ): rel_path
                for rel_path, file_path in files_to_upload
            }

            # Process completed uploads
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

    # Upload manifest.json
    print("Uploading manifest.json...")
    manifest_content = json.dumps(manifest, indent=2)
    manifest_size = len(manifest_content.encode("utf-8"))

    manifest_payload = {
        "figureUrl": figure_url,
        "relativePath": "manifest.json",
        "apiKey": api_key,
        "size": manifest_size,
    }

    response = requests.post(
        f"{FIGPACK_API_BASE_URL}/api/upload", json=manifest_payload
    )
    if not response.ok:
        try:
            error_data = response.json()
            error_msg = error_data.get("message", "Unknown error")
        except:
            error_msg = f"HTTP {response.status_code}"
        raise Exception(f"Failed to get signed URL for manifest.json: {error_msg}")

    response_data = response.json()
    if not response_data.get("success"):
        raise Exception(
            f"Failed to get signed URL for manifest.json: {response_data.get('message', 'Unknown error')}"
        )

    signed_url = response_data.get("signedUrl")
    if not signed_url:
        raise Exception("No signed URL returned for manifest.json")

    # Upload manifest using signed URL
    upload_response = requests.put(
        signed_url, data=manifest_content, headers={"Content-Type": "application/json"}
    )

    if not upload_response.ok:
        raise Exception(
            f"Failed to upload manifest.json to signed URL: HTTP {upload_response.status_code}"
        )

    # Finalize the figure upload
    print("Finalizing figure...")
    _finalize_figure(figure_url, api_key)
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
