#!/usr/bin/env python3
"""
Script to find and delete figures marked as deleted in the figpack-figures R2 bucket.

This script:
1. Lists all figpack.json files in the bucket under figures/default/[id]/
2. Downloads and parses each figpack.json
3. Checks if "deleted": true
4. Presents a list of figures to delete
5. Asks for user confirmation
6. If confirmed, deletes all files for each marked figure

Usage:
    export AWS_ACCESS_KEY_ID=your_access_key
    export AWS_SECRET_ACCESS_KEY=your_secret_key
    export S3_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com

    python maintenance/find_deleted_figures.py

    # Or with custom bucket:
    python maintenance/find_deleted_figures.py --bucket my-bucket

    # Dry run (simulate without deleting):
    python maintenance/find_deleted_figures.py --dry-run
"""

import argparse
import json
import os
import sys
from typing import List, Dict, Any

try:
    import boto3
    from botocore.client import Config
except ImportError:
    print("Error: boto3 is required. Install it with: pip install boto3")
    sys.exit(1)


def get_s3_client(endpoint: str, access_key: str, secret_key: str):
    """Create and return an S3 client configured for R2."""
    return boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        config=Config(signature_version="s3v4"),
        region_name="auto",  # R2 uses 'auto' for region
    )


def list_figure_directories(
    s3_client, bucket_name: str, prefix: str = "figures/default/"
) -> List[str]:
    """List all figure directories under the given prefix using delimiter."""
    print(
        f"Scanning bucket '{bucket_name}' for figure directories with prefix '{prefix}'..."
    )

    figure_dirs = []
    paginator = s3_client.get_paginator("list_objects_v2")

    try:
        # Use delimiter to list "directories" without iterating through all files
        for page in paginator.paginate(
            Bucket=bucket_name, Prefix=prefix, Delimiter="/"
        ):
            if "CommonPrefixes" in page:
                for prefix_info in page["CommonPrefixes"]:
                    figure_dirs.append(prefix_info["Prefix"])

        print(f"Found {len(figure_dirs)} figure directories")
        return figure_dirs

    except Exception as e:
        print(f"Error listing directories: {e}")
        sys.exit(1)


def list_figpack_json_files(s3_client, bucket_name: str) -> List[str]:
    """Get the list of figpack.json file keys by listing directories first."""
    figure_dirs = list_figure_directories(s3_client, bucket_name)

    # Construct the path to each figpack.json file
    figpack_json_files = [f"{dir_prefix}figpack.json" for dir_prefix in figure_dirs]

    print(f"Will check {len(figpack_json_files)} figpack.json files")
    return figpack_json_files


def download_and_parse_json(s3_client, bucket_name: str, key: str) -> Dict[str, Any]:
    """Download and parse a JSON file from S3."""
    try:
        response = s3_client.get_object(Bucket=bucket_name, Key=key)
        content = response["Body"].read().decode("utf-8")
        return json.loads(content)
    except json.JSONDecodeError as e:
        print(f"Warning: Failed to parse JSON from {key}: {e}")
        return {}
    except s3_client.exceptions.NoSuchKey:
        # File doesn't exist - this is okay, not all directories may have figpack.json
        return {}
    except Exception as e:
        print(f"Warning: Failed to download {key}: {e}")
        return {}


def extract_figure_id(key: str) -> str:
    """Extract figure ID from the file key."""
    # key format: figures/default/[id]/figpack.json
    parts = key.split("/")
    if len(parts) >= 3:
        return parts[2]
    return "unknown"


def find_deleted_figures(s3_client, bucket_name: str) -> List[Dict[str, Any]]:
    """Find all figures marked as deleted."""
    figpack_json_files = list_figpack_json_files(s3_client, bucket_name)

    if not figpack_json_files:
        print("No figpack.json files found.")
        return []

    deleted_figures = []

    print("\nChecking each figpack.json file for 'deleted' flag...")
    for i, key in enumerate(figpack_json_files, 1):
        if i % 10 == 0 or i == len(figpack_json_files):
            print(f"Progress: {i}/{len(figpack_json_files)} files checked...", end="\r")

        figpack_data = download_and_parse_json(s3_client, bucket_name, key)

        if not figpack_data:
            continue

        # Check if deleted is True
        if figpack_data.get("deleted") is True:
            figure_id = extract_figure_id(key)
            deleted_figures.append(
                {
                    "id": figure_id,
                    "key": key,
                    "figureUrl": figpack_data.get("figureUrl", "N/A"),
                    "bucket": figpack_data.get("bucket", "N/A"),
                    "status": figpack_data.get("status", "N/A"),
                    "ownerEmail": figpack_data.get("ownerEmail", "N/A"),
                    "figpackVersion": figpack_data.get("figpackVersion", "N/A"),
                }
            )

    print()  # New line after progress
    return deleted_figures


