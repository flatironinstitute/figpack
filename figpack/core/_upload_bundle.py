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

thisdir = pathlib.Path(__file__).parent.resolve()

FIGPACK_API_BASE_URL = "https://figpack-api.vercel.app"
FIGPACK_FIGURES_BASE_URL = "https://figures.figpack.org/figures/default"


def _upload_single_file(
    figure_id: str, relative_path: str, file_path: pathlib.Path, api_key: str
) -> str:
    """
    Worker function to upload a single file

    Returns:
        str: The relative path of the uploaded file
    """
    file_type = _determine_file_type(relative_path)

    if file_type == "small":
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
        _upload_small_file(figure_id, relative_path, content, api_key)
    else:  # large file
        _upload_large_file(figure_id, relative_path, file_path, api_key)

    return relative_path


MAX_WORKERS_FOR_UPLOAD = 16


def _compute_deterministic_figure_id(tmpdir_path: pathlib.Path) -> str:
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
    figure_id: str, api_key: str, total_files: int = None, total_size: int = None
) -> dict:
    """
    Create a new figure or get existing figure information

    Returns:
        dict: Figure information from the API
    """
    payload = {"figureId": figure_id, "apiKey": api_key, "figpackVersion": __version__}

    if total_files is not None:
        payload["totalFiles"] = total_files
    if total_size is not None:
        payload["totalSize"] = total_size

    response = requests.post(f"{FIGPACK_API_BASE_URL}/api/figures/create", json=payload)

    if not response.ok:
        try:
            error_data = response.json()
            error_msg = error_data.get("message", "Unknown error")
        except:
            error_msg = f"HTTP {response.status_code}"
        raise Exception(f"Failed to create figure {figure_id}: {error_msg}")

    response_data = response.json()
    if not response_data.get("success"):
        raise Exception(
            f"Failed to create figure {figure_id}: {response_data.get('message', 'Unknown error')}"
        )

    return response_data


