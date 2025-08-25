# Image

Display PNG and JPEG images in figpack visualizations.

## Overview

`Image` displays image files or raw image data with automatic format detection and efficient storage.

## Basic Usage

```python
import figpack.views as vv

# From file path
view = vv.Image("path/to/image.png")
view.show(open_in_browser=True, title="Image from File Example")

# From raw bytes
with open("path/to/image.png", "rb") as f:
    image_data = f.read()

view = vv.Image(image_data)
view.show(open_in_browser=True, title="Image from Data Example")
```

## Constructor Parameters

- `image_path_or_data` (str or bytes): Path to image file or raw image bytes

## Supported Formats

- PNG (with transparency support)
- JPEG

Format is automatically detected from file signatures.

## Example

See [example_image.py](../examples/example_image.py) for a complete demonstration.
