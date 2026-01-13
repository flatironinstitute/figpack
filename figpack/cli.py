"""
Command-line interface for figpack
"""

import argparse
import json
import os
import pathlib
import sys
import tarfile
import tempfile
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, Tuple
from urllib.parse import urljoin

import requests

from . import __version__
from .core._view_figure import view_figure
from .core._patch_figure import patch_figure as core_patch_figure
from .core._revert_patch_figure import revert_patch_figure as core_revert_patch_figure
from .core._figure_utils import get_figure_base_url, download_file
from .core._upload_bundle import _upload_bundle
from .extensions import ExtensionManager

MAX_WORKERS_FOR_DOWNLOAD = 16


def get_figure_base_url(figure_url: str) -> str:
    """
    Get the base URL from any figpack URL

    Args:
        figure_url: Any figpack URL (may or may not end with /index.html)

    Returns:
        str: The base URL for the figure directory
    """
    # Handle URLs that end with /index.html
    if figure_url.endswith("/index.html"):
        base_url = figure_url[:-11]  # Remove "/index.html"
    elif figure_url.endswith("/"):
        base_url = figure_url[:-1]  # Remove trailing slash
    else:
        # Assume it's already a directory URL
        base_url = figure_url

    # Ensure it ends with a slash for urljoin to work properly
    if not base_url.endswith("/"):
        base_url += "/"

    return base_url


def download_file(
    base_url: str, file_info: Dict, temp_dir: pathlib.Path
) -> Tuple[str, bool]:
    """
    Download a single file from the figure

    Args:
        base_url: The base URL for the figure
        file_info: Dictionary with 'path' and 'size' keys
        temp_dir: Temporary directory to download to

    Returns:
        Tuple of (file_path, success)
    """
    file_path = file_info["path"]
    file_url = urljoin(base_url, file_path)

    try:
        response = requests.get(file_url, timeout=30)
        response.raise_for_status()

        # Create directory structure if needed
        local_file_path = temp_dir / file_path
        local_file_path.parent.mkdir(parents=True, exist_ok=True)

        # Write file content
        if file_path.endswith(
            (
                ".json",
                ".html",
                ".css",
                ".js",
                ".zattrs",
                ".zgroup",
                ".zarray",
                ".zmetadata",
            )
        ):
            # Text files
            local_file_path.write_text(response.text, encoding="utf-8")
        else:
            # Binary files
            local_file_path.write_bytes(response.content)

        return file_path, True

    except Exception as e:
        print(f"Failed to download {file_path}: {e}")
        return file_path, False


