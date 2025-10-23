import os
import base64
from typing import List
from dataclasses import dataclass
from ..views.Slides import Slides


@dataclass
class ParsedSlideSection:
    metadata: dict
    content: str


@dataclass
class ParsedSlide:
    title: str
    slide_type: str
    metadata: dict
    sections: List[ParsedSlideSection]
    overlays: List[str]


def create_presentation(md_content: str, *, theme) -> Slides:
    # Split by --- to get individual slides
    raw_slides = md_content.split("\n---\n")

    parsed_slides: List[ParsedSlide] = []
    for raw_slide in raw_slides:
        lines = raw_slide.strip().split("\n")
        if not lines:
            continue

        parsed_slide = ParsedSlide(
            title="", slide_type="normal", sections=[], metadata={}, overlays=[]
        )

        parsed_slide.sections.append(
            ParsedSlideSection(
                metadata={},
                content="",
            )
        )
        in_slide_metadata_block = False
        in_section_metadata_block = False
        in_slide_overlay_block = False
        slide_metadata_yaml_lines = []
        section_metadata_yaml_lines = []
        slide_overlay_svg_lines = []
        for line in lines:
            if line.startswith("# ") and parsed_slide.title == "":
                parsed_slide.title = line.lstrip("# ").strip()
            elif line == "* * *":
                parsed_slide.sections.append(
                    ParsedSlideSection(metadata={}, content="")
                )
            elif line == "```yaml slide-metadata":
                if in_slide_metadata_block:
                    raise ValueError("Nested slide-metadata blocks are not allowed.")
                if in_section_metadata_block:
                    raise ValueError(
                        "Cannot start slide-metadata block inside section-metadata block."
                    )
                in_slide_metadata_block = True
                slide_metadata_yaml_lines = []
            elif line == "```yaml section-metadata":
                if in_section_metadata_block:
                    raise ValueError("Nested section-metadata blocks are not allowed.")
                if in_slide_metadata_block:
                    raise ValueError(
                        "Cannot start section-metadata block inside slide-metadata block."
                    )
                if in_slide_overlay_block:
                    raise ValueError(
                        "Cannot start section-metadata block inside slide-overlay block."
                    )
                in_section_metadata_block = True
                section_metadata_yaml_lines = []
            elif line == "```svg slide-overlay":
                if in_slide_overlay_block:
                    raise ValueError("Nested slide-overlay blocks are not allowed.")
                if in_slide_metadata_block:
                    raise ValueError(
                        "Cannot start slide-overlay block inside slide-metadata block."
                    )
                if in_section_metadata_block:
                    raise ValueError(
                        "Cannot start slide-overlay block inside section-metadata block."
                    )
                in_slide_overlay_block = True
                slide_overlay_svg_lines = []
            elif in_slide_metadata_block:
                if line == "```":
                    in_slide_metadata_block = False
                    # Parse YAML content
                    import yaml

                    metadata = yaml.safe_load("\n".join(slide_metadata_yaml_lines))
                    if isinstance(metadata, dict):
                        for key, value in metadata.items():
                            if key == "slide-type":
                                parsed_slide.slide_type = str(value)
                            else:
                                # Apply to the first section's metadata
                                parsed_slide.metadata[key] = str(value)
                    slide_metadata_yaml_lines = []
                else:
                    slide_metadata_yaml_lines.append(line)
            elif in_section_metadata_block:
                if line == "```":
                    in_section_metadata_block = False
                    # Parse YAML content
                    import yaml

                    metadata = yaml.safe_load("\n".join(section_metadata_yaml_lines))
                    if isinstance(metadata, dict):
                        for key, value in metadata.items():
                            parsed_slide.sections[-1].metadata[key] = str(value)
                    section_metadata_yaml_lines = []
                else:
                    section_metadata_yaml_lines.append(line)
            elif in_slide_overlay_block:
                if line == "```":
                    in_slide_overlay_block = False
                    # Process and sanitize SVG content
                    svg_content = "\n".join(slide_overlay_svg_lines).strip()
                    if svg_content:
                        sanitized_svg = _sanitize_svg(svg_content)
                        if sanitized_svg:
                            parsed_slide.overlays.append(sanitized_svg)
                    slide_overlay_svg_lines = []
                else:
                    slide_overlay_svg_lines.append(line)
            else:
                if parsed_slide.sections[-1].content:
                    parsed_slide.sections[-1].content += "\n" + line
                else:
                    parsed_slide.sections[-1].content = line
        parsed_slides.append(parsed_slide)

    return Slides(
        slides=[
            theme.create_slide(slide, slide_index=i)
            for i, slide in enumerate(parsed_slides)
        ]
    )


def _sanitize_svg(svg_content: str) -> str:
    """
    Sanitize SVG content by removing potentially dangerous elements.

    Args:
        svg_content: Raw SVG content string

    Returns:
        Sanitized SVG content, or empty string if invalid
    """
    import re

    # Strip whitespace
    svg_content = svg_content.strip()

    # Basic validation - should contain SVG-like tags
    if not svg_content or not ("<" in svg_content and ">" in svg_content):
        return ""

    # Remove script tags and their content (case-insensitive)
    svg_content = re.sub(
        r"<script[^>]*>.*?</script>", "", svg_content, flags=re.IGNORECASE | re.DOTALL
    )
    svg_content = re.sub(r"<script[^>]*/?>", "", svg_content, flags=re.IGNORECASE)

    # Remove on* event handlers (onclick, onload, etc.)
    svg_content = re.sub(
        r'\s+on\w+\s*=\s*["\'][^"\']*["\']', "", svg_content, flags=re.IGNORECASE
    )
    svg_content = re.sub(
        r"\s+on\w+\s*=\s*[^\s>]+", "", svg_content, flags=re.IGNORECASE
    )

    return svg_content.strip()


def embed_images_as_base64(markdown_content: str, base_dir: str) -> str:
    """
    Convert image references in markdown to base64 data URIs.

    Args:
        markdown_content: The markdown text containing image references
        base_dir: Directory path where image files are located

    Returns:
        Modified markdown with images embedded as base64 data URIs
    """
    import re

    # Pattern to match markdown images: ![alt text](image.png)
    image_pattern = re.compile(r"!\[([^\]]*)\]\(([^)]+)\)")

    def replace_image(match):
        """Replace function to convert image reference to base64 data URI."""
        alt_text = match.group(1)
        image_filename = match.group(2)

        # Skip if it's already a data URI or absolute URL
        if image_filename.startswith("data:") or image_filename.startswith("http"):
            return match.group(0)  # Return original match unchanged

        # Build full path to the image file
        image_path = os.path.join(base_dir, image_filename)

        # Read and encode the image
        try:
            with open(image_path, "rb") as img_file:
                image_data = img_file.read()
                base64_data = base64.b64encode(image_data).decode("utf-8")

                # Determine image type from extension
                ext = os.path.splitext(image_filename)[1].lower()
                mime_type = {
                    ".png": "image/png",
                    ".jpg": "image/jpeg",
                    ".jpeg": "image/jpeg",
                    ".gif": "image/gif",
                    ".svg": "image/svg+xml",
                }.get(ext, "image/png")

                # Create data URI
                data_uri = f"data:{mime_type};base64,{base64_data}"

                # Return the replacement with base64 data
                return f"![{alt_text}]({data_uri})"
        except (FileNotFoundError, PermissionError, IOError, OSError):
            # If any error occurs, return the original match unchanged
            return match.group(0)

    # Use re.sub to replace all image references
    return image_pattern.sub(replace_image, markdown_content)
