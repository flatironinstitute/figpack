"""
Tests for the extension system
"""

import pytest
import tempfile
import pathlib
from figpack import FigpackExtension, ExtensionView
from figpack.core._bundle_utils import (
    _discover_required_extensions,
    _write_extension_files,
)


class TestExtensionSystem:
    """Test cases for the extension system"""

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

    def test_extension_view_creation(self):
        """Test creating an extension view"""
        extension = FigpackExtension(
            name="test-extension",
            javascript_code="console.log('test');",
        )

        # Create a view that uses the extension
        view = ExtensionView(extension=extension, view_type="test.ViewType")
        assert view.extension.name == "test-extension"

    def test_write_extension_files(self):
        """Test writing extension JavaScript files"""
        extension = FigpackExtension(
            name="test-extension",
            javascript_code="console.log('Hello from extension');",
            version="2.0.0",
        )

        # Write to temporary directory
        with tempfile.TemporaryDirectory() as tmpdir:
            _write_extension_files({extension}, tmpdir)

            # Check that file was created
            js_file = pathlib.Path(tmpdir) / "extension-test-extension.js"
            assert js_file.exists()

            # Check file content
            content = js_file.read_text(encoding="utf-8")
            assert "Figpack Extension: test-extension" in content
            assert "Version: 2.0.0" in content
            assert "console.log('Hello from extension');" in content

    def test_extension_with_additional_files(self):
        """Test extension with additional JavaScript files"""
        # Create extension with additional files
        extension = FigpackExtension(
            name="multi-file-extension",
            javascript_code="console.log('Main extension');",
            additional_files={
                "utils.js": "console.log('Utility functions');",
                "helpers.js": "console.log('Helper functions');",
            },
            version="1.5.0",
        )

        # Write to temporary directory
        with tempfile.TemporaryDirectory() as tmpdir:
            _write_extension_files({extension}, tmpdir)

            # Check main file
            main_file = pathlib.Path(tmpdir) / "extension-multi-file-extension.js"
            assert main_file.exists()
            main_content = main_file.read_text(encoding="utf-8")
            assert "console.log('Main extension');" in main_content

            # Check additional files
            utils_file = (
                pathlib.Path(tmpdir) / "extension-multi-file-extension-utils.js"
            )
            assert utils_file.exists()
            utils_content = utils_file.read_text(encoding="utf-8")
            assert "console.log('Utility functions');" in utils_content
            assert "multi-file-extension/utils.js" in utils_content

            helpers_file = (
                pathlib.Path(tmpdir) / "extension-multi-file-extension-helpers.js"
            )
            assert helpers_file.exists()
            helpers_content = helpers_file.read_text(encoding="utf-8")
            assert "console.log('Helper functions');" in helpers_content
            assert "multi-file-extension/helpers.js" in helpers_content

    def test_extension_additional_filenames(self):
        """Test getting additional filenames for an extension"""
        extension = FigpackExtension(
            name="test-ext",
            javascript_code="console.log('test');",
            additional_files={
                "lib.js": "// library code",
                "utils.js": "// utility code",
            },
        )

        filenames = extension.get_additional_filenames()
        expected = {
            "lib.js": "extension-test-ext-lib.js",
            "utils.js": "extension-test-ext-utils.js",
        }
        assert filenames == expected

    def test_extension_view_zarr_serialization(self):
        """Test that extension views serialize correctly to zarr"""
        import zarr

        # Register an extension
        extension = FigpackExtension(
            name="test-extension",
            javascript_code="console.log('test');",
            version="1.5.0",
        )

        # Create a view
        view = ExtensionView(extension=extension, view_type="test.ViewType")

        # Serialize to zarr
        group = zarr.group()
        view.write_to_zarr_group(group)

        # Check attributes
        assert group.attrs["view_type"] == "test.ViewType"
        assert group.attrs["extension_name"] == "test-extension"
        assert group.attrs["extension_version"] == "1.5.0"
