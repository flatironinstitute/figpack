"""
Example showing how to create and display an image using the Image view
"""

import io
import tempfile
import numpy as np
from PIL import Image as PILImage
import figpack as fp
from figpack.views import Image


def example_image():
    """Create a colorful gradient image as a PNG file"""
    # Create a gradient pattern
    width, height = 400, 300
    x = np.linspace(0, 1, width)
    y = np.linspace(0, 1, height)
    X, Y = np.meshgrid(x, y)

    # Create RGB channels for a colorful gradient
    R = np.sin(X * 3 * np.pi) * 255
    G = np.sin(Y * 2 * np.pi) * 255
    B = np.sin((X + Y) * 4 * np.pi) * 255

    # Combine into RGB array and ensure proper data type
    rgb = np.stack([R, G, B], axis=2).astype(np.uint8)

    # Create a PIL Image and save to bytes
    img = PILImage.fromarray(rgb)

    img_bytes = io.BytesIO()
    img.save(img_bytes, format="PNG")
    img_bytes = img_bytes.getvalue()

    # Note: you can also load from an image file
    # view = Image.from_image_file('path_to_image.png')

    return Image(img_bytes)


def main():
    view = example_image()

    view.show(
        title="Example Gradient Image",
        description="A colorful gradient image.",
        open_in_browser=True,
    )


if __name__ == "__main__":
    main()
