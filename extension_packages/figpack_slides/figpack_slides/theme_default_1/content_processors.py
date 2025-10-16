"""
Content processors for different types of slide content.
Handles markdown files, iframes, images, URLs, etc.
"""

import os
import re
from typing import Optional
import figpack.views as fpv
import figpack_slides.views as fpsv
import figpack_slides as fps


def process_iframe(content: str) -> fpv.Iframe:
    """Extract URL from iframe tag and create Iframe view."""
    match = re.search(r'src="([^"]+)"', content)
    if match:
        url = match.group(1)
        return fpv.Iframe(url=url)
    else:
        return fpsv.Markdown(
            "Error: Invalid iframe tag - no src attribute found", font_size=28
        )


def process_markdown_file(
    file_path: str, metadata: dict, font_size: int
) -> fpsv.Markdown:
    """Load and process a markdown file, optionally as code block."""
    base_dir = os.path.dirname(file_path)

    try:
        with open(file_path, "r") as f:
            md_content = f.read()

        # If markdown-as-text, wrap in code fence
        if metadata.get("markdown-as-text"):
            md_content = f"````text\n{md_content}\n````"

        # Embed images as base64
        md_content_with_images = fps.embed_images_as_base64(md_content, base_dir)

        return fpsv.Markdown(md_content_with_images, font_size=font_size)
    except FileNotFoundError:
        return fpsv.Markdown(f"Error: File not found: {file_path}", font_size=28)
    except Exception as e:
        return fpsv.Markdown(f"Error loading markdown file: {str(e)}", font_size=28)


def process_local_image(content: str) -> fpv.Image:
    """Extract local image path and create Image view."""
    path = content[content.find("](./") + 2 : -1]
    return fpv.Image(path)


def process_remote_image(content: str) -> fpv.Image:
    """Extract remote image URL and create Image view."""
    image_url = content[content.find("](") + 2 : -1]
    image_bytes = fetch_image_from_url(image_url)
    if image_bytes is not None:
        return fpv.Image(image_bytes)
    else:
        raise ValueError(f"Could not fetch image from URL: {image_url}")


def fetch_image_from_url(url: str) -> Optional[bytes]:
    """Fetch image from URL with caching."""
    import requests
    import hashlib

    hash_of_url = hashlib.md5(url.encode("utf-8")).hexdigest()
    tmp_path = f"/tmp/figpack_slides_image_{hash_of_url}"

    if os.path.exists(tmp_path):
        with open(tmp_path, "rb") as f:
            return f.read()

    try:
        response = requests.get(url, headers={"User-Agent": "figpack-slides/1.0"})
        response.raise_for_status()
        with open(tmp_path, "wb") as f:
            f.write(response.content)
        return response.content
    except Exception as e:
        print(f"Error fetching image from URL {url}: {str(e)}")
        return None


def process_markdown_content(content: str, font_size: int) -> fpsv.Markdown:
    """Process regular markdown content with embedded images."""
    content_with_images = fps.embed_images_as_base64(content, base_dir="./")
    return fpsv.Markdown(content_with_images, font_size=font_size)
