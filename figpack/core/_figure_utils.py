"""
Utility functions for working with figpack figures
"""

import pathlib
import threading
from typing import Dict, Tuple
from urllib.parse import urljoin

import requests


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
