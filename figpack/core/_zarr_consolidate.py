import os
import pathlib
import json
from typing import Dict, List, Tuple


def consolidate_zarr_chunks(
    zarr_dir: pathlib.Path, max_file_size: int = 100_000_000
) -> None:
    """
    Consolidate zarr chunk files into larger files to reduce the number of files
    that need to be uploaded. Updates the .zmetadata file with refs mapping.

    Args:
        zarr_dir: Path to the zarr directory
        max_file_size: Maximum size for each consolidated file in bytes (default: 100 MB)
    """
    if not zarr_dir.is_dir():
        raise ValueError(f"Expected a directory, got: {zarr_dir}")

    # Read the existing .zmetadata file
    zmetadata_path = zarr_dir / ".zmetadata"
    if not zmetadata_path.exists():
        raise ValueError(f"No .zmetadata file found at {zmetadata_path}")

    with open(zmetadata_path, "r") as f:
        zmetadata = json.load(f)

    # Collect all chunk files (non-metadata files)
    chunk_files = _collect_chunk_files(zarr_dir)

    if not chunk_files:
        # No chunk files to consolidate
        return

    # Group chunk files into consolidated files
    consolidated_groups = _group_files_by_size(chunk_files, max_file_size)

    # Create consolidated files and build refs mapping
    refs: Dict[str, List] = {}
    for group_idx, file_group in enumerate(consolidated_groups):
        consolidated_filename = f"_consolidated_{group_idx}.dat"
        consolidated_path = zarr_dir / consolidated_filename

        # Write the consolidated file and track byte offsets
        current_offset = 0
        with open(consolidated_path, "wb") as consolidated_file:
            for file_path, relative_path in file_group:
                # Read the chunk file
                with open(file_path, "rb") as chunk_file:
                    chunk_data = chunk_file.read()

                # Write to consolidated file
                consolidated_file.write(chunk_data)

                # Add to refs mapping
                refs[relative_path] = [
                    consolidated_filename,
                    current_offset,
                    len(chunk_data),
                ]

                # Update offset
                current_offset += len(chunk_data)

    # Update .zmetadata with refs
    zmetadata["refs"] = refs

    # Write updated .zmetadata
    with open(zmetadata_path, "w") as f:
        json.dump(zmetadata, f, indent=2)

    # Delete original chunk files
    for file_path, _ in chunk_files:
        try:
            file_path.unlink()
        except Exception as e:
            print(f"Warning: could not remove file {file_path}: {e}")

    # Clean up empty directories
    _remove_empty_directories(zarr_dir)


def _collect_chunk_files(zarr_dir: pathlib.Path) -> List[Tuple[pathlib.Path, str]]:
    """
    Collect all chunk files in the zarr directory (excluding metadata files).

    Args:
        zarr_dir: Path to the zarr directory

    Returns:
        List of tuples (absolute_path, relative_path) for each chunk file
    """
    chunk_files = []
    metadata_files = {".zmetadata", ".zarray", ".zgroup", ".zattrs"}

    for root, dirs, files in os.walk(zarr_dir):
        for file in files:
            # Skip metadata files
            if file in metadata_files or file.startswith("_consolidated_"):
                continue

            file_path = pathlib.Path(root) / file
            # Get relative path from zarr_dir
            relative_path = file_path.relative_to(zarr_dir).as_posix()

            chunk_files.append((file_path, relative_path))

    return chunk_files


def _group_files_by_size(
    files: List[Tuple[pathlib.Path, str]], max_size: int
) -> List[List[Tuple[pathlib.Path, str]]]:
    """
    Group files into bins where each bin's total size is <= max_size.

    Uses a simple first-fit bin packing algorithm.

    Args:
        files: List of (file_path, relative_path) tuples
        max_size: Maximum total size for each group in bytes

    Returns:
        List of groups, where each group is a list of (file_path, relative_path) tuples
    """
    # Get file sizes
    files_with_sizes = []
    for file_path, relative_path in files:
        try:
            size = file_path.stat().st_size
            files_with_sizes.append((file_path, relative_path, size))
        except Exception as e:
            print(f"Warning: could not get size of {file_path}: {e}")
            continue

    # Sort by size (largest first) for better packing
    files_with_sizes.sort(key=lambda x: x[2], reverse=True)

    # First-fit bin packing
    groups: List[List[Tuple[pathlib.Path, str]]] = []
    group_sizes: List[int] = []

    for file_path, relative_path, size in files_with_sizes:
        # If file is larger than max_size, put it in its own group
        if size > max_size:
            groups.append([(file_path, relative_path)])
            group_sizes.append(size)
            continue

        # Try to fit into existing group
        placed = False
        for i, group_size in enumerate(group_sizes):
            if group_size + size <= max_size:
                groups[i].append((file_path, relative_path))
                group_sizes[i] += size
                placed = True
                break

        # If doesn't fit anywhere, create new group
        if not placed:
            groups.append([(file_path, relative_path)])
            group_sizes.append(size)

    return groups


def _remove_empty_directories(zarr_dir: pathlib.Path) -> None:
    """
    Remove empty directories within the zarr directory.

    Args:
        zarr_dir: Path to the zarr directory
    """
    # Walk bottom-up so we can remove empty parent directories
    for root, dirs, files in os.walk(zarr_dir, topdown=False):
        for dir_name in dirs:
            dir_path = pathlib.Path(root) / dir_name
            try:
                # Only remove if directory is empty
                if not any(dir_path.iterdir()):
                    dir_path.rmdir()
            except Exception:
                # Directory not empty or other error, skip
                pass
