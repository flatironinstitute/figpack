"""
Extension system for figpack - allows runtime loading of custom view components
"""

from typing import Dict, Optional


class FigpackExtension:
    """
    Base class for figpack extensions that provide custom view components
    """

    def __init__(
        self,
        *,
        name: str,
        javascript_code: str,
        additional_files: Optional[Dict[str, str]] = None,
        version: str = "1.0.0",
    ) -> None:
        """
        Initialize a figpack extension

        Args:
            name: Unique name for the extension (used as identifier)
            javascript_code: JavaScript code that implements the extension
            additional_files: Optional dictionary of additional JavaScript files
                            {filename: content} that the extension can load
            version: Version string for compatibility tracking
        """
        self.name = name
        self.javascript_code = javascript_code
        self.additional_files = additional_files or {}
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

    def get_additional_filenames(self) -> Dict[str, str]:
        """
        Get the filenames for additional JavaScript files

        Returns:
            Dictionary mapping original filenames to safe filenames
        """
        safe_name = "".join(c for c in self.name if c.isalnum() or c in "-_")
        return {
            original_name: f"extension-{safe_name}-{original_name}"
            for original_name in self.additional_files.keys()
        }
