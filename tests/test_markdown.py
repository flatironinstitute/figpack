"""
Tests for figpack Markdown view
"""

import zarr
import zarr.storage
import numpy as np

import figpack
from figpack.views import Markdown


def test_markdown_initialization():
    """Test basic Markdown view initialization"""
    content = "# Test\nThis is a test"
    view = Markdown(content=content)
    assert view.content == content


def test_markdown_zarr_write():
    """Test Markdown view writing to zarr group"""
    content = "# Test Heading\nWith some content"
    view = Markdown(content=content)

    store = zarr.storage.MemoryStore()
    group = figpack.Group(zarr.group(store=store))

    view.write_to_zarr_group(group)

    assert group.attrs["view_type"] == "Markdown"

    # Verify content is stored in array
    content_data = group["content_data"][:]
    decoded_content = bytes(content_data).decode("utf-8")
    assert decoded_content == content

    # Verify data size
    assert group.attrs["data_size"] == len(content.encode("utf-8"))


def test_markdown_empty_content():
    """Test Markdown view with empty content"""
    view = Markdown(content="")

    store = zarr.storage.MemoryStore()
    group = figpack.Group(zarr.group(store=store))

    view.write_to_zarr_group(group)

    assert group.attrs["view_type"] == "Markdown"

    # Verify empty content
    content_data = group["content_data"][:]
    decoded_content = bytes(content_data).decode("utf-8")
    assert decoded_content == ""

    # Verify data size
    assert group.attrs["data_size"] == 0


def test_markdown_complex_content():
    """Test Markdown view with complex content including code blocks"""
    content = """# Heading
## Subheading
* List item 1
* List item 2

```python
def test():
    pass
```

[Link](http://example.com)"""

    view = Markdown(content=content)
    store = zarr.storage.MemoryStore()
    group = figpack.Group(zarr.group(store=store))

    view.write_to_zarr_group(group)

    assert group.attrs["view_type"] == "Markdown"

    # Verify complex content
    content_data = group["content_data"][:]
    decoded_content = bytes(content_data).decode("utf-8")
    assert decoded_content == content

    # Verify data size
    assert group.attrs["data_size"] == len(content.encode("utf-8"))


def test_markdown_array_properties():
    """Test Markdown array properties"""
    content = "Test content"
    view = Markdown(content=content)

    store = zarr.storage.MemoryStore()
    group = figpack.Group(zarr.group(store=store))

    view.write_to_zarr_group(group)

    # Verify array properties
    assert group["content_data"].dtype == np.uint8
    assert group["content_data"].chunks is not None
