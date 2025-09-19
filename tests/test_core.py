"""
Tests for figpack core functionality
"""

import zarr
import zarr.storage
from figpack.core.figpack_view import FigpackView


class SimpleView(FigpackView):
    """A simple view implementation for testing"""

    def __init__(self, data=None):
        self.data = data

    def write_to_zarr_group(self, group):
        group.attrs["view_type"] = "SimpleView"
        if self.data:
            group.attrs["data"] = self.data


def test_figpack_view_zarr_write():
    """Test basic zarr writing functionality"""
    view = SimpleView(data={"test": 123})

    store = zarr.storage.MemoryStore()
    group = zarr.group(store=store)

    view.write_to_zarr_group(group)

    assert group.attrs["view_type"] == "SimpleView"
    assert group.attrs["data"]["test"] == 123


def test_figpack_view_empty_data():
    """Test view with no data"""
    view = SimpleView()

    store = zarr.storage.MemoryStore()
    group = zarr.group(store=store)

    view.write_to_zarr_group(group)

    assert group.attrs["view_type"] == "SimpleView"
    assert "data" not in group.attrs


def test_figpack_view_custom_attrs():
    """Test view with additional custom attributes"""
    view = SimpleView()

    store = zarr.storage.MemoryStore()
    group = zarr.group(store=store)

    # Add custom attributes
    group.attrs["custom"] = "value"

    view.write_to_zarr_group(group)

    # Original attributes should be preserved
    assert group.attrs["custom"] == "value"
    assert group.attrs["view_type"] == "SimpleView"
