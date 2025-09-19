"""
Tests for figpack Image view
"""

import pytest
import zarr
import zarr.storage

import figpack
from figpack.views import Image


def test_image_initialization_with_path():
    """Test Image view initialization with file path"""
    path = "test_image.png"  # Just testing initialization, file doesn't need to exist
    view = Image(path)
    assert view.image_path_or_data == path


def test_image_initialization_with_bytes():
    """Test Image view initialization with raw bytes"""
    # Create a minimal valid PNG file in memory
    png_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x00\x00\x02\x00\x01\xe5\x27\xde\xfc\x00\x00\x00\x00IEND\xaeB`\x82"
    view = Image(png_bytes)
    assert view.image_path_or_data == png_bytes


def test_image_zarr_write_with_bytes():
    """Test Image view writing bytes data to zarr group"""
    # Minimal PNG file
    png_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x00\x00\x02\x00\x01\xe5\x27\xde\xfc\x00\x00\x00\x00IEND\xaeB`\x82"
    view = Image(png_bytes)

    store = zarr.storage.MemoryStore()
    group = figpack.Group(zarr.group(store=store))

    view.write_to_zarr_group(group)

    assert group.attrs["view_type"] == "Image"
    assert "image_data" in group
    assert group.attrs["data_size"] > 0


def test_image_with_invalid_type():
    """Test Image view with invalid input type"""
    with pytest.raises(ValueError):
        view = Image(123)  # Neither string nor bytes


def test_image_zarr_write_with_missing_file():
    """Test Image view writing with missing file"""
    view = Image("nonexistent.png")

    store = zarr.storage.MemoryStore()
    group = figpack.Group(zarr.group(store=store))

    view.write_to_zarr_group(group)

    assert group.attrs["view_type"] == "Image"
    assert "error" in group.attrs
    assert "Failed to load image" in group.attrs["error"]
    assert group.attrs["data_size"] == 0