def download_figure(figure_url: str, dest_path: str) -> None:
    """
    Download a figure from a figpack URL and save as tar.gz

    Args:
        figure_url: The figpack URL
        dest_path: Destination path for the tar.gz file
    """
    print(f"Downloading figure from: {figure_url}")

    # Get base URL
    base_url = get_figure_base_url(figure_url)
    print(f"Base URL: {base_url}")

    # Check if manifest.json exists
    manifest_url = urljoin(base_url, "manifest.json")
    print("Checking for manifest.json...")

    try:
        response = requests.get(manifest_url, timeout=10)
        response.raise_for_status()
        manifest = response.json()
        print(f"Found manifest with {len(manifest['files'])} files")
    except requests.exceptions.RequestException as e:
        print(f"Error: Could not retrieve manifest.json from {manifest_url}: {e}")
        print("Make sure the URL points to a valid figpack figure with a manifest.")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid manifest.json format: {e}")
        sys.exit(1)

    # Create temporary directory for downloads
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = pathlib.Path(temp_dir)

        # Download all files in parallel
        print(
            f"Downloading {len(manifest['files'])} files with up to {MAX_WORKERS_FOR_DOWNLOAD} concurrent downloads..."
        )

        downloaded_count = 0
        failed_files = []
        count_lock = threading.Lock()

        with ThreadPoolExecutor(max_workers=MAX_WORKERS_FOR_DOWNLOAD) as executor:
            # Submit all download tasks
            future_to_file = {
                executor.submit(
                    download_file, base_url, file_info, temp_path
                ): file_info["path"]
                for file_info in manifest["files"]
            }

            # Process completed downloads
            for future in as_completed(future_to_file):
                file_path = future_to_file[future]
                try:
                    downloaded_path, success = future.result()

                    with count_lock:
                        if success:
                            downloaded_count += 1
                            print(
                                f"Downloaded {downloaded_count}/{len(manifest['files'])}: {downloaded_path}"
                            )
                        else:
                            failed_files.append(downloaded_path)

                except Exception as e:
                    with count_lock:
                        failed_files.append(file_path)
                        print(f"Failed to download {file_path}: {e}")

        if failed_files:
            print(f"Warning: Failed to download {len(failed_files)} files:")
            for failed_file in failed_files:
                print(f"  - {failed_file}")

            if len(failed_files) == len(manifest["files"]):
                print("Error: Failed to download any files. Aborting.")
                sys.exit(1)

        # Save manifest.json to temp directory
        manifest_path = temp_path / "manifest.json"
        manifest_path.write_text(json.dumps(manifest, indent=2))
        print("Added manifest.json to bundle")

        # Create tar.gz file
        print(f"Creating tar.gz archive: {dest_path}")
        dest_pathlib = pathlib.Path(dest_path)
        dest_pathlib.parent.mkdir(parents=True, exist_ok=True)

        with tarfile.open(dest_path, "w:gz") as tar:
            # Add all downloaded files (excluding figpack.json if it exists)
            for file_path in temp_path.rglob("*"):
                if file_path.is_file():
                    arcname = file_path.relative_to(temp_path)
                    # Skip figpack.json as requested
                    if str(arcname) != "figpack.json":
                        tar.add(file_path, arcname=arcname)

        # Count files in archive (excluding directories)
        archive_files = [
            f for f in temp_path.rglob("*") if f.is_file() and f.name != "figpack.json"
        ]
        total_size = sum(f.stat().st_size for f in archive_files)

        print(f"Archive created successfully!")
        print(
            f"Total files: {len(archive_files)} (including manifest.json, excluding figpack.json)"
        )
        print(f"Total size: {total_size / (1024 * 1024):.2f} MB")
        print(f"Archive saved to: {dest_path}")


def handle_extensions_command(args):
    """Handle extensions subcommands"""
    extension_manager = ExtensionManager()

    if args.extensions_command == "list":
        extension_manager.list_extensions()
    elif args.extensions_command == "install":
        if not args.extensions and not args.all:
            print("Error: No extensions specified. Use extension names or --all flag.")
            print("Example: figpack extensions install figpack_3d")
            print("         figpack extensions install --all")
            sys.exit(1)

        success = extension_manager.install_extensions(
            extensions=args.extensions, upgrade=args.upgrade, install_all=args.all
        )

        if not success:
            sys.exit(1)

    elif args.extensions_command == "uninstall":
        success = extension_manager.uninstall_extensions(args.extensions)

        if not success:
            sys.exit(1)
    else:
        print("Available extension commands:")
        print("  list      - List available extensions and their status")
        print("  install   - Install or upgrade extension packages")
        print("  uninstall - Uninstall extension packages")
        print()
        print("Use 'figpack extensions <command> --help' for more information.")


def download_and_view_archive(url: str, port: int = None) -> None:
    """
    Download a tar.gz/tgz archive from a URL and view it

    Args:
        url: URL to the tar.gz or tgz file
        port: Optional port number to serve on
    """
    if not (url.endswith(".tar.gz") or url.endswith(".tgz")):
        print(f"Error: URL must point to a .tar.gz or .tgz file: {url}")
        sys.exit(1)

    print(f"Downloading archive from: {url}")

    try:
        response = requests.get(url, timeout=60, stream=True)
        response.raise_for_status()

        # Create a temporary file to store the downloaded archive
        with tempfile.NamedTemporaryFile(suffix=".tar.gz", delete=False) as temp_file:
            temp_path = temp_file.name

            # Download with progress indication
            total_size = int(response.headers.get("content-length", 0))
            downloaded_size = 0

            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    temp_file.write(chunk)
                    downloaded_size += len(chunk)
                    if total_size > 0:
                        progress = (downloaded_size / total_size) * 100
                        print(
                            f"Downloaded: {downloaded_size / (1024*1024):.2f} MB ({progress:.1f}%)",
                            end="\r",
                        )

            if total_size > 0:
                print()  # New line after progress
            print(f"Download complete: {downloaded_size / (1024*1024):.2f} MB")

        # Now view the downloaded file
        try:
            view_figure(temp_path, port=port)
        finally:
            # Clean up the temporary file after viewing
            import os

            try:
                os.unlink(temp_path)
            except Exception:
                pass

    except requests.exceptions.RequestException as e:
        print(f"Error: Failed to download archive from {url}: {e}")
        sys.exit(1)