def display_results(deleted_figures: List[Dict[str, Any]]):
    """Display the results in a formatted table."""
    if not deleted_figures:
        print("\n✓ No deleted figures found!")
        return

    print(f"\n{'=' * 80}")
    print(f"Found {len(deleted_figures)} figure(s) marked as deleted:")
    print(f"{'=' * 80}\n")

    for i, fig in enumerate(deleted_figures, 1):
        print(f"{i}. Figure ID: {fig['id']}")
        print(f"   URL: {fig['figureUrl']}")
        print(f"   Bucket: {fig['bucket']}")
        print(f"   Status: {fig['status']}")
        print(f"   Owner: {fig['ownerEmail']}")
        print(f"   Version: {fig['figpackVersion']}")
        print(f"   Key: {fig['key']}")
        print()

    print(f"{'=' * 80}\n")


def list_all_files_for_figure(
    s3_client, bucket_name: str, figure_prefix: str
) -> List[str]:
    """List all files under a figure's prefix."""
    files = []
    paginator = s3_client.get_paginator("list_objects_v2")

    try:
        for page in paginator.paginate(Bucket=bucket_name, Prefix=figure_prefix):
            if "Contents" in page:
                for obj in page["Contents"]:
                    files.append(obj["Key"])
        return files
    except Exception as e:
        print(f"  ✗ Error listing files for {figure_prefix}: {e}")
        return []


def delete_figure_files(
    s3_client, bucket_name: str, figure: Dict[str, Any], dry_run: bool = False
) -> Dict[str, Any]:
    """Delete all files for a given figure."""
    figure_id = figure["id"]
    # Extract the prefix from the figpack.json key
    # key format: figures/default/[id]/figpack.json -> prefix: figures/default/[id]/
    figure_prefix = f"figures/default/{figure_id}/"

    print(f"\n{'[DRY RUN] ' if dry_run else ''}Deleting figure: {figure_id}")
    print(f"  Figure URL: {figure['figureUrl']}")
    print(f"  Owner: {figure['ownerEmail']}")
    print(f"  Listing all files under {figure_prefix}...")

    # List all files for this figure
    files = list_all_files_for_figure(s3_client, bucket_name, figure_prefix)

    if not files:
        print(f"  ⚠️  No files found for figure {figure_id}")
        return {"success": False, "files_deleted": 0, "error": "No files found"}

    print(f"  Found {len(files)} file(s) to delete")

    if dry_run:
        print(f"  [DRY RUN] Would delete the following files:")
        for file_key in files:
            print(f"    - {file_key}")
        return {"success": True, "files_deleted": len(files), "dry_run": True}

    # Delete files in batches (S3 allows up to 1000 objects per delete request)
    deleted_count = 0
    errors = []

    # Process in batches of 1000
    batch_size = 1000
    for i in range(0, len(files), batch_size):
        batch = files[i : i + batch_size]

        try:
            # Print each file being deleted
            for file_key in batch:
                print(f"    Deleting: {file_key}")

            # Perform batch delete
            delete_objects = [{"Key": key} for key in batch]
            response = s3_client.delete_objects(
                Bucket=bucket_name, Delete={"Objects": delete_objects}
            )

            # Check for errors in the response
            if "Errors" in response:
                for error in response["Errors"]:
                    error_msg = f"Failed to delete {error['Key']}: {error['Message']}"
                    print(f"    ✗ {error_msg}")
                    errors.append(error_msg)

            # Count successfully deleted
            if "Deleted" in response:
                deleted_count += len(response["Deleted"])

        except Exception as e:
            error_msg = f"Error deleting batch: {e}"
            print(f"  ✗ {error_msg}")
            errors.append(error_msg)

    if errors:
        print(
            f"  ⚠️  Deleted {deleted_count}/{len(files)} files with {len(errors)} error(s)"
        )
        return {"success": False, "files_deleted": deleted_count, "errors": errors}
    else:
        print(
            f"  ✓ Successfully deleted {deleted_count} file(s) for figure {figure_id}"
        )
        return {"success": True, "files_deleted": deleted_count}


