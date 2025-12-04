"""
Core functionality for patching figpack figures

# Note: At this point, extensions are not patched.
# Will need to figure out how to allow patching user to specify how to find the .js files for the extensions.
# Not sure best way to do this yet.
"""

import json
import pathlib
import time
from typing import Optional
from urllib.parse import urljoin

import requests

from .. import __version__
from .config import FIGPACK_API_BASE_URL
from ._figure_utils import get_figure_base_url


def patch_figure(
    figure_url: str,
    api_key: str,
    admin_override: bool = False,
    interactive: bool = True,
    verbose: bool = True,
) -> bool:
    """
    Patch a figure by updating its rendering code to the latest version

    Args:
        figure_url: The figpack URL to patch
        api_key: API key for authentication
        admin_override: If True, allows admins to patch figures they don't own
        interactive: If True, prompts for user confirmation before proceeding
        verbose: If True, prints status messages

    Returns:
        bool: True if successful, False otherwise
    """
    thisdir = pathlib.Path(__file__).parent.parent.resolve()

    if verbose:
        print(f"Preparing to patch figure: {figure_url}")

    # Get base URL
    base_url = get_figure_base_url(figure_url)

    # First, verify the figure exists and get its info
    if verbose:
        print("Verifying figure ownership...")

    headers = {
        "Content-Type": "application/json",
        "x-api-key": api_key,
    }

    # Check if we can get the manifest (figure exists)
    manifest_url = urljoin(base_url, "manifest.json")
    try:
        response = requests.get(manifest_url, timeout=10)
        response.raise_for_status()
        manifest = response.json()
    except requests.exceptions.RequestException as e:
        if verbose:
            print(f"Error: Could not access figure at {figure_url}: {e}")
        return False

    # Get figure owner if using admin override
    figure_owner = None
    if admin_override:
        # Get figpack.json to find the owner
        figpack_json_url = urljoin(base_url, "figpack.json")
        try:
            response = requests.get(figpack_json_url, timeout=10)
            response.raise_for_status()
            figpack_data = response.json()
            figure_owner = figpack_data.get("ownerEmail", "unknown")
        except:
            # If figpack.json doesn't exist, try to infer from API
            pass

    # Show warning and get confirmation
    if interactive:
        if verbose:
            print(f"\n⚠️  WARNING ⚠️")
            if admin_override and figure_owner:
                print(f"⚠️  ADMIN OVERRIDE: Modifying figure owned by {figure_owner}")
            print(
                f"This will update the rendering code (index.html, assets/*, extension-*.js)"
            )
            print(f"to figpack version {__version__}")
            print(
                f"\nThis might break the figure if the data format has changed between versions."
            )
            print(
                f"\nA backup of the current rendering files will be saved locally to allow reverting."
            )

        user_response = input("\nDo you want to proceed? (y/N): ").strip().lower()
        if user_response != "y":
            if verbose:
                print("Patch cancelled.")
            return False

    # Create backup directory
    backup_dir = pathlib.Path.home() / ".figpack" / "patch_backups"
    backup_dir.mkdir(parents=True, exist_ok=True)

    # Extract figure ID from URL for backup naming
    figure_id = base_url.rstrip("/").split("/")[-1]
    timestamp = int(time.time())
    backup_subdir = backup_dir / f"{figure_id}_{timestamp}"
    backup_subdir.mkdir(exist_ok=True)

    if verbose:
        print(f"\nCreating backup in: {backup_subdir}")

    # Download current rendering files for backup
    rendering_files = []
    for file_info in manifest["files"]:
        file_path = file_info["path"]
        # Only backup rendering files
        if (
            file_path == "index.html"
            or file_path.startswith("assets/")
            or file_path.startswith("extension-")
            or file_path == "extension_manifest.json"
        ):
            rendering_files.append(file_info)

    if verbose:
        print(f"Backing up {len(rendering_files)} rendering files...")

    # Download rendering files to backup
    failed_backups = []
    for file_info in rendering_files:
        file_path = file_info["path"]
        file_url = urljoin(base_url, file_path)

        try:
            response = requests.get(file_url, timeout=30)
            response.raise_for_status()

            local_file_path = backup_subdir / file_path
            local_file_path.parent.mkdir(parents=True, exist_ok=True)

            if file_path.endswith((".json", ".html", ".css", ".js")):
                local_file_path.write_text(response.text, encoding="utf-8")
            else:
                local_file_path.write_bytes(response.content)

        except Exception as e:
            if verbose:
                print(f"Warning: Failed to backup {file_path}: {e}")
            failed_backups.append(file_path)

    if failed_backups:
        if verbose:
            print(f"\nWarning: Failed to backup {len(failed_backups)} files")
        if interactive:
            user_response = input("Continue with patch anyway? (y/N): ").strip().lower()
            if user_response != "y":
                if verbose:
                    print("Patch cancelled.")
                return False
        else:
            # In non-interactive mode, continue anyway
            if verbose:
                print("Continuing with patch despite backup failures...")
    else:
        if verbose:
            print("Backup completed successfully")

    # Save backup info file
    backup_info = {
        "figure_url": figure_url,
        "timestamp": timestamp,
        "original_version": "unknown",
        "patched_version": __version__,
        "backed_up_files": [
            f["path"] for f in rendering_files if f["path"] not in failed_backups
        ],
    }

    backup_info_path = backup_subdir / "backup_info.json"
    backup_info_path.write_text(json.dumps(backup_info, indent=2))

    # Now prepare the new rendering files from the current installation
    if verbose:
        print(f"\nPreparing patch files from figpack version {__version__}...")

    html_dir = thisdir / "figpack-figure-dist"
    if not html_dir.exists():
        if verbose:
            print(f"Error: figpack-figure-dist directory not found at {html_dir}")
        return False

    # Collect all files to upload
    files_to_upload = []

    for item in html_dir.iterdir():
        if item.is_file():
            files_to_upload.append((str(item.name), item))
        elif item.is_dir() and item.name == "assets":
            for subitem in item.iterdir():
                if subitem.is_file():
                    files_to_upload.append((f"assets/{subitem.name}", subitem))

    if verbose:
        print(f"Uploading {len(files_to_upload)} rendering files...")

    # Upload the new rendering files
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
                    if not admin_override:
                        print(
                            "If you are an admin user, consider using the admin_override parameter to patch figures you don't own."
                        )
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
            print(f"\n✓ Patch completed successfully!")
            print(
                f"  Updated {len(files_to_upload)} rendering files to version {__version__}"
            )
            print(f"  Backup saved to: {backup_subdir}")
            print(f"\nTo revert this patch, use revert_patch_figure() or run:")
            print(f"  figpack revert-patch-figure {figure_url}")

        return True

    except Exception as e:
        if verbose:
            print(f"\nError during upload: {e}")
            print(f"\nBackup is still available at: {backup_subdir}")
            print(f"You can manually revert if needed")
        return False