def patch_figure(figure_url: str, admin_override: bool = False) -> None:
    """
    CLI wrapper for patching a figure by updating its rendering code to the latest version

    Args:
        figure_url: The figpack URL to patch
        api_key: API key for authentication
        admin_override: If True, allows admins to patch figures they don't own
    """
    success = core_patch_figure(
        figure_url=figure_url,
        admin_override=admin_override,
        interactive=True,
        verbose=True,
    )

    if not success:
        sys.exit(1)


def revert_figure(figure_url: str, admin_override: bool = False) -> None:
    """
    CLI wrapper for reverting a patched figure to its previous rendering code

    Args:
        figure_url: The figpack URL to revert
        admin_override: If True, allows admins to revert figures they don't own
    """
    success = core_revert_patch_figure(
        figure_url=figure_url,
        admin_override=admin_override,
        interactive=True,
        verbose=True,
    )

    if not success:
        sys.exit(1)


def upload_figure(dir_path: str, title: str, description: str = None) -> None:
    """
    Upload a saved figure directory to figpack

    Args:
        dir_path: Path to the directory containing the figure bundle
        title: Title for the figure
        description: Optional description for the figure
    """
    # Validate directory path
    dir_pathlib = pathlib.Path(dir_path)
    if not dir_pathlib.exists():
        print(f"Error: Directory does not exist: {dir_path}")
        sys.exit(1)

    if not dir_pathlib.is_dir():
        print(f"Error: Path is not a directory: {dir_path}")
        sys.exit(1)

    # Check for API key
    api_key = os.getenv("FIGPACK_API_KEY", "")
    if not api_key:
        print("Error: FIGPACK_API_KEY environment variable not set.")
        print("Please set your API key with: export FIGPACK_API_KEY=your_api_key")
        sys.exit(1)

    # Validate figure bundle structure
    print(f"Validating figure bundle in: {dir_path}")

    # Check for required files (manifest.json is optional, will be created if missing)
    required_files = {
        "index.html": dir_pathlib / "index.html",
        "data.zarr": dir_pathlib / "data.zarr",
    }

    missing_files = []
    for file_name, file_path in required_files.items():
        if not file_path.exists():
            missing_files.append(file_name)

    if missing_files:
        print("Error: Invalid figure bundle. Missing required files:")
        for missing_file in missing_files:
            print(f"  - {missing_file}")
        print("\nA valid figure bundle must contain:")
        print("  - index.html (viewer)")
        print("  - data.zarr/ (zarr data directory)")
        sys.exit(1)

    # Validate zarr structure
    zarr_dir = dir_pathlib / "data.zarr"
    if not zarr_dir.is_dir():
        print("Error: data.zarr must be a directory")
        sys.exit(1)

    # Check for .zmetadata file (consolidated metadata)
    zmetadata_path = zarr_dir / ".zmetadata"
    if not zmetadata_path.exists():
        print("Warning: .zmetadata file not found in data.zarr/")
        print("This file is typically created when saving a figure.")

    # Check if manifest.json exists, create if missing
    manifest_path = dir_pathlib / "manifest.json"
    manifest_temp_file = None

    if not manifest_path.exists():
        print("manifest.json not found, creating one...")

        # Create manifest by scanning all files in the directory
        import time

        manifest = {
            "timestamp": time.time(),
            "files": [],
            "total_size": 0,
            "total_files": 0,
        }

        for file_path in dir_pathlib.rglob("*"):
            if file_path.is_file():
                rel_path = str(file_path.relative_to(dir_pathlib))
                file_size = file_path.stat().st_size
                manifest["files"].append({"path": rel_path, "size": file_size})
                manifest["total_size"] += file_size

        manifest["total_files"] = len(manifest["files"])

        # Create temporary manifest file
        manifest_temp_file = tempfile.NamedTemporaryFile(
            mode="w", suffix=".json", delete=False, dir=str(dir_pathlib)
        )
        manifest_temp_file.write(json.dumps(manifest, indent=2))
        manifest_temp_file.close()

        # Move temp file to manifest.json location
        temp_manifest_path = pathlib.Path(manifest_temp_file.name)
        temp_manifest_path.rename(manifest_path)

        print(f"Created manifest.json with {len(manifest['files'])} files")
    else:
        # Validate existing manifest.json
        try:
            with open(manifest_path) as f:
                manifest = json.load(f)
            if "files" not in manifest:
                print("Error: manifest.json is missing 'files' field")
                sys.exit(1)
            print(f"Found {len(manifest['files'])} files in manifest")
        except json.JSONDecodeError as e:
            print(f"Error: Invalid manifest.json format: {e}")
            sys.exit(1)
        except Exception as e:
            print(f"Error: Could not read manifest.json: {e}")
            sys.exit(1)

    # Override description in zarr attrs if provided
    if description is not None:
        print(f"Setting description from command line argument")
        import zarr

        try:
            zarr_group = zarr.open_group(str(zarr_dir), mode="r+")
            zarr_group.attrs["description"] = description
        except Exception as e:
            print(f"Warning: Could not update description in zarr data: {e}")

    # Upload the bundle
    print(f"\nUploading figure with title: '{title}'")
    if description:
        print(f"Description: {description}")

    try:
        figure_url = _upload_bundle(
            str(dir_pathlib),
            api_key,
            title=title,
            ephemeral=False,
            use_consolidated_metadata_only=True,
        )

        print(f"\n✓ Upload completed successfully!")
        print(f"\nFigure URL: {figure_url}")

    except Exception as e:
        print(f"\nError during upload: {e}")
        sys.exit(1)