def delete_all_figures(
    s3_client,
    bucket_name: str,
    deleted_figures: List[Dict[str, Any]],
    dry_run: bool = False,
):
    """Delete all files for all deleted figures."""
    if not deleted_figures:
        return

    print(f"\n{'=' * 80}")
    print(f"{'[DRY RUN] ' if dry_run else ''}Starting deletion process...")
    print(f"{'=' * 80}")

    total_files_deleted = 0
    successful_figures = 0
    failed_figures = []

    for i, figure in enumerate(deleted_figures, 1):
        print(f"\n[{i}/{len(deleted_figures)}]", end=" ")
        result = delete_figure_files(s3_client, bucket_name, figure, dry_run)

        total_files_deleted += result.get("files_deleted", 0)

        if result.get("success"):
            successful_figures += 1
        else:
            failed_figures.append(
                {
                    "figure": figure,
                    "error": result.get("error", result.get("errors", "Unknown error")),
                }
            )

    # Print summary
    print(f"\n{'=' * 80}")
    print(f"{'[DRY RUN] ' if dry_run else ''}Deletion Summary:")
    print(f"{'=' * 80}")
    print(f"Total figures processed: {len(deleted_figures)}")
    print(f"Successfully deleted: {successful_figures}")
    print(f"Failed: {len(failed_figures)}")
    print(f"Total files deleted: {total_files_deleted}")

    if failed_figures:
        print(f"\nFailed figures:")
        for item in failed_figures:
            print(f"  - {item['figure']['id']}: {item['error']}")

    print(f"{'=' * 80}\n")


def confirm_and_delete(
    s3_client,
    bucket_name: str,
    deleted_figures: List[Dict[str, Any]],
    dry_run: bool = False,
):
    """Ask user for confirmation and delete if confirmed."""
    if not deleted_figures:
        return

    if dry_run:
        print("\n🔍 DRY RUN MODE - No files will actually be deleted")
        delete_all_figures(s3_client, bucket_name, deleted_figures, dry_run=True)
        return

    response = (
        input(
            f"\n⚠️  Do you want to PERMANENTLY DELETE these {len(deleted_figures)} figure(s) and all their files? (yes/no): "
        )
        .strip()
        .lower()
    )

    if response == "yes":
        delete_all_figures(s3_client, bucket_name, deleted_figures, dry_run=False)
    else:
        print("\nDeletion cancelled. No files were deleted.")


def main():
    parser = argparse.ArgumentParser(
        description="Find figures marked as deleted in the figpack R2 bucket",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--bucket",
        default="figpack-figures",
        help="Name of the R2 bucket (default: figpack-figures)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Simulate deletion without actually deleting files",
    )

    args = parser.parse_args()

    # Get credentials from environment variables
    access_key = os.environ.get("AWS_ACCESS_KEY_ID")
    secret_key = os.environ.get("AWS_SECRET_ACCESS_KEY")
    endpoint = os.environ.get("S3_ENDPOINT")

    # Validate credentials
    missing = []
    if not access_key:
        missing.append("AWS_ACCESS_KEY_ID")
    if not secret_key:
        missing.append("AWS_SECRET_ACCESS_KEY")
    if not endpoint:
        missing.append("S3_ENDPOINT")

    if missing:
        print("Error: Missing required environment variables:")
        for var in missing:
            print(f"  - {var}")
        print("\nPlease set these variables before running the script:")
        print("  export AWS_ACCESS_KEY_ID=your_access_key")
        print("  export AWS_SECRET_ACCESS_KEY=your_secret_key")
        print("  export S3_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com")
        sys.exit(1)

    print("Figpack Deleted Figures Finder")
    print("=" * 80)
    print(f"Bucket: {args.bucket}")
    print(f"Endpoint: {endpoint}")
    print("=" * 80)

    # Create S3 client
    s3_client = get_s3_client(endpoint, access_key, secret_key)

    # Find deleted figures
    deleted_figures = find_deleted_figures(s3_client, args.bucket)

    # Display results
    display_results(deleted_figures)

    # Ask for confirmation and delete
    confirm_and_delete(s3_client, args.bucket, deleted_figures, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
