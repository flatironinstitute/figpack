"""
Extension system for figpack - allows runtime loading of custom view components
"""

from typing import Dict, Optional


class FigpackExtension:
    """
    Base class for figpack extensions that provide custom view components
    """

    def __init__(self, *, name: str, javascript_code: str, version: str = "1.0.0"):
        """
        Initialize a figpack extension

        Args:
            name: Unique name for the extension (used as identifier)
            javascript_code: JavaScript code that implements the extension
            version: Version string for compatibility tracking
        """
        self.name = name
        self.javascript_code = javascript_code
        self.version = version

        # Validate extension name
        if not name or not isinstance(name, str):
            raise ValueError("Extension name must be a non-empty string")

        # Basic validation of JavaScript code
        if not javascript_code or not isinstance(javascript_code, str):
            raise ValueError("Extension javascript_code must be a non-empty string")

    def get_javascript_filename(self) -> str:
        """
        Get the filename that should be used for this extension's JavaScript file

        Returns:
            Filename for the extension JavaScript file
        """
        # Sanitize the name for use as a filename
        safe_name = "".join(c for c in self.name if c.isalnum() or c in "-_")
        return f"extension-{safe_name}.js"


class ExtensionRegistry:
    """
    Singleton registry for managing figpack extensions
    """

    _instance: Optional["ExtensionRegistry"] = None

    def __init__(self):
        self._extensions: Dict[str, FigpackExtension] = {}

    @classmethod
    def get_instance(cls) -> "ExtensionRegistry":
        """Get the singleton instance of the extension registry"""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    @classmethod
    def register(cls, extension: FigpackExtension) -> None:
        """
        Register an extension with the global registry

        Args:
            extension: The extension to register
        """
        registry = cls.get_instance()
        registry._register_extension(extension)

    def _register_extension(self, extension: FigpackExtension) -> None:
        """
        Internal method to register an extension

        Args:
            extension: The extension to register
        """
        if extension.name in self._extensions:
            existing = self._extensions[extension.name]
            if existing.version != extension.version:
                print(
                    f"Warning: Replacing extension '{extension.name}' "
                    f"version {existing.version} with version {extension.version}"
                )

        self._extensions[extension.name] = extension

    def get_extension(self, name: str) -> Optional[FigpackExtension]:
        """
        Get an extension by name

        Args:
            name: Name of the extension to retrieve

        Returns:
            The extension if found, None otherwise
        """
        return self._extensions.get(name)

    def get_all_extensions(self) -> Dict[str, FigpackExtension]:
        """
        Get all registered extensions

        Returns:
            Dictionary mapping extension names to extension objects
        """
        return self._extensions.copy()

    def clear(self) -> None:
        """Clear all registered extensions (mainly for testing)"""
        self._extensions.clear()
