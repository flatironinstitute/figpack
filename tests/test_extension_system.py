"""
Tests for the extension system
"""

import pytest
import tempfile
import pathlib
from figpack import FigpackExtension, ExtensionRegistry, ExtensionView
from figpack.core._bundle_utils import (
    _discover_required_extensions,
    _write_extension_files,
)


class TestExtensionSystem:
    """Test cases for the extension system"""

    def setup_method(self):
        """Clear the extension registry before each test"""
        ExtensionRegistry.get_instance().clear()

    def test_extension_creation(self):
        """Test creating a basic extension"""
        extension = FigpackExtension(
            name="test-extension",
            javascript_code="console.log('test');",
            version="1.0.0",
        )

        assert extension.name == "test-extension"
        assert extension.javascript_code == "console.log('test');"
        assert extension.version == "1.0.0"
        assert extension.get_javascript_filename() == "extension-test-extension.js"

    def test_extension_name_sanitization(self):
        """Test that extension names are properly sanitized for filenames"""
        extension = FigpackExtension(
            name="test@extension#with$special%chars",
            javascript_code="console.log('test');",
        )

        # Should only keep alphanumeric, dash, and underscore
        assert (
            extension.get_javascript_filename()
            == "extension-testextensionwithspecialchars.js"
        )

    def test_extension_registry(self):
        """Test extension registry functionality"""
        registry = ExtensionRegistry.get_instance()

        # Should start empty
        assert len(registry.get_all_extensions()) == 0

        # Register an extension
        extension = FigpackExtension(
            name="test-extension",
            javascript_code="console.log('test');",
        )
        registry.register(extension)

        # Should be able to retrieve it
        retrieved = registry.get_extension("test-extension")
        assert retrieved is not None
        assert retrieved.name == "test-extension"

        # Should be in the list of all extensions
        all_extensions = registry.get_all_extensions()
        assert len(all_extensions) == 1
        assert "test-extension" in all_extensions

    def test_extension_registry_singleton(self):
        """Test that extension registry is a singleton"""
        registry1 = ExtensionRegistry.get_instance()
        registry2 = ExtensionRegistry.get_instance()

        assert registry1 is registry2

    def test_extension_view_creation(self):
        """Test creating an extension view"""
        # First register an extension
        extension = FigpackExtension(
            name="test-extension",
            javascript_code="console.log('test');",
        )
        ExtensionRegistry.register(extension)

        # Create a view that uses the extension
        view = ExtensionView(extension_name="test-extension")
        assert view.extension_name == "test-extension"

    def test_extension_view_unregistered_extension(self):
        """Test that creating a view with unregistered extension raises error"""
        with pytest.raises(
            ValueError, match="Extension 'nonexistent' is not registered"
        ):
            ExtensionView(extension_name="nonexistent")

    def test_extension_discovery(self):
        """Test discovering extensions from view hierarchy"""
        # Register some extensions
        ext1 = FigpackExtension(name="ext1", javascript_code="console.log('ext1');")
        ext2 = FigpackExtension(name="ext2", javascript_code="console.log('ext2');")
        ExtensionRegistry.register(ext1)
        ExtensionRegistry.register(ext2)

        # Create views
        view1 = ExtensionView(extension_name="ext1")
        view2 = ExtensionView(extension_name="ext2")

        # Test single view
        extensions = _discover_required_extensions(view1)
        assert extensions == {"ext1"}

        # Test multiple views (would need a layout view to test properly)
        # For now just test that the function works with a single view
        extensions = _discover_required_extensions(view2)
        assert extensions == {"ext2"}

    def test_write_extension_files(self):
        """Test writing extension JavaScript files"""
        # Register an extension
        extension = FigpackExtension(
            name="test-extension",
            javascript_code="console.log('Hello from extension');",
            version="2.0.0",
        )
        ExtensionRegistry.register(extension)

        # Write to temporary directory
        with tempfile.TemporaryDirectory() as tmpdir:
            _write_extension_files({"test-extension"}, tmpdir)

            # Check that file was created
            js_file = pathlib.Path(tmpdir) / "extension-test-extension.js"
            assert js_file.exists()

            # Check file content
            content = js_file.read_text(encoding="utf-8")
            assert "Figpack Extension: test-extension" in content
            assert "Version: 2.0.0" in content
            assert "console.log('Hello from extension');" in content

    def test_write_extension_files_missing_extension(self):
        """Test that writing files for missing extension raises error"""
        with tempfile.TemporaryDirectory() as tmpdir:
            with pytest.raises(
                RuntimeError, match="Extension 'missing' is required but not registered"
            ):
                _write_extension_files({"missing"}, tmpdir)

    def test_extension_view_zarr_serialization(self):
        """Test that extension views serialize correctly to zarr"""
        import zarr

        # Register an extension
        extension = FigpackExtension(
            name="test-extension",
            javascript_code="console.log('test');",
            version="1.5.0",
        )
        ExtensionRegistry.register(extension)

        # Create a view
        view = ExtensionView(extension_name="test-extension")

        # Serialize to zarr
        group = zarr.group()
        view._write_to_zarr_group(group)

        # Check attributes
        assert group.attrs["view_type"] == "ExtensionView"
        assert group.attrs["extension_name"] == "test-extension"
        assert group.attrs["extension_version"] == "1.5.0"
