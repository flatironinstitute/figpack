import pytest
import zarr
import zarr.storage

import figpack
from figpack.views.Splitter import Splitter
from figpack.views.LayoutItem import LayoutItem
from figpack.views.Box import Box
from figpack.views.Markdown import Markdown


@pytest.fixture
def sample_layout_items():
    """Create sample layout items for testing"""
    box = Box(items=[LayoutItem(Markdown("box content"))])
    markdown = Markdown("markdown content")

    item1 = LayoutItem(box, min_size=300)
    item2 = LayoutItem(markdown, min_size=200)
    return item1, item2


def test_splitter_init(sample_layout_items):
    """Test Splitter initialization"""
    item1, item2 = sample_layout_items

    # Test vertical direction (default)
    splitter = Splitter(item1=item1, item2=item2)
    assert splitter.direction == "vertical"
    assert splitter.item1 == item1
    assert splitter.item2 == item2
    assert splitter.split_pos == 0.5

    # Test horizontal direction
    splitter = Splitter(direction="horizontal", item1=item1, item2=item2)
    assert splitter.direction == "horizontal"


def test_splitter_split_pos_clamping(sample_layout_items):
    """Test that split position is properly clamped"""
    item1, item2 = sample_layout_items

    # Test lower bound
    splitter = Splitter(item1=item1, item2=item2, split_pos=0.0)
    assert splitter.split_pos == 0.1

    # Test upper bound
    splitter = Splitter(item1=item1, item2=item2, split_pos=1.0)
    assert splitter.split_pos == 0.9

    # Test valid value
    splitter = Splitter(item1=item1, item2=item2, split_pos=0.3)
    assert splitter.split_pos == 0.3


def test_write_to_zarr(sample_layout_items):
    """Test writing Splitter to zarr group"""
    item1, item2 = sample_layout_items
    splitter = Splitter(direction="horizontal", item1=item1, item2=item2, split_pos=0.7)

    store = zarr.storage.MemoryStore()
    root = zarr.group(store=store)
    group = figpack.Group(root.create_group("test"))

    splitter.write_to_zarr_group(group)

    # Check basic attributes
    assert group.attrs["view_type"] == "Splitter"
    assert group.attrs["direction"] == "horizontal"
    assert group.attrs["split_pos"] == 0.7

    # Check item metadata
    assert "item1_metadata" in group.attrs
    assert "item2_metadata" in group.attrs

    item1_metadata = group.attrs["item1_metadata"]
    assert item1_metadata["name"] == "item1"
    assert item1_metadata["min_size"] == 300

    item2_metadata = group.attrs["item2_metadata"]
    assert item2_metadata["name"] == "item2"
    assert item2_metadata["min_size"] == 200

    # Check subgroups exist
    assert "item1" in group
    assert "item2" in group


def test_nested_splitter(sample_layout_items):
    """Test nested Splitter configurations"""
    item1, item2 = sample_layout_items

    # Create a nested splitter structure
    inner_splitter = Splitter(direction="horizontal", item1=item1, item2=item2)

    outer_item = LayoutItem(inner_splitter)

    # Create outer splitter
    outer_splitter = Splitter(direction="vertical", item1=outer_item, item2=item2)

    store = zarr.storage.MemoryStore()
    root = zarr.group(store=store)
    group = figpack.Group(root.create_group("test"))

    outer_splitter.write_to_zarr_group(group)

    # Verify nested structure
    assert group.attrs["view_type"] == "Splitter"
    assert "item1" in group
    assert group["item1"].attrs["view_type"] == "Splitter"
