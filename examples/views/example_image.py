import os
import urllib.request
import figpack.views as vv


def main():
    view = example_image()

    title = "Image Visualization Example"
    description_md = """
# Image Visualization Example

This example demonstrates displaying images using figpack.

Features:
- **PNG Support**: Display PNG images with transparency
- **JPEG Support**: Display JPEG images with compression
- **Binary Data Storage**: Images are stored as compressed binary data in Zarr arrays
- **Automatic Format Detection**: Automatically detects PNG/JPEG format from file signatures

The image data is stored in its original compressed format (PNG/JPEG) within the Zarr array, 
preserving file size efficiency while avoiding the need to store binary data in attributes.
"""

    view.show(
        open_in_browser=True,
        title=title,
        description=description_md,
    )


def example_image():
    # Download a stable sample image from the internet
    # Using a simple, reliable PNG image from httpbin.org
    image_url = "https://httpbin.org/image/png"

    print("Downloading sample image...")
    with urllib.request.urlopen(image_url) as response:
        image_data = response.read()

    print(f"Downloaded {len(image_data)} bytes")

    # Create the Image view with the downloaded bytes
    view = vv.Image(image_data)
    return view


def example_image_from_file():
    """
    Alternative example showing how to load an image from a file.
    Uncomment and modify the path to use this version.
    """
    # image_path = "path/to/your/image.png"  # or .jpg
    # view = vv.Image(image_path)
    # return view
    pass


if __name__ == "__main__":
    main()