def _finalize_figure(figure_id: str, api_key: str) -> dict:
    """
    Finalize a figure upload

    Returns:
        dict: Figure information from the API
    """
    payload = {
        "figureId": figure_id,
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
        raise Exception(f"Failed to finalize figure {figure_id}: {error_msg}")

    response_data = response.json()
    if not response_data.get("success"):
        raise Exception(
            f"Failed to finalize figure {figure_id}: {response_data.get('message', 'Unknown error')}"
        )

    return response_data


def _find_available_figure_id(
    base_figure_id: str, api_key: str, total_files: int = None, total_size: int = None
) -> tuple:
    """
    Find an available figure ID by trying to create figures with incremental suffixes

    Returns:
        tuple: (figure_id_to_use, figure_info) where:
               - figure_id_to_use is the ID to use for upload
               - figure_info is the figure information if it already exists and is completed
    """
    # First try the base figure ID
    try:
        result = _create_or_get_figure(base_figure_id, api_key, total_files, total_size)
        figure_info = result.get("figure", {})

        if figure_info.get("status") == "completed":
            print(
                f"Figure {base_figure_id} already exists and is completed. Skipping upload."
            )
            return (None, figure_info)
        else:
            print(f"Using figure ID: {base_figure_id}")
            return (base_figure_id, figure_info)
    except Exception as e:
        print(f"Error checking figure {base_figure_id}: {e}")

    # If base ID failed, try with suffixes
    suffix = 1
    while suffix <= 100:  # Safety limit
        candidate_id = f"{base_figure_id}-{suffix}"
        try:
            result = _create_or_get_figure(
                candidate_id, api_key, total_files, total_size
            )
            figure_info = result.get("figure", {})

            if figure_info.get("status") == "completed":
                print(
                    f"Figure {candidate_id} already exists and is completed. Skipping upload."
                )
                return (None, figure_info)
            else:
                print(f"Using figure ID: {candidate_id}")
                return (candidate_id, figure_info)
        except Exception as e:
            print(f"Error checking figure {candidate_id}: {e}")
            suffix += 1
            continue

    raise Exception("Too many existing figure variants, unable to find available ID")


def _upload_bundle(tmpdir: str, api_key: str) -> str:
    """
    Upload the prepared bundle to the cloud using the new database-driven approach
    """
    tmpdir_path = pathlib.Path(tmpdir)

    # Compute deterministic figure ID based on file contents
    print("Computing deterministic figure ID...")
    base_figure_id = _compute_deterministic_figure_id(tmpdir_path)
    print(f"Base figure ID: {base_figure_id}")

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
    figure_id, completed_figure_info = _find_available_figure_id(
        base_figure_id, api_key, total_files, total_size
    )

    # If figure_id is None, it means we found a completed upload and should skip
    if figure_id is None:
        figure_url = (
            f"{FIGPACK_FIGURES_BASE_URL}/{completed_figure_info['figureId']}/index.html"
        )
        print(f"Figure already exists at: {figure_url}")
        return figure_url

    print(f"Using figure ID: {figure_id}")

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
                    _upload_single_file, figure_id, rel_path, file_path, api_key
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

    # Upload manifest.json as a small file
    print("Uploading manifest.json...")
    _upload_small_file(
        figure_id, "manifest.json", json.dumps(manifest, indent=2), api_key
    )

    # Finalize the figure upload
    print("Finalizing figure...")
    _finalize_figure(figure_id, api_key)
    print("Upload completed successfully")

    figure_url = f"{FIGPACK_FIGURES_BASE_URL}/{figure_id}/index.html"
    return figure_url


def _determine_file_type(file_path: str) -> str:
    """
    Determine if a file should be uploaded as small or large
    Based on the validation logic in the API
    """
    # Check exact matches first
    if file_path == "index.html":
        return "small"

    # Check zarr metadata files
    if (
        file_path.endswith(".zattrs")
        or file_path.endswith(".zgroup")
        or file_path.endswith(".zarray")
        or file_path.endswith(".zmetadata")
    ):
        return "small"

    # Check HTML files
    if file_path.endswith(".html"):
        return "small"

    # Check data.zarr directory
    if file_path.startswith("data.zarr/"):
        file_name = file_path[len("data.zarr/") :]
        # Check if it's a zarr chunk (numeric like 0.0.1)
        if _is_zarr_chunk(file_name):
            return "large"
        # Check for zarr metadata files in subdirectories
        if (
            file_name.endswith(".zattrs")
            or file_name.endswith(".zgroup")
            or file_name.endswith(".zarray")
            or file_name.endswith(".zmetadata")
        ):
            return "small"

    # Check assets directory
    if file_path.startswith("assets/"):
        file_name = file_path[len("assets/") :]
        if file_name.endswith(".js") or file_name.endswith(".css"):
            return "large"

    # Default to large file
    return "large"


def _is_zarr_chunk(file_name: str) -> bool:
    """
    Check if filename consists only of numbers and dots (zarr chunk pattern)
    """
    for char in file_name:
        if char != "." and not char.isdigit():
            return False
    return (
        len(file_name) > 0
        and not file_name.startswith(".")
        and not file_name.endswith(".")
    )


def _upload_small_file(
    figure_id: str, file_path: str, content: str, api_key: str
) -> None:
    """
    Upload a small file by sending content directly using the new API format
    """
    try:
        content.encode("utf-8")
    except Exception as e:
        raise Exception(f"Content for {file_path} is not UTF-8 encodable: {e}")

    # Use new API format with figureId and relativePath
    payload = {
        "figureId": figure_id,
        "relativePath": file_path,
        "apiKey": api_key,
        "content": content,
    }

    # check that payload is json serializable
    try:
        json.dumps(payload)
    except Exception as e:
        raise Exception(f"Payload for {file_path} is not JSON serializable: {e}")

    response = requests.post(f"{FIGPACK_API_BASE_URL}/api/upload", json=payload)

    if not response.ok:
        try:
            error_data = response.json()
            error_msg = error_data.get("message", "Unknown error")
        except:
            error_msg = f"HTTP {response.status_code}"
        raise Exception(f"Failed to upload {file_path}: {error_msg}")


def _upload_large_file(
    figure_id: str, file_path: str, local_file_path: pathlib.Path, api_key: str
) -> None:
    """
    Upload a large file using signed URL with the new API format
    """
    file_size = local_file_path.stat().st_size

    # Get signed URL using new API format
    payload = {
        "figureId": figure_id,
        "relativePath": file_path,
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
        raise Exception(f"Failed to get signed URL for {file_path}: {error_msg}")

    response_data = response.json()
    if not response_data.get("success"):
        raise Exception(
            f"Failed to get signed URL for {file_path}: {response_data.get('message', 'Unknown error')}"
        )

    signed_url = response_data.get("signedUrl")
    if not signed_url:
        raise Exception(f"No signed URL returned for {file_path}")

    # Upload file to signed URL
    content_type = _determine_content_type(file_path)
    with open(local_file_path, "rb") as f:
        upload_response = requests.put(
            signed_url, data=f, headers={"Content-Type": content_type}
        )

    if not upload_response.ok:
        raise Exception(
            f"Failed to upload {file_path} to signed URL: HTTP {upload_response.status_code}"
        )


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
