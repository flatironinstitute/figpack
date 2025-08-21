"""
Tests for figpack Markdown view
"""

import pytest
import zarr
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

    store = zarr.MemoryStore()
    group = zarr.group(store=store)

    view._write_to_zarr_group(group)

    assert group.attrs["view_type"] == "Markdown"
    assert group.attrs["content"] == content


def test_markdown_empty_content():
    """Test Markdown view with empty content"""
    view = Markdown(content="")

    store = zarr.MemoryStore()
    group = zarr.group(store=store)

    view._write_to_zarr_group(group)

    assert group.attrs["view_type"] == "Markdown"
    assert group.attrs["content"] == ""


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
    store = zarr.MemoryStore()
    group = zarr.group(store=store)

    view._write_to_zarr_group(group)

    assert group.attrs["view_type"] == "Markdown"
    assert group.attrs["content"] == content
