"""
Tests for figpack views module
"""

import pathlib
import tempfile
from unittest.mock import Mock, patch

import numpy as np
import pytest
import zarr

from figpack.core.figpack_view import FigpackView
from figpack.views import Box, Image, LayoutItem, Markdown


class TestBox:
    """Test Box view functionality"""

    def test_box_creation(self):
        """Test basic Box creation"""
        # Create a simple markdown view for testing
        markdown_view = Markdown(content="Test content")
        item = LayoutItem(view=markdown_view, title="Test Item")

        box = Box(direction="vertical", show_titles=True, items=[item])

        assert box.direction == "vertical"
        assert box.show_titles is True
        assert len(box.items) == 1
        assert box.items[0].title == "Test Item"

    def test_box_horizontal_direction(self):
        """Test Box with horizontal direction"""
        markdown_view = Markdown(content="Test")
        item = LayoutItem(view=markdown_view, title="Test")

        box = Box(direction="horizontal", items=[item])
        assert box.direction == "horizontal"

    def test_box_multiple_items(self):
        """Test Box with multiple items"""
        items = []
        for i in range(3):
            view = Markdown(content=f"Content {i}")
            item = LayoutItem(view=view, title=f"Item {i}")
            items.append(item)

        box = Box(items=items)
        assert len(box.items) == 3
        assert all(isinstance(item, LayoutItem) for item in box.items)

    def test_box_write_to_zarr_group(self):
        """Test writing Box to zarr group"""
        with tempfile.TemporaryDirectory() as temp_dir:
            # Create test data
            markdown_view = Markdown(content="Test content")
            item = LayoutItem(view=markdown_view, title="Test Item")
            box = Box(items=[item])

            # Create zarr store and group
            store = zarr.DirectoryStore(temp_dir)
            root = zarr.group(store=store)

            # Write to zarr group
            box._write_to_zarr_group(root)

            # Verify attributes
            assert root.attrs["view_type"] == "Box"
            assert root.attrs["direction"] == "vertical"  # default
            assert root.attrs["show_titles"] is True  # default
            assert "items" in root.attrs
            assert len(root.attrs["items"]) == 1


class TestMarkdown:
    """Test Markdown view functionality"""

    def test_markdown_creation(self):
        """Test basic Markdown creation"""
        content = "# Test Markdown\n\nThis is a test."
        markdown = Markdown(content=content)

        assert markdown.content == content

    def test_markdown_empty_content(self):
        """Test Markdown with empty content"""
        markdown = Markdown(content="")
        assert markdown.content == ""

    def test_markdown_multiline_content(self):
        """Test Markdown with multiline content"""
        content = """# Title
        
## Subtitle

- Item 1
- Item 2

**Bold text** and *italic text*."""

        markdown = Markdown(content=content)
        assert markdown.content == content

    def test_markdown_write_to_zarr_group(self):
        """Test writing Markdown to zarr group"""
        with tempfile.TemporaryDirectory() as temp_dir:
            content = "# Test\n\nMarkdown content"
            markdown = Markdown(content=content)

            store = zarr.DirectoryStore(temp_dir)
            root = zarr.group(store=store)

            markdown._write_to_zarr_group(root)

            assert root.attrs["view_type"] == "Markdown"
            assert root.attrs["content"] == content


class TestImage:
    """Test Image view functionality"""

    def test_image_creation_with_bytes(self):
        """Test Image creation with bytes data"""
        # Create some fake PNG bytes (just for testing)
        png_signature = b"\x89PNG\r\n\x1a\n"
        fake_png_data = png_signature + b"fake image data"

        image = Image(image_path_or_data=fake_png_data)
        assert image.image_path_or_data == fake_png_data

    def test_image_creation_with_path(self):
        """Test Image creation with file path"""
        image_path = "/path/to/image.png"
        image = Image(image_path_or_data=image_path)
        assert image.image_path_or_data == image_path

    def test_image_write_to_zarr_group_with_bytes(self):
        """Test writing Image to zarr group with bytes data"""
        with tempfile.TemporaryDirectory() as temp_dir:
            # Create fake PNG data
            png_signature = b"\x89PNG\r\n\x1a\n"
            fake_png_data = png_signature + b"fake image data"
            image = Image(image_path_or_data=fake_png_data)

            store = zarr.DirectoryStore(temp_dir)
            root = zarr.group(store=store)

            image._write_to_zarr_group(root)

            assert root.attrs["view_type"] == "Image"
            assert "image_data" in root
            assert root.attrs["image_format"] == "PNG"
            assert root.attrs["data_size"] == len(fake_png_data)

            # Verify the image data was stored correctly
            stored_data = root["image_data"][:]
            expected_array = np.frombuffer(fake_png_data, dtype=np.uint8)
            assert np.array_equal(stored_data, expected_array)

    def test_image_write_to_zarr_group_with_jpeg(self):
        """Test writing JPEG image to zarr group"""
        with tempfile.TemporaryDirectory() as temp_dir:
            # Create fake JPEG data
            jpeg_signature = b"\xff\xd8"
            fake_jpeg_data = jpeg_signature + b"fake jpeg data"
            image = Image(image_path_or_data=fake_jpeg_data)

            store = zarr.DirectoryStore(temp_dir)
            root = zarr.group(store=store)

            image._write_to_zarr_group(root)

            assert root.attrs["view_type"] == "Image"
            assert root.attrs["image_format"] == "JPEG"


class TestLayoutItem:
    """Test LayoutItem functionality"""

    def test_layout_item_creation(self):
        """Test basic LayoutItem creation"""
        view = Markdown(content="Test")
        item = LayoutItem(view=view, title="Test Title")

        assert item.view == view
        assert item.title == "Test Title"

    def test_layout_item_optional_params(self):
        """Test LayoutItem with optional parameters"""
        view = Markdown(content="Test")
        item = LayoutItem(
            view=view,
            title="Test",
            stretch=1.5,
            min_size=100,
            max_size=500,
            collapsible=True,
        )

        assert item.stretch == 1.5
        assert item.min_size == 100
        assert item.max_size == 500
        assert item.collapsible is True

    def test_layout_item_to_dict(self):
        """Test LayoutItem to_dict method"""
        view = Markdown(content="Test")
        item = LayoutItem(view=view, title="Test Title")

        item_dict = item.to_dict()
        assert isinstance(item_dict, dict)
        assert item_dict["title"] == "Test Title"


class TestFigpackView:
    """Test base FigpackView functionality"""

    def test_figpack_view_can_be_instantiated(self):
        """Test that FigpackView can be instantiated"""
        view = FigpackView()
        assert view is not None

    def test_figpack_view_subclass_must_implement_write_to_zarr_group(self):
        """Test that subclasses must implement _write_to_zarr_group"""

        class IncompleteView(FigpackView):
            pass

        view = IncompleteView()

        # Should raise NotImplementedError when trying to write to zarr
        with tempfile.TemporaryDirectory() as temp_dir:
            store = zarr.DirectoryStore(temp_dir)
            root = zarr.group(store=store)

            with pytest.raises(NotImplementedError):
                view._write_to_zarr_group(root)

    def test_figpack_view_show_method_exists(self):
        """Test that FigpackView has a show method"""
        view = FigpackView()
        assert hasattr(view, "show")
        assert callable(view.show)