def _old_revert_figure(
    figure_url: str, api_key: str, admin_override: bool = False
) -> None:
    """
    OLD IMPLEMENTATION - kept temporarily for reference
    Revert a patched figure to its previous rendering code

    Args:
        figure_url: The figpack URL to revert
        api_key: API key for authentication
        admin_override: If True, allows admins to revert figures they don't own
    """
    from .core.config import FIGPACK_API_BASE_URL

    print(f"Preparing to revert figure: {figure_url}")

    # Get base URL and extract figure ID
    base_url = get_figure_base_url(figure_url)
    figure_id = base_url.rstrip("/").split("/")[-1]

    # Find the most recent backup
    backup_dir = pathlib.Path.home() / ".figpack" / "patch_backups"

    if not backup_dir.exists():
        print("Error: No backup directory found")
        print(f"Expected location: {backup_dir}")
        sys.exit(1)

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
        print(f"Error: No backup found for figure {figure_id}")
        print(f"Backup directory: {backup_dir}")
        sys.exit(1)

    backup_subdir = matching_backups[0]
    print(f"Found backup: {backup_subdir}")

    # Load backup info
    backup_info_path = backup_subdir / "backup_info.json"
    if not backup_info_path.exists():
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
        print("Error: No files found in backup")
        sys.exit(1)

    print(f"Backup contains {len(backed_up_files)} files")
    print(f"\nThis will restore the rendering code to its previous state.")

    user_response = input("Do you want to proceed? (y/N): ").strip().lower()
    if user_response != "y":
        print("Revert cancelled.")
        sys.exit(0)

    # Prepare files for upload
    files_to_upload = []
    for file_path in backed_up_files:
        local_file = backup_subdir / file_path
        if local_file.exists():
            files_to_upload.append((file_path, local_file))
        else:
            print(f"Warning: Backup file not found: {file_path}")

    if not files_to_upload:
        print("Error: No files to upload from backup")
        sys.exit(1)

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
                print(f"Error: Failed to get signed URLs: {error_msg}")
                sys.exit(1)

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
                    print(f"Error: No signed URL for {relative_path}")
                    sys.exit(1)

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
                    print(
                        f"Error: Failed to upload {relative_path}: HTTP {upload_response.status_code}"
                    )
                    sys.exit(1)

                uploaded_count += 1
                print(
                    f"Uploaded {uploaded_count}/{len(files_to_upload)}: {relative_path}"
                )

        print(f"\n✓ Revert completed successfully!")
        print(f"  Restored {len(files_to_upload)} rendering files from backup")
        print(f"  Backup remains at: {backup_subdir}")

    except Exception as e:
        print(f"\nError during revert: {e}")
        sys.exit(1)


