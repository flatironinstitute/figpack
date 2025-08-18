"""
Tests for figpack Splitter view
"""

import pytest
import numpy as np
import zarr
import tempfile
from unittest.mock import Mock, patch

from figpack.views import Splitter, LayoutItem, Markdown, Box
from figpack.core.figpack_view import FigpackView


class TestSplitter:
    """Test Splitter view functionality"""

    def test_splitter_creation_vertical(self):
        """Test basic Splitter creation with vertical direction"""
        # Create test views and layout items
        view1 = Markdown(content="Content 1")
        view2 = Markdown(content="Content 2")
        item1 = LayoutItem(view=view1, title="Item 1")
        item2 = LayoutItem(view=view2, title="Item 2")

        splitter = Splitter(
            direction="vertical", item1=item1, item2=item2, split_pos=0.6
        )

        assert splitter.direction == "vertical"
        assert splitter.item1 == item1
        assert splitter.item2 == item2
        assert splitter.split_pos == 0.6

    def test_splitter_creation_horizontal(self):
        """Test basic Splitter creation with horizontal direction"""
        view1 = Markdown(content="Content 1")
        view2 = Markdown(content="Content 2")
        item1 = LayoutItem(view=view1, title="Item 1")
        item2 = LayoutItem(view=view2, title="Item 2")

        splitter = Splitter(
            direction="horizontal", item1=item1, item2=item2, split_pos=0.3
        )

        assert splitter.direction == "horizontal"
        assert splitter.split_pos == 0.3

    def test_splitter_default_values(self):
        """Test Splitter creation with default values"""
        view1 = Markdown(content="Content 1")
        view2 = Markdown(content="Content 2")
        item1 = LayoutItem(view=view1)
        item2 = LayoutItem(view=view2)

        splitter = Splitter(item1=item1, item2=item2)

        assert splitter.direction == "vertical"  # default
        assert splitter.split_pos == 0.5  # default

    def test_splitter_split_pos_clamping_low(self):
        """Test that split_pos is clamped to minimum 0.1"""
        view1 = Markdown(content="Content 1")
        view2 = Markdown(content="Content 2")
        item1 = LayoutItem(view=view1)
        item2 = LayoutItem(view=view2)

        splitter = Splitter(item1=item1, item2=item2, split_pos=0.05)
        assert splitter.split_pos == 0.1

        splitter = Splitter(item1=item1, item2=item2, split_pos=-0.2)
        assert splitter.split_pos == 0.1

        splitter = Splitter(item1=item1, item2=item2, split_pos=0.0)
        assert splitter.split_pos == 0.1

    def test_splitter_split_pos_clamping_high(self):
        """Test that split_pos is clamped to maximum 0.9"""
        view1 = Markdown(content="Content 1")
        view2 = Markdown(content="Content 2")
        item1 = LayoutItem(view=view1)
        item2 = LayoutItem(view=view2)

        splitter = Splitter(item1=item1, item2=item2, split_pos=0.95)
        assert splitter.split_pos == 0.9

        splitter = Splitter(item1=item1, item2=item2, split_pos=1.2)
        assert splitter.split_pos == 0.9

        splitter = Splitter(item1=item1, item2=item2, split_pos=1.0)
        assert splitter.split_pos == 0.9

    def test_splitter_split_pos_valid_range(self):
        """Test that valid split_pos values are preserved"""
        view1 = Markdown(content="Content 1")
        view2 = Markdown(content="Content 2")
        item1 = LayoutItem(view=view1)
        item2 = LayoutItem(view=view2)

        valid_positions = [0.1, 0.2, 0.5, 0.7, 0.9]
        for pos in valid_positions:
            splitter = Splitter(item1=item1, item2=item2, split_pos=pos)
            assert splitter.split_pos == pos

    def test_splitter_with_complex_layout_items(self):
        """Test Splitter with LayoutItems that have various properties"""
        view1 = Markdown(content="Content 1")
        view2 = Markdown(content="Content 2")

        item1 = LayoutItem(
            view=view1,
            title="Complex Item 1",
            stretch=2.0,
            min_size=100,
            max_size=500,
            collapsible=True,
        )
        item2 = LayoutItem(
            view=view2,
            title="Complex Item 2",
            stretch=1.5,
            min_size=50,
            max_size=300,
            collapsible=False,
        )

        splitter = Splitter(
            direction="horizontal", item1=item1, item2=item2, split_pos=0.4
        )

        assert splitter.item1.title == "Complex Item 1"
        assert splitter.item1.stretch == 2.0
        assert splitter.item2.title == "Complex Item 2"
        assert splitter.item2.stretch == 1.5

    def test_splitter_with_nested_views(self):
        """Test Splitter with nested Box views"""
        # Create nested structure
        inner_view1 = Markdown(content="Inner 1")
        inner_view2 = Markdown(content="Inner 2")
        inner_item1 = LayoutItem(view=inner_view1, title="Inner 1")
        inner_item2 = LayoutItem(view=inner_view2, title="Inner 2")

        box_view = Box(direction="horizontal", items=[inner_item1, inner_item2])
        simple_view = Markdown(content="Simple content")

        item1 = LayoutItem(view=box_view, title="Box Container")
        item2 = LayoutItem(view=simple_view, title="Simple Item")

        splitter = Splitter(
            direction="vertical", item1=item1, item2=item2, split_pos=0.7
        )

        assert isinstance(splitter.item1.view, Box)
        assert isinstance(splitter.item2.view, Markdown)
        assert len(splitter.item1.view.items) == 2

    def test_splitter_write_to_zarr_group(self):
        """Test writing Splitter to zarr group"""
        with tempfile.TemporaryDirectory() as temp_dir:
            # Create test data
            view1 = Markdown(content="Test content 1")
            view2 = Markdown(content="Test content 2")
            item1 = LayoutItem(view=view1, title="Test Item 1")
            item2 = LayoutItem(view=view2, title="Test Item 2")

            splitter = Splitter(
                direction="horizontal", item1=item1, item2=item2, split_pos=0.3
            )

            # Create zarr store and group
            store = zarr.DirectoryStore(temp_dir)
            root = zarr.group(store=store)

            # Write to zarr group
            splitter._write_to_zarr_group(root)

            # Verify attributes
            assert root.attrs["view_type"] == "Splitter"
            assert root.attrs["direction"] == "horizontal"
            assert root.attrs["split_pos"] == 0.3

            # Verify item metadata
            assert "item1_metadata" in root.attrs
            assert "item2_metadata" in root.attrs

            item1_metadata = root.attrs["item1_metadata"]
            item2_metadata = root.attrs["item2_metadata"]

            assert item1_metadata["name"] == "item1"
            assert item1_metadata["title"] == "Test Item 1"
            assert item2_metadata["name"] == "item2"
            assert item2_metadata["title"] == "Test Item 2"

            # Verify subgroups were created
            assert "item1" in root
            assert "item2" in root
            assert isinstance(root["item1"], zarr.Group)
            assert isinstance(root["item2"], zarr.Group)

    def test_splitter_write_to_zarr_group_vertical(self):
        """Test writing vertical Splitter to zarr group"""
        with tempfile.TemporaryDirectory() as temp_dir:
            view1 = Markdown(content="Content 1")
            view2 = Markdown(content="Content 2")
            item1 = LayoutItem(view=view1, title="Item 1")
            item2 = LayoutItem(view=view2, title="Item 2")

            splitter = Splitter(
                direction="vertical", item1=item1, item2=item2, split_pos=0.8
            )

            store = zarr.DirectoryStore(temp_dir)
            root = zarr.group(store=store)

            splitter._write_to_zarr_group(root)

            assert root.attrs["view_type"] == "Splitter"
            assert root.attrs["direction"] == "vertical"
            assert root.attrs["split_pos"] == 0.8

    def test_splitter_write_to_zarr_group_with_complex_items(self):
        """Test writing Splitter with complex LayoutItems to zarr group"""
        with tempfile.TemporaryDirectory() as temp_dir:
            view1 = Markdown(content="Content 1")
            view2 = Markdown(content="Content 2")

            item1 = LayoutItem(
                view=view1,
                title="Complex Item 1",
                stretch=2.0,
                min_size=100,
                max_size=500,
                collapsible=True,
            )
            item2 = LayoutItem(
                view=view2,
                title="Complex Item 2",
                stretch=1.5,
                min_size=50,
                collapsible=False,
            )

            splitter = Splitter(item1=item1, item2=item2, split_pos=0.6)

            store = zarr.DirectoryStore(temp_dir)
            root = zarr.group(store=store)

            splitter._write_to_zarr_group(root)

            # Verify complex metadata is preserved
            item1_metadata = root.attrs["item1_metadata"]
            item2_metadata = root.attrs["item2_metadata"]

            assert item1_metadata["stretch"] == 2.0
            assert item1_metadata["min_size"] == 100
            assert item1_metadata["max_size"] == 500
            assert item1_metadata["collapsible"] is True

            assert item2_metadata["stretch"] == 1.5
            assert item2_metadata["min_size"] == 50
            assert item2_metadata["max_size"] is None
            assert item2_metadata["collapsible"] is False

    def test_splitter_inheritance(self):
        """Test that Splitter properly inherits from FigpackView"""
        view1 = Markdown(content="Content 1")
        view2 = Markdown(content="Content 2")
        item1 = LayoutItem(view=view1)
        item2 = LayoutItem(view=view2)

        splitter = Splitter(item1=item1, item2=item2)

        assert isinstance(splitter, FigpackView)
        assert hasattr(splitter, "show")
        assert hasattr(splitter, "_write_to_zarr_group")

    def test_splitter_direction_type_validation(self):
        """Test that direction parameter accepts only valid values"""
        view1 = Markdown(content="Content 1")
        view2 = Markdown(content="Content 2")
        item1 = LayoutItem(view=view1)
        item2 = LayoutItem(view=view2)

        # Valid directions should work
        splitter_v = Splitter(direction="vertical", item1=item1, item2=item2)
        assert splitter_v.direction == "vertical"

        splitter_h = Splitter(direction="horizontal", item1=item1, item2=item2)
        assert splitter_h.direction == "horizontal"

        # Note: Type validation would be handled by type checkers, not runtime
        # The actual implementation doesn't validate this at runtime

    def test_splitter_with_different_view_types(self):
        """Test Splitter with different types of views"""
        # Create different view types
        markdown_view = Markdown(content="Markdown content")

        # Create a nested box
        inner_views = [
            LayoutItem(view=Markdown(content="Inner 1"), title="Inner 1"),
            LayoutItem(view=Markdown(content="Inner 2"), title="Inner 2"),
        ]
        box_view = Box(direction="horizontal", items=inner_views)

        item1 = LayoutItem(view=markdown_view, title="Markdown Item")
        item2 = LayoutItem(view=box_view, title="Box Item")

        splitter = Splitter(
            direction="vertical", item1=item1, item2=item2, split_pos=0.4
        )

        assert isinstance(splitter.item1.view, Markdown)
        assert isinstance(splitter.item2.view, Box)

    def test_splitter_edge_case_split_positions(self):
        """Test edge cases for split position values"""
        view1 = Markdown(content="Content 1")
        view2 = Markdown(content="Content 2")
        item1 = LayoutItem(view=view1)
        item2 = LayoutItem(view=view2)

        # Test boundary values
        splitter_min = Splitter(item1=item1, item2=item2, split_pos=0.1)
        assert splitter_min.split_pos == 0.1

        splitter_max = Splitter(item1=item1, item2=item2, split_pos=0.9)
        assert splitter_max.split_pos == 0.9

        # Test values very close to boundaries
        splitter_near_min = Splitter(item1=item1, item2=item2, split_pos=0.10001)
        assert splitter_near_min.split_pos == 0.10001

        splitter_near_max = Splitter(item1=item1, item2=item2, split_pos=0.89999)
        assert splitter_near_max.split_pos == 0.89999

    def test_splitter_zarr_subgroup_structure(self):
        """Test that zarr subgroups are properly structured"""
        with tempfile.TemporaryDirectory() as temp_dir:
            view1 = Markdown(content="Content 1")
            view2 = Markdown(content="Content 2")
            item1 = LayoutItem(view=view1, title="Item 1")
            item2 = LayoutItem(view=view2, title="Item 2")

            splitter = Splitter(item1=item1, item2=item2)

            store = zarr.DirectoryStore(temp_dir)
            root = zarr.group(store=store)

            splitter._write_to_zarr_group(root)

            # Verify subgroup structure
            item1_group = root["item1"]
            item2_group = root["item2"]

            # Both subgroups should have the Markdown view data
            assert item1_group.attrs["view_type"] == "Markdown"
            assert item2_group.attrs["view_type"] == "Markdown"
            assert item1_group.attrs["content"] == "Content 1"
            assert item2_group.attrs["content"] == "Content 2"
