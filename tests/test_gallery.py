"""
Tests for the Gallery view
"""

from unittest.mock import MagicMock

import zarr
import zarr.storage

import figpack
from figpack.views.Gallery import Gallery
from figpack.views.GalleryItem import GalleryItem
from figpack.core.figpack_view import FigpackView


class DummyView(FigpackView):
    """Dummy view for testing"""

    def write_to_zarr_group(self, group: figpack.Group) -> None:
        group.attrs["view_type"] = "DummyView"
        group.attrs["test_value"] = 42


def test_gallery_initialization():
    """Test basic initialization of Gallery view"""
    # Create sample gallery items
    items = [
        GalleryItem(view=DummyView(), label="Item 1"),
        GalleryItem(view=DummyView(), label="Item 2"),
        GalleryItem(view=DummyView(), label="Item 3"),
    ]

    # Test with default initial_item_index
    gallery = Gallery(items=items)
    assert len(gallery.items) == 3
    assert gallery.initial_item_index == 0

    # Test with custom initial_item_index
    gallery = Gallery(items=items, initial_item_index=1)
    assert gallery.initial_item_index == 1


def test_gallery_initialization_edge_cases():
    """Test Gallery initialization with edge cases"""
    # Test with empty items list
    gallery = Gallery(items=[])
    assert len(gallery.items) == 0
    assert gallery.initial_item_index == 0

    # Test with initial_item_index out of bounds (should clamp to valid range)
    items = [GalleryItem(view=DummyView(), label="Item 1")]
    gallery = Gallery(items=items, initial_item_index=5)  # Too large
    assert gallery.initial_item_index == 0

    gallery = Gallery(items=items, initial_item_index=-1)  # Negative
    assert gallery.initial_item_index == 0


def test_gallery_write_to_zarr():
    """Test writing Gallery data to zarr group"""
    # Create sample gallery items
    items = [
        GalleryItem(view=DummyView(), label="Item 1"),
        GalleryItem(view=DummyView(), label="Item 2"),
    ]
    gallery = Gallery(items=items, initial_item_index=0)

    # Create a zarr group
    store = zarr.storage.MemoryStore()
    root = zarr.group(store=store)
    group = figpack.Group(root.create_group("test_gallery"))

    # Write gallery to zarr
    gallery.write_to_zarr_group(group)

    # Verify basic attributes
    assert group.attrs["view_type"] == "Gallery"
    assert group.attrs["initial_item_index"] == 0

    # Verify items metadata
    items_metadata = group.attrs["items"]
    assert len(items_metadata) == 2
    assert items_metadata[0]["label"] == "Item 1"
    assert items_metadata[1]["label"] == "Item 2"

    # Verify subgroups for items
    assert "gallery_item_0" in group
    assert "gallery_item_1" in group
    assert group["gallery_item_0"].attrs["view_type"] == "DummyView"
    assert group["gallery_item_0"].attrs["test_value"] == 42
    assert group["gallery_item_1"].attrs["view_type"] == "DummyView"
    assert group["gallery_item_1"].attrs["test_value"] == 42
