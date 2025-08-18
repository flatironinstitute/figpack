#!/usr/bin/env python3
"""
Figpack Cleanup Script

This script iterates through all figures in the figures.figpack.org bucket,
reads their figpack.json files, reports on their status and timestamps,
and selectively deletes figures based on expiration or stale upload status.

Deletion Criteria:
- Figures that are expired (current time > expiration time)
- Figures with status != "completed" and not updated for more than 1 hour

Usage:
    python devel/cleanup.py

Environment Variables Required:
    FIGPACK_AWS_ACCESS_KEY_ID - AWS access key ID for R2 bucket
    FIGPACK_AWS_SECRET_ACCESS_KEY - AWS secret access key for R2 bucket
    FIGPACK_S3_ENDPOINT - S3 endpoint URL for R2 bucket
"""

import os
import json
import boto3
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
import sys


def get_s3_client():
    """
    Create and return an S3 client configured for Cloudflare R2
    """
    access_key_id = os.environ.get("FIGPACK_AWS_ACCESS_KEY_ID")
    secret_access_key = os.environ.get("FIGPACK_AWS_SECRET_ACCESS_KEY")
    endpoint_url = os.environ.get("FIGPACK_S3_ENDPOINT")

    if not access_key_id:
        raise EnvironmentError(
            "FIGPACK_AWS_ACCESS_KEY_ID environment variable must be set"
        )
    if not secret_access_key:
        raise EnvironmentError(
            "FIGPACK_AWS_SECRET_ACCESS_KEY environment variable must be set"
        )
    if not endpoint_url:
        raise EnvironmentError("FIGPACK_S3_ENDPOINT environment variable must be set")

    # Configure boto3 for Cloudflare R2
    s3_client = boto3.client(
        "s3",
        endpoint_url=endpoint_url,
        aws_access_key_id=access_key_id,
        aws_secret_access_key=secret_access_key,
        region_name="auto",  # R2 uses 'auto' as region
    )

    return s3_client


def list_all_figures(s3_client) -> List[str]:
    """
    List all figure IDs in the bucket by looking for figpack/ prefix
    """
    bucket_name = "figpack-figures"
    prefix = "figures/default/"

    figure_ids = []
    paginator = s3_client.get_paginator("list_objects_v2")

    try:
        for page in paginator.paginate(
            Bucket=bucket_name, Prefix=prefix, Delimiter="/"
        ):
            # Get figure IDs from common prefixes (directories)
            for common_prefix in page.get("CommonPrefixes", []):
                prefix_path = common_prefix["Prefix"]
                # Extract figure ID from path like 'figures/default/uuid/'
                figure_id = prefix_path.replace(prefix, "").rstrip("/")
                if figure_id:  # Skip empty strings
                    figure_ids.append(figure_id)
    except Exception as e:
        print(f"Error listing figures: {e}")
        return []

    return figure_ids


def get_figpack_json(s3_client, figure_id: str) -> Optional[Dict[str, Any]]:
    """
    Retrieve and parse the figpack.json file for a given figure ID
    """
    bucket_name = "figpack-figures"
    key = f"figures/default/{figure_id}/figpack.json"

    try:
        response = s3_client.get_object(Bucket=bucket_name, Key=key)
        content = response["Body"].read().decode("utf-8")
        return json.loads(content)
    except s3_client.exceptions.NoSuchKey:
        return None
    except Exception as e:
        print(f"Error reading figpack.json for {figure_id}: {e}")
        return None


def format_timestamp(timestamp_str: Optional[str]) -> str:
    """
    Format ISO timestamp string for display
    """
    if not timestamp_str:
        return "N/A"

    try:
        dt = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))
        return dt.strftime("%Y-%m-%d %H:%M:%S UTC")
    except Exception:
        return timestamp_str


def calculate_time_remaining(expiration_str: Optional[str]) -> str:
    """
    Calculate time remaining until expiration
    """
    if not expiration_str:
        return "N/A"

    try:
        expiration_dt = datetime.fromisoformat(expiration_str.replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)

        if expiration_dt <= now:
            return "EXPIRED"

        time_diff = expiration_dt - now
        days = time_diff.days
        hours, remainder = divmod(time_diff.seconds, 3600)
        minutes, _ = divmod(remainder, 60)

        if days > 0:
            return f"{days}d {hours}h {minutes}m"
        elif hours > 0:
            return f"{hours}h {minutes}m"
        else:
            return f"{minutes}m"
    except Exception:
        return "Invalid"


