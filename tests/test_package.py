"""
Basic package tests for figpack
"""

import pytest
import figpack


class TestPackage:
    """Test basic package functionality"""

    def test_version_exists(self):
        """Test that version is defined"""
        assert hasattr(figpack, "__version__")
        assert isinstance(figpack.__version__, str)
        assert len(figpack.__version__) > 0

    def test_version_format(self):
        """Test that version follows semantic versioning"""
        version = figpack.__version__
        parts = version.split(".")
        assert len(parts) >= 2, f"Version {version} should have at least major.minor"

        # Check that major and minor are integers
        assert parts[0].isdigit(), f"Major version should be numeric: {parts[0]}"
        assert parts[1].isdigit(), f"Minor version should be numeric: {parts[1]}"

    def test_package_imports(self):
        """Test that main package can be imported without errors"""
        import figpack

        assert figpack is not None

    def test_views_module_imports(self):
        """Test that views module can be imported"""
        from figpack import views

        assert views is not None

    def test_core_module_imports(self):
        """Test that core module can be imported"""
        from figpack import core

        assert core is not None

    def test_spike_sorting_module_imports(self):
        """Test that spike_sorting module can be imported"""
        from figpack import spike_sorting

        assert spike_sorting is not None
