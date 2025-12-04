"""
Core functionality for reverting patched figpack figures
"""

import json
import os
import pathlib
from urllib.parse import urljoin

import requests

from .config import FIGPACK_API_BASE_URL
from ._figure_utils import get_figure_base_url


def revert_patch_figure(
    figure_url: str,
    admin_override: bool = False,
    interactive: bool = True,
    verbose: bool = True,
) -> bool:
    """
    Revert a patched figure to its previous rendering code

    Args:
        figure_url: The figpack URL to revert
        admin_override: If True, allows admins to revert figures they don't own
        interactive: If True, prompts for user confirmation before proceeding
        verbose: If True, prints status messages

    Returns:
        bool: True if successful, False otherwise
    """
    if verbose:
        print(f"Preparing to revert figure: {figure_url}")

    api_key = os.getenv("FIGPACK_API_KEY", "")
    if not api_key:
        if verbose:
            print("Error: FIGPACK_API_KEY environment variable not set.")
        return False

    # Get base URL and extract figure ID
    base_url = get_figure_base_url(figure_url)
    figure_id = base_url.rstrip("/").split("/")[-1]

    # Find the most recent backup
    backup_dir = pathlib.Path.home() / ".figpack" / "patch_backups"

    if not backup_dir.exists():
        if verbose:
            print("Error: No backup directory found")
            print(f"Expected location: {backup_dir}")
        return False

    # Find all backups for this figure
    matching_backups = sorted(
        [
            d
            for d in backup_dir.iterdir()
            if d.is_dir() and d.name.startswith(f"{figure_id}_")
        ],
        key=lambda x: x.name.split("_")[-1],
        reverse=True,
    )

    if not matching_backups:
        if verbose:
            print(f"Error: No backup found for figure {figure_id}")
            print(f"Backup directory: {backup_dir}")
        return False

    backup_subdir = matching_backups[0]
    if verbose:
        print(f"Found backup: {backup_subdir}")

    # Load backup info
    backup_info_path = backup_subdir / "backup_info.json"
    if not backup_info_path.exists():
        if verbose:
            print("Warning: backup_info.json not found, proceeding anyway...")
        backed_up_files = []
        for item in backup_subdir.rglob("*"):
            if item.is_file() and item.name != "backup_info.json":
                rel_path = item.relative_to(backup_subdir)
                backed_up_files.append(str(rel_path))
    else:
        with open(backup_info_path) as f:
            backup_info = json.load(f)
            backed_up_files = backup_info.get("backed_up_files", [])

    if not backed_up_files:
        if verbose:
            print("Error: No files found in backup")
        return False

    if verbose:
        print(f"Backup contains {len(backed_up_files)} files")
        print(f"\nThis will restore the rendering code to its previous state.")

    if interactive:
        user_response = input("Do you want to proceed? (y/N): ").strip().lower()
        if user_response != "y":
            if verbose:
                print("Revert cancelled.")
            return False

    # Prepare files for upload
    files_to_upload = []
    for file_path in backed_up_files:
        local_file = backup_subdir / file_path
        if local_file.exists():
            files_to_upload.append((file_path, local_file))
        else:
            if verbose:
                print(f"Warning: Backup file not found: {file_path}")

    if not files_to_upload:
        if verbose:
            print("Error: No files to upload from backup")
        return False

    if verbose:
        print(f"\nUploading {len(files_to_upload)} files from backup...")

    headers = {
        "Content-Type": "application/json",
        "x-api-key": api_key,
    }

    try:
        uploaded_count = 0
        batch_size = 20

        for i in range(0, len(files_to_upload), batch_size):
            batch = files_to_upload[i : i + batch_size]

            # Prepare batch request
            files_data = []
            for relative_path, file_path in batch:
                file_size = file_path.stat().st_size
                files_data.append({"relativePath": relative_path, "size": file_size})

            payload = {
                "figureUrl": figure_url,
                "files": files_data,
            }

            # Add admin override flag if specified
            if admin_override:
                payload["adminOverride"] = True

            # Get signed URLs
            response = requests.post(
                f"{FIGPACK_API_BASE_URL}/upload",
                json=payload,
                headers=headers,
                timeout=30,
            )

            if not response.ok:
                error_msg = (
                    response.json().get("message", "Unknown error")
                    if response.headers.get("content-type", "").startswith(
                        "application/json"
                    )
                    else f"HTTP {response.status_code}"
                )
                if verbose:
                    print(f"Error: Failed to get signed URLs: {error_msg}")
                return False

            response_data = response.json()
            signed_urls_data = response_data.get("signedUrls", [])

            # Upload files with signed URLs
            for relative_path, file_path in batch:
                # Find the signed URL for this file
                signed_url = None
                for url_info in signed_urls_data:
                    if url_info["relativePath"] == relative_path:
                        signed_url = url_info["signedUrl"]
                        break

                if not signed_url:
                    if verbose:
                        print(f"Error: No signed URL for {relative_path}")
                    return False

                # Determine content type
                if relative_path.endswith(".html"):
                    content_type = "text/html"
                elif relative_path.endswith(".js"):
                    content_type = "application/javascript"
                elif relative_path.endswith(".css"):
                    content_type = "text/css"
                elif relative_path.endswith(".json"):
                    content_type = "application/json"
                else:
                    content_type = "application/octet-stream"

                # Upload file
                with open(file_path, "rb") as f:
                    upload_response = requests.put(
                        signed_url,
                        data=f,
                        headers={"Content-Type": content_type},
                        timeout=60,
                    )

                if not upload_response.ok:
                    if verbose:
                        print(
                            f"Error: Failed to upload {relative_path}: HTTP {upload_response.status_code}"
                        )
                    return False

                uploaded_count += 1
                if verbose:
                    print(
                        f"Uploaded {uploaded_count}/{len(files_to_upload)}: {relative_path}"
                    )

        if verbose:
            print(f"\n✓ Revert completed successfully!")
            print(f"  Restored {len(files_to_upload)} rendering files from backup")
            print(f"  Backup remains at: {backup_subdir}")

        return True

    except Exception as e:
        if verbose:
            print(f"\nError during revert: {e}")
        return False
