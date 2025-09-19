"""
Tests for the Box view component
"""

import pytest
import zarr
import zarr.storage

import figpack
from figpack.views import Box, LayoutItem
from figpack.views import Markdown


def test_box_initialization():
    """Test Box view initialization with basic properties"""
    items = [
        LayoutItem(view=Markdown(content="Test 1"), min_size=100, stretch=1),
        LayoutItem(view=Markdown(content="Test 2"), min_size=100, stretch=1),
    ]

    box = Box(direction="vertical", show_titles=True, items=items)

    assert box.direction == "vertical"
    assert box.show_titles == True
    assert len(box.items) == 2
    assert isinstance(box.items[0], LayoutItem)
    assert isinstance(box.items[0].view, Markdown)


def test_box_zarr_writing():
    """Test Box view writing to zarr group"""
    items = [LayoutItem(view=Markdown(content="Test"), min_size=100)]
    box = Box(direction="horizontal", show_titles=False, items=items)

    # Create temporary zarr group
    store = zarr.storage.MemoryStore()
    group = figpack.Group(zarr.group(store=store))

    # Write box to zarr
    box.write_to_zarr_group(group)

    # Verify attributes
    assert group.attrs["view_type"] == "Box"
    assert group.attrs["direction"] == "horizontal"
    assert group.attrs["show_titles"] == False

    # Verify items metadata
    items_metadata = group.attrs["items"]
    assert len(items_metadata) == 1
    assert items_metadata[0]["min_size"] == 100
    assert "item_0" in group


def test_box_invalid_direction():
    """Test Box view with invalid direction raises error"""
    items = [LayoutItem(view=Markdown(content="Test"), min_size=100)]

    with pytest.raises(ValueError):
        Box(direction="invalid", show_titles=True, items=items)


def test_empty_box():
    """Test Box view with no items"""
    box = Box(items=[])
    assert len(box.items) == 0