def main():
    """Main CLI entry point"""
    parser = argparse.ArgumentParser(
        description="figpack - A Python package for creating shareable, interactive visualizations",
        prog="figpack",
    )
    parser.add_argument("--version", action="version", version=f"figpack {__version__}")

    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # Download command
    download_parser = subparsers.add_parser(
        "download", help="Download a figure from a figpack URL"
    )
    download_parser.add_argument("figure_url", help="The figpack URL to download")
    download_parser.add_argument("dest", help="Destination path for the tar.gz file")

    # View command
    view_parser = subparsers.add_parser(
        "view", help="Extract and serve a figure archive locally"
    )
    view_parser.add_argument("archive", help="Path or URL to the tar.gz archive file")
    view_parser.add_argument(
        "--port", type=int, help="Port number to serve on (default: auto-select)"
    )

    # Patch figure command
    patch_figure_parser = subparsers.add_parser(
        "patch-figure", help="Update a figure's rendering code to the latest version"
    )
    patch_figure_parser.add_argument("figure_url", help="The figpack URL to patch")
    patch_figure_parser.add_argument(
        "--admin-override",
        action="store_true",
        help="Allow admin users to patch figures they don't own",
    )

    # Revert command
    revert_patch_figure_parser = subparsers.add_parser(
        "revert-patch-figure",
        help="Revert a patched figure to its previous rendering code",
    )
    revert_patch_figure_parser.add_argument(
        "figure_url", help="The figpack URL to revert"
    )
    revert_patch_figure_parser.add_argument(
        "--admin-override",
        action="store_true",
        help="Allow admin users to revert figures they don't own",
    )

    # Extensions command
    extensions_parser = subparsers.add_parser(
        "extensions", help="Manage figpack extension packages"
    )
    extensions_subparsers = extensions_parser.add_subparsers(
        dest="extensions_command", help="Extension management commands"
    )

    # Extensions list subcommand
    extensions_list_parser = extensions_subparsers.add_parser(
        "list", help="List available extensions and their status"
    )

    # Extensions install subcommand
    extensions_install_parser = extensions_subparsers.add_parser(
        "install", help="Install or upgrade extension packages"
    )
    extensions_install_parser.add_argument(
        "extensions",
        nargs="*",
        help="Extension package names to install (e.g., figpack_3d figpack_spike_sorting)",
    )
    extensions_install_parser.add_argument(
        "--all", action="store_true", help="Install all available extensions"
    )
    extensions_install_parser.add_argument(
        "--upgrade", action="store_true", help="Upgrade packages if already installed"
    )

    # Extensions uninstall subcommand
    extensions_uninstall_parser = extensions_subparsers.add_parser(
        "uninstall", help="Uninstall extension packages"
    )
    extensions_uninstall_parser.add_argument(
        "extensions", nargs="+", help="Extension package names to uninstall"
    )

    # Upload command
    upload_parser = subparsers.add_parser(
        "upload", help="Upload a saved figure directory to figpack"
    )
    upload_parser.add_argument("dir_path", help="Path to the figure directory")
    upload_parser.add_argument("--title", required=True, help="Title for the figure")
    upload_parser.add_argument(
        "--description", help="Description for the figure (optional)"
    )

    args = parser.parse_args()

    if args.command == "download":
        download_figure(args.figure_url, args.dest)
    elif args.command == "view":
        # Check if archive argument is a URL
        if args.archive.startswith("http://") or args.archive.startswith("https://"):
            download_and_view_archive(args.archive, port=args.port)
        else:
            view_figure(args.archive, port=args.port)
    elif args.command == "patch-figure":
        patch_figure(args.figure_url, admin_override=args.admin_override)
    elif args.command == "revert-patch-figure":
        revert_figure(args.figure_url, admin_override=args.admin_override)
    elif args.command == "upload":
        upload_figure(args.dir_path, args.title, args.description)
    elif args.command == "extensions":
        handle_extensions_command(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
