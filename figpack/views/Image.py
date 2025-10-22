"""
Image view for figpack - displays PNG and JPG images
"""

from typing import Union

import numpy as np

from ..core.figpack_view import FigpackView
from ..core.zarr import Group


class Image(FigpackView):
    """
    An image visualization component for PNG and JPG files
    """

    def __init__(self, image_path_or_data: Union[str, bytes]) -> None:
        """
        Initialize an Image view

        Args:
            image_path_or_data: Path to image file or raw image bytes

        Raises:
            ValueError: If image_path_or_data is not a string or bytes
        """
        if not isinstance(image_path_or_data, (str, bytes)):
            raise ValueError(
                "image_path_or_data must be a file path (str) or raw bytes"
            )

        self.image_path_or_data = image_path_or_data

    @staticmethod
    def from_image_file(image_path: str) -> "Image":
        """
        Create an Image view from a file path

        Args:
            image_path: Path to the image file

        Returns:
            An Image view instance
        """
        return Image(image_path)

    @staticmethod
    def from_image_url(image_url: str) -> "Image":
        """
        Create an Image view from an image URL by downloading the image

        Args:
            image_url: URL of the image to download

        Returns:
            An Image view instance

        Raises:
            ValueError: If the image cannot be downloaded
        """
        import requests

        try:
            response = requests.get(image_url)
            response.raise_for_status()
            image_data = response.content
            return Image(image_data)
        except Exception as e:
            raise ValueError(f"Failed to download image from URL: {str(e)}")

    def write_to_zarr_group(self, group: Group) -> None:
        """
        Write the image data to a Zarr group

        Args:
            group: Zarr group to write data into
        """
        # Set the view type
        group.attrs["view_type"] = "Image"

        try:
            # Get the raw image data
            if isinstance(self.image_path_or_data, str):
                # Load from file path
                with open(self.image_path_or_data, "rb") as f:
                    image_data = f.read()
            elif isinstance(self.image_path_or_data, bytes):
                # Use bytes directly
                image_data = self.image_path_or_data
            else:
                raise ValueError("image_path_or_data must be a file path or bytes")

            # Convert bytes to numpy array of uint8
            image_array = np.frombuffer(image_data, dtype=np.uint8)

            # Store the raw image data as a zarr array
            group.create_dataset(
                "image_data",
                data=image_array,
            )

            # Try to determine format from file signature
            format_type = "Unknown"
            if len(image_data) >= 8:
                # Check PNG signature
                if image_data[:8] == b"\x89PNG\r\n\x1a\n":
                    format_type = "PNG"
                # Check JPEG signature
                elif image_data[:2] == b"\xff\xd8":
                    format_type = "JPEG"

            group.attrs["image_format"] = format_type
            group.attrs["data_size"] = len(image_data)

        except Exception as e:
            # If image loading fails, store error information
            group.attrs["error"] = f"Failed to load image: {str(e)}"
            group.attrs["image_format"] = "Unknown"
            group.attrs["data_size"] = 0
            # Create empty array as placeholder
            group.create_dataset("image_data", data=np.array([], dtype=np.uint8))
