import pytest
import zarr
import zarr.storage

import figpack
from figpack.views.TabLayout import TabLayout
from figpack.views.TabLayoutItem import TabLayoutItem
from figpack.views.Box import Box
from figpack.views.LayoutItem import LayoutItem
from figpack.views.Markdown import Markdown


@pytest.fixture
def sample_tab_items():
    """Create sample tab items for testing"""
    # Create some sample views
    box = Box(items=[LayoutItem(Markdown("box content"))])
    markdown = Markdown("markdown content")

    # Create TabLayoutItems with different options
    tab1 = TabLayoutItem(box, label="Box Tab")
    tab2 = TabLayoutItem(markdown, label="Markdown Tab")
    tab3 = TabLayoutItem(
        Box(items=[LayoutItem(Markdown("another box"))]), label="Another Box"
    )
    return [tab1, tab2, tab3]


def test_tablayout_init(sample_tab_items):
    """Test TabLayout initialization"""
    # Test with default initial tab
    layout = TabLayout(items=sample_tab_items)
    assert layout.items == sample_tab_items
    assert layout.initial_tab_index == 0

    # Test with specific initial tab
    layout = TabLayout(items=sample_tab_items, initial_tab_index=1)
    assert layout.initial_tab_index == 1


def test_tablayout_empty():
    """Test TabLayout with empty items list"""
    layout = TabLayout(items=[])
    assert layout.items == []
    assert layout.initial_tab_index == 0

    # Initial tab index should be clamped to 0 when items list is empty
    layout = TabLayout(items=[], initial_tab_index=5)
    assert layout.initial_tab_index == 0


def test_tablayout_index_clamping(sample_tab_items):
    """Test initial_tab_index clamping"""
    # Test negative index (should clamp to 0)
    layout = TabLayout(items=sample_tab_items, initial_tab_index=-1)
    assert layout.initial_tab_index == 0

    # Test too large index (should clamp to len-1)
    layout = TabLayout(items=sample_tab_items, initial_tab_index=10)
    assert layout.initial_tab_index == 2  # len is 3, so max index is 2


def test_write_to_zarr(sample_tab_items):
    """Test writing TabLayout to zarr group"""
    layout = TabLayout(items=sample_tab_items, initial_tab_index=1)

    store = zarr.storage.MemoryStore()
    root = zarr.group(store=store)
    group = figpack.Group(root.create_group("test"))

    layout.write_to_zarr_group(group)

    # Check basic attributes
    assert group.attrs["view_type"] == "TabLayout"
    assert group.attrs["initial_tab_index"] == 1

    # Check items metadata
    items_metadata = group.attrs["items"]
    assert len(items_metadata) == 3

    # Check first tab's metadata
    tab0_meta = items_metadata[0]
    assert tab0_meta["name"] == "tab_0"
    assert tab0_meta["label"] == "Box Tab"

    # Check second tab's metadata
    tab1_meta = items_metadata[1]
    assert tab1_meta["name"] == "tab_1"
    assert tab1_meta["label"] == "Markdown Tab"
    assert "icon" not in tab1_meta  # No icon specified

    # Check that tab subgroups exist and have correct content
    assert "tab_0" in group
    assert "tab_1" in group
    assert "tab_2" in group


def test_nested_tablayout(sample_tab_items):
    """Test nested TabLayout configurations"""
    # Create inner tablayout
    inner_layout = TabLayout(items=sample_tab_items[:2])  # Use first 2 tabs

    # Create outer tabs including the inner layout
    outer_tabs = [
        TabLayoutItem(inner_layout, label="Nested Tabs"),
        TabLayoutItem(
            Box(items=[LayoutItem(Markdown("outer content"))]), label="Single Tab"
        ),
    ]

    outer_layout = TabLayout(items=outer_tabs)

    store = zarr.storage.MemoryStore()
    root = zarr.group(store=store)
    group = figpack.Group(root.create_group("test"))

    outer_layout.write_to_zarr_group(group)

    # Verify nested structure
    assert group.attrs["view_type"] == "TabLayout"

    # Verify first tab contains another TabLayout
    tab0_group = group["tab_0"]
    assert tab0_group.attrs["view_type"] == "TabLayout"

    # Verify nested tabs are present
    assert "tab_0" in tab0_group
    assert "tab_1" in tab0_group


def test_tablayout_with_different_view_types(sample_tab_items):
    """Test TabLayout with different view types in tabs"""
    # Create tabs with different view types
    box = Box(items=[LayoutItem(Markdown("box content"))])
    markdown = Markdown("markdown content")

    mixed_tabs = [
        TabLayoutItem(box, label="Box Tab"),
        TabLayoutItem(markdown, label="Markdown Tab"),
    ]

    layout = TabLayout(items=mixed_tabs)

    store = zarr.storage.MemoryStore()
    root = zarr.group(store=store)
    group = figpack.Group(root.create_group("test"))

    layout.write_to_zarr_group(group)

    # Verify each tab has the correct view type
    assert group["tab_0"].attrs["view_type"] == "Box"
    assert group["tab_1"].attrs["view_type"] == "Markdown"