def should_delete_figure(figpack_data: Optional[Dict[str, Any]]) -> tuple[bool, str]:
    """
    Determine if a figure should be deleted based on expiration or stale upload status.
    Returns (should_delete, reason)
    """
    if not figpack_data:
        return False, "No figpack.json found"

    now = datetime.now(timezone.utc)

    # Check if expired
    expiration_str = figpack_data.get("expiration")
    if expiration_str:
        try:
            expiration_dt = datetime.fromisoformat(
                expiration_str.replace("Z", "+00:00")
            )
            if now > expiration_dt:
                return True, "Figure is expired"
        except Exception:
            pass  # Invalid expiration format, continue with other checks

    # Check if status is not completed and updated time is more than 1 hour ago
    status = figpack_data.get("status", "").lower()
    if status != "completed":
        upload_updated_str = figpack_data.get("upload_updated")
        if upload_updated_str:
            try:
                updated_dt = datetime.fromisoformat(
                    upload_updated_str.replace("Z", "+00:00")
                )
                time_diff = now - updated_dt
                if time_diff.total_seconds() > 3600:  # 1 hour = 3600 seconds
                    return (
                        True,
                        f"Status '{status}' and not updated for {time_diff.total_seconds()/3600:.1f} hours",
                    )
            except Exception:
                pass  # Invalid timestamp format

    return False, "Figure is current and completed"


def delete_figure(s3_client, figure_id: str) -> bool:
    """
    Delete all files for a given figure ID
    """
    bucket_name = "figpack-figures"
    prefix = f"figures/default/{figure_id}/"

    try:
        # List all objects with this prefix
        paginator = s3_client.get_paginator("list_objects_v2")
        objects_to_delete = []

        for page in paginator.paginate(Bucket=bucket_name, Prefix=prefix):
            for obj in page.get("Contents", []):
                objects_to_delete.append({"Key": obj["Key"]})

        if not objects_to_delete:
            print(f"  No files found to delete for {figure_id}")
            return True

        # Delete objects in batches (max 1000 per batch)
        batch_size = 1000
        for i in range(0, len(objects_to_delete), batch_size):
            batch = objects_to_delete[i : i + batch_size]

            response = s3_client.delete_objects(
                Bucket=bucket_name, Delete={"Objects": batch, "Quiet": True}
            )

            # Check for errors
            if "Errors" in response and response["Errors"]:
                print(
                    f"  Errors deleting some files for {figure_id}: {response['Errors']}"
                )
                return False

        print(f"  Successfully deleted {len(objects_to_delete)} files for {figure_id}")
        return True

    except Exception as e:
        print(f"  Error deleting figure {figure_id}: {e}")
        return False


def report_figure_status(figure_id: str, figpack_data: Optional[Dict[str, Any]]):
    """
    Print a formatted report for a single figure
    """
    print(f"\n{'='*80}")
    print(f"Figure ID: {figure_id}")
    print(f"URL: https://figures.figpack.org/figures/default/{figure_id}/index.html")

    if not figpack_data:
        print("Status: ERROR - No figpack.json found")
        return

    # Extract key information
    status = figpack_data.get("status", "unknown")
    upload_started = figpack_data.get("upload_started")
    upload_updated = figpack_data.get("upload_updated")
    upload_completed = figpack_data.get("upload_completed")
    expiration = figpack_data.get("expiration")
    total_files = figpack_data.get("total_files")
    upload_progress = figpack_data.get("upload_progress")

    print(f"Status: {status.upper()}")

    # Timestamps
    print(f"\nTimestamps:")
    print(f"  Upload Started:   {format_timestamp(upload_started)}")
    print(f"  Upload Updated:   {format_timestamp(upload_updated)}")
    print(f"  Upload Completed: {format_timestamp(upload_completed)}")
    print(f"  Expiration:       {format_timestamp(expiration)}")

    # Additional info
    if total_files is not None:
        print(f"\nFiles: {total_files}")

    if upload_progress:
        print(f"Progress: {upload_progress}")

    # Time remaining
    if expiration:
        time_remaining = calculate_time_remaining(expiration)
        print(f"Time Remaining: {time_remaining}")


def main():
    """
    Main function to run the cleanup report
    """
    print("Figpack Cleanup Report")
    print("=" * 80)

    try:
        # Initialize S3 client
        print("Connecting to bucket...")
        s3_client = get_s3_client()

        # List all figures
        print("Listing figures...")
        figure_ids = list_all_figures(s3_client)

        if not figure_ids:
            print("No figures found in bucket.")
            return

        print(f"Found {len(figure_ids)} figures")

        # Process each figure
        deleted_count = 0
        failed_count = 0
        skipped_count = 0

        for i, figure_id in enumerate(figure_ids, 1):
            print(f"\nProcessing figure {i}/{len(figure_ids)}: {figure_id}")

            figpack_data = get_figpack_json(s3_client, figure_id)
            report_figure_status(figure_id, figpack_data)

            # Check if figure should be deleted
            should_delete, reason = should_delete_figure(figpack_data)
            print(f"Deletion decision: {reason}")

            if should_delete:
                print(f"Deleting figure {figure_id}...")
                if delete_figure(s3_client, figure_id):
                    deleted_count += 1
                else:
                    failed_count += 1
            else:
                print(f"Skipping deletion of {figure_id}")
                skipped_count += 1

        # Summary
        print(f"\n{'='*80}")
        print(f"Summary: Processed {len(figure_ids)} figures")
        print(f"Successfully deleted: {deleted_count}")
        print(f"Failed to delete: {failed_count}")
        print(f"Skipped (kept): {skipped_count}")

    except EnvironmentError as e:
        print(f"Environment Error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Unexpected error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
