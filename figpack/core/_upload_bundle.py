import time
import json
import uuid
import pathlib
import requests
import threading
import hashlib
from .. import __version__
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta, timezone

thisdir = pathlib.Path(__file__).parent.resolve()

FIGPACK_API_BASE_URL = "https://figpack-api.vercel.app"
TEMPORY_BASE_URL = "https://tempory.net/figpack/default/figures"


def _upload_single_file(
    figure_id: str, relative_path: str, file_path: pathlib.Path, passcode: str
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
        _upload_small_file(figure_id, relative_path, content, passcode)
    else:  # large file
        _upload_large_file(figure_id, relative_path, file_path, passcode)

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


def _check_existing_figure(figure_id: str) -> dict:
    """
    Check if a figure already exists and return its status

    Returns:
        dict: Contains 'exists' (bool) and 'status' (str) if exists
    """
    figpack_url = f"{TEMPORY_BASE_URL}/{figure_id}/figpack.json"

    try:
        response = requests.get(figpack_url, timeout=10)
        if response.ok:
            figpack_data = response.json()
            return {"exists": True, "status": figpack_data.get("status", "unknown")}
        else:
            return {"exists": False}
    except Exception:
        return {"exists": False}


def _find_available_figure_id(base_figure_id: str) -> tuple:
    """
    Find an available figure ID by checking base_figure_id, then base_figure_id-1, base_figure_id-2, etc.

    Returns:
        tuple: (figure_id_to_use, completed_figure_id) where:
               - figure_id_to_use is None if upload should be skipped
               - completed_figure_id is the ID of the completed figure if one exists
    """
    # First check the base figure ID
    result = _check_existing_figure(base_figure_id)
    if not result["exists"]:
        return (base_figure_id, None)
    elif result["status"] == "completed":
        print(
            f"Figure {base_figure_id} already exists and is completed. Skipping upload."
        )
        return (None, base_figure_id)  # Signal to skip upload, return completed ID

    # If exists but not completed, try with suffixes
    suffix = 1
    while True:
        candidate_id = f"{base_figure_id}-{suffix}"
        result = _check_existing_figure(candidate_id)

        if not result["exists"]:
            print(f"Using figure ID: {candidate_id}")
            return (candidate_id, None)
        elif result["status"] == "completed":
            print(
                f"Figure {candidate_id} already exists and is completed. Skipping upload."
            )
            return (None, candidate_id)  # Signal to skip upload, return completed ID

        suffix += 1
        if suffix > 100:  # Safety limit
            raise Exception(
                "Too many existing figure variants, unable to find available ID"
            )


def _upload_bundle(tmpdir: str, passcode: str) -> None:
    """
    Upload the prepared bundle to the cloud using parallel uploads
    """
    tmpdir_path = pathlib.Path(tmpdir)

    # Compute deterministic figure ID based on file contents
    print("Computing deterministic figure ID...")
    base_figure_id = _compute_deterministic_figure_id(tmpdir_path)
    print(f"Base figure ID: {base_figure_id}")

    # Find available figure ID (check for existing uploads)
    figure_id, completed_figure_id = _find_available_figure_id(base_figure_id)

    # If figure_id is None, it means we found a completed upload and should skip
    if figure_id is None:
        figure_url = f"{TEMPORY_BASE_URL}/{completed_figure_id}/index.html"
        print(f"Figure already exists at: {figure_url}")
        return figure_url

    print(f"Using figure ID: {figure_id}")

    # First, upload initial figpack.json with "uploading" status
    print("Uploading initial status...")
    figpack_json = {
        "status": "uploading",
        "upload_started": datetime.now(timezone.utc).isoformat(),
        "upload_updated": datetime.now(timezone.utc).isoformat(),
        "figure_id": figure_id,
        "figpack_version": __version__,
    }
    _upload_small_file(
        figure_id, "figpack.json", json.dumps(figpack_json, indent=2), passcode
    )

    # Collect all files to upload
    all_files = []
    for file_path in tmpdir_path.rglob("*"):
        if file_path.is_file():
            relative_path = file_path.relative_to(tmpdir_path)
            all_files.append((str(relative_path), file_path))

    print(f"Found {len(all_files)} files to upload")

    # Filter out figpack.json since we already uploaded the initial version
    files_to_upload = [
        (rel_path, file_path)
        for rel_path, file_path in all_files
        if rel_path != "figpack.json"
    ]
    total_files_to_upload = len(files_to_upload)

    if total_files_to_upload == 0:
        print("No additional files to upload")
    else:
        print(
            f"Uploading {total_files_to_upload} files with up to 8 concurrent uploads..."
        )

        # Thread-safe progress tracking
        uploaded_count = 0
        count_lock = threading.Lock()
        timer = time.time()

        # Upload files in parallel with concurrent uploads
        with ThreadPoolExecutor(max_workers=MAX_WORKERS_FOR_UPLOAD) as executor:
            # Submit all upload tasks
            future_to_file = {
                executor.submit(
                    _upload_single_file, figure_id, rel_path, file_path, passcode
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

                        # Update progress every 60 seconds
                        elapsed_time = time.time() - timer
                        if elapsed_time > 60:
                            figpack_json = {
                                **figpack_json,
                                "status": "uploading",
                                "upload_progress": f"{uploaded_count}/{total_files_to_upload}",
                                "upload_updated": datetime.now(
                                    timezone.utc
                                ).isoformat(),
                            }
                            _upload_small_file(
                                figure_id,
                                "figpack.json",
                                json.dumps(figpack_json, indent=2),
                                passcode,
                            )
                            print(
                                f"Updated figpack.json with progress: {uploaded_count}/{total_files_to_upload}"
                            )
                            timer = time.time()

                except Exception as e:
                    print(f"Failed to upload {relative_path}: {e}")
                    raise  # Re-raise the exception to stop the upload process

    # Create and upload manifest.json
    print("Creating manifest.json...")
    manifest = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "files": [],
        "total_size": 0,
        "total_files": len(files_to_upload),
    }

    for rel_path, file_path in files_to_upload:
        file_size = file_path.stat().st_size
        manifest["files"].append({"path": rel_path, "size": file_size})
        manifest["total_size"] += file_size

    _upload_small_file(
        figure_id, "manifest.json", json.dumps(manifest, indent=2), passcode
    )
    print("Uploaded manifest.json")
    print(f"Total size: {manifest['total_size'] / (1024 * 1024):.2f} MB")

    # Finally, upload completion status
    figpack_json = {
        **figpack_json,
        "status": "completed",
        "upload_completed": datetime.now(timezone.utc).isoformat(),
        "expiration": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
        "figure_id": figure_id,
        "total_files": len(all_files),
        "total_size": manifest["total_size"],
        "figpack_version": __version__,
    }
    _upload_small_file(
        figure_id, "figpack.json", json.dumps(figpack_json, indent=2), passcode
    )
    print("Upload completed successfully")

    figure_url = f"{TEMPORY_BASE_URL}/{figure_id}/index.html"
    return figure_url


def _determine_file_type(file_path: str) -> str:
    """
    Determine if a file should be uploaded as small or large
    Based on the validation logic in the API
    """
    # Check exact matches first
    if file_path == "figpack.json" or file_path == "index.html":
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
    figure_id: str, file_path: str, content: str, passcode: str
) -> None:
    """
    Upload a small file by sending content directly
    """
    destination_url = f"{TEMPORY_BASE_URL}/{figure_id}/{file_path}"

    try:
        content.encode("utf-8")
    except Exception as e:
        raise Exception(f"Content for {file_path} is not UTF-8 encodable: {e}")
    payload = {
        "destinationUrl": destination_url,
        "passcode": passcode,
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
    figure_id: str, file_path: str, local_file_path: pathlib.Path, passcode: str
) -> None:
    """
    Upload a large file using signed URL
    """
    destination_url = f"{TEMPORY_BASE_URL}/{figure_id}/{file_path}"
    file_size = local_file_path.stat().st_size

    # Get signed URL
    payload = {
        "destinationUrl": destination_url,
        "passcode": passcode,
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
