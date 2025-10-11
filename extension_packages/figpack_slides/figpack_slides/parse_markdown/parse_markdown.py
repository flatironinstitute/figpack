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


def parse_markdown_to_slides(md_content: str, create_slide) -> Slides:
    """Parse markdown content into slide data structures."""
    # Split by --- to get individual slides
    raw_slides = md_content.split("\n---\n")

    parsed_slides: List[ParsedSlide] = []
    for raw_slide in raw_slides:
        lines = raw_slide.strip().split("\n")
        if not lines:
            continue

        parsed_slide = ParsedSlide(
            title="", slide_type="normal", sections=[], metadata={}
        )

        parsed_slide.sections.append(
            ParsedSlideSection(
                metadata={},
                content="",
            )
        )
        in_slide_metadata_block = False
        in_section_metadata_block = False
        slide_metadata_yaml_lines = []
        section_metadata_yaml_lines = []
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
                in_section_metadata_block = True
                section_metadata_yaml_lines = []
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
            else:
                if parsed_slide.sections[-1].content:
                    parsed_slide.sections[-1].content += "\n" + line
                else:
                    parsed_slide.sections[-1].content = line
        parsed_slides.append(parsed_slide)

    return Slides(slides=[create_slide(slide) for slide in parsed_slides])


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
