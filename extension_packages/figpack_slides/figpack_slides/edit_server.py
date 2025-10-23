"""
Edit server for figpack_slides - handles live editing of markdown slide files
"""

import os
import json
import threading
from typing import List, Dict, Any
from flask import Flask, request, jsonify
from flask_cors import CORS


class MarkdownSlideEditor:
    """Handles editing of markdown slide files"""

    def __init__(self, markdown_path: str):
        self.markdown_path = markdown_path
        self.lock = threading.Lock()

    def apply_edits(self, edits: List[Dict[str, Any]]) -> None:
        """
        Apply a list of edit actions to the markdown file

        Args:
            edits: List of edit objects with slideIndex and actions
        """
        with self.lock:
            # Read the current content
            with open(self.markdown_path, "r", encoding="utf-8") as f:
                content = f.read()

            # Split into slides
            slides = content.split("\n---\n")

            # Apply edits
            for edit in edits:
                slide_index = edit["slideIndex"]
                actions = edit["actions"]

                if slide_index < 0 or slide_index >= len(slides):
                    raise ValueError(
                        f"Invalid slide index: {slide_index} (total slides: {len(slides)})"
                    )

                # Apply each action to the slide
                for action in actions:
                    if action["type"] == "set_title":
                        slides[slide_index] = self._update_title(
                            slides[slide_index], action["text"]
                        )
                    elif action["type"] == "edit_markdown":
                        slides[slide_index] = self._update_markdown_section(
                            slides[slide_index],
                            action["sectionIndex"],
                            action["content"],
                        )
                    elif action["type"] == "update_slide_element_position":
                        slides[slide_index] = self._update_slide_element_position(
                            slides[slide_index],
                            action["elementIndex"],
                            action["position"],
                        )

            # Reconstruct the markdown
            new_content = "\n---\n".join(slides)

            # Write back to file atomically
            temp_path = self.markdown_path + ".tmp"
            try:
                with open(temp_path, "w", encoding="utf-8") as f:
                    f.write(new_content)
                os.replace(temp_path, self.markdown_path)
            except Exception as e:
                # Clean up temp file if it exists
                if os.path.exists(temp_path):
                    os.remove(temp_path)
                raise e

    def _update_title(self, slide_content: str, new_title: str) -> str:
        """
        Update the title line in a slide

        Args:
            slide_content: The content of a single slide
            new_title: The new title text

        Returns:
            Updated slide content
        """
        lines = slide_content.split("\n")
        updated_lines = []
        title_found = False

        for line in lines:
            if not title_found and line.strip().startswith("# "):
                # Replace the title line
                updated_lines.append(f"# {new_title}")
                title_found = True
            else:
                updated_lines.append(line)

        return "\n".join(updated_lines)

    def _update_markdown_section(
        self, slide_content: str, section_index: int, new_content: str
    ) -> str:
        """
        Update a specific section within a slide

        Args:
            slide_content: The content of a single slide
            section_index: Index of the section to update (0-based)
            new_content: The new content for that section

        Returns:
            Updated slide content
        """
        section_text = _get_section_text(slide_content, section_index)
        lines = section_text.split("\n")
        lines_to_keep = []
        in_metadata_block = False
        in_markdown_section = False
        for line in lines:
            if line.startswith("# "):
                # title line
                in_markdown_section = False
                lines_to_keep.append(line)
            elif line.strip() == "" and not in_markdown_section:
                # blank line outside section
                lines_to_keep.append(line)
            elif (
                line.strip() == "```yaml slide-metadata"
                or line.strip() == "```yaml section-metadata"
            ):
                in_metadata_block = True
                lines_to_keep.append(line)
            elif line.strip() == "```" and in_metadata_block:
                in_metadata_block = False
                lines_to_keep.append(line)
            elif in_metadata_block:
                # inside metadata block
                lines_to_keep.append(line)
            else:
                if not in_markdown_section:
                    if line.strip() != "":
                        in_markdown_section = True
                if in_markdown_section:
                    continue
                else:
                    # outside markdown section
                    lines_to_keep.append(line)

        new_section_text = (
            "\n".join(lines_to_keep).rstrip() + "\n\n" + new_content.strip() + "\n"
        )
        return _replace_section_text(slide_content, section_index, new_section_text)

    def _update_slide_element_position(
        self, slide_content: str, element_index: int, position: Dict[str, float]
    ) -> str:
        """
        Update the position of a slide element in the slide metadata

        Args:
            slide_content: The content of a single slide
            element_index: Index of the element to update (0-based)
            position: New position dict with 'x' and 'y' keys

        Returns:
            Updated slide content
        """
        import yaml

        lines = slide_content.split("\n")

        # Find the slide-metadata block
        metadata_start = -1
        metadata_end = -1
        in_metadata_block = False

        for i, line in enumerate(lines):
            if line.strip() == "```yaml slide-metadata":
                metadata_start = i
                in_metadata_block = True
            elif in_metadata_block and line.strip() == "```":
                metadata_end = i
                break

        # Parse existing metadata or create new one
        if metadata_start >= 0 and metadata_end > metadata_start:
            # Extract and parse existing metadata
            metadata_lines = lines[metadata_start + 1 : metadata_end]
            metadata_yaml = "\n".join(metadata_lines)
            metadata = yaml.safe_load(metadata_yaml) if metadata_yaml.strip() else {}
            if not isinstance(metadata, dict):
                metadata = {}
        else:
            # No metadata block exists, create new one
            metadata = {}
            metadata_start = -1
            metadata_end = -1

        # Ensure elements list exists
        if "elements" not in metadata or not isinstance(metadata["elements"], list):
            metadata["elements"] = []

        # Validate element index
        if element_index < 0 or element_index >= len(metadata["elements"]):
            raise ValueError(
                f"Invalid element index: {element_index} (total elements: {len(metadata['elements'])})"
            )

        # Update the element position
        if not isinstance(metadata["elements"][element_index], dict):
            raise ValueError(f"Element at index {element_index} is not a valid object")

        metadata["elements"][element_index]["position"] = {
            "x": position["x"],
            "y": position["y"],
        }

        # Serialize metadata back to YAML
        new_metadata_yaml = yaml.dump(
            metadata, default_flow_style=False, sort_keys=False
        )
        new_metadata_lines = new_metadata_yaml.rstrip().split("\n")

        # Reconstruct the slide content
        if metadata_start >= 0 and metadata_end >= 0:
            # Replace existing metadata block
            result_lines = (
                lines[: metadata_start + 1] + new_metadata_lines + lines[metadata_end:]
            )
        else:
            # Insert new metadata block after title
            # Find title line
            title_index = -1
            for i, line in enumerate(lines):
                if line.strip().startswith("# "):
                    title_index = i
                    break

            if title_index >= 0:
                # Insert after title
                metadata_block = (
                    ["", "```yaml slide-metadata"] + new_metadata_lines + ["```", ""]
                )
                result_lines = (
                    lines[: title_index + 1] + metadata_block + lines[title_index + 1 :]
                )
            else:
                # No title found, insert at beginning
                metadata_block = (
                    ["```yaml slide-metadata"] + new_metadata_lines + ["```", ""]
                )
                result_lines = metadata_block + lines

        return "\n".join(result_lines)


def _get_section_text(slide_content: str, section_index: int) -> str:
    """Extract the text of a specific section from a slide"""
    sections = slide_content.split("\n* * *\n")
    if section_index < 0 or section_index >= len(sections):
        raise ValueError(f"Invalid section index: {section_index}")
    return sections[section_index]


def _replace_section_text(
    slide_content: str, section_index: int, new_section_text: str
) -> str:
    """Replace the text of a specific section in a slide"""
    sections = slide_content.split("\n* * *\n")
    if section_index < 0 or section_index >= len(sections):
        raise ValueError(f"Invalid section index: {section_index}")
    sections[section_index] = new_section_text
    return "\n* * *\n".join(sections)


def create_app(markdown_path: str, allowed_origin: str) -> Flask:
    """
    Create and configure the Flask application

    Args:
        markdown_path: Path to the markdown file to edit
        allowed_origin: Allowed CORS origin (e.g., 'http://localhost:3000')

    Returns:
        Configured Flask app
    """
    app = Flask(__name__)

    # Configure CORS to only allow the specified origin
    CORS(
        app,
        resources={r"/*": {"origins": allowed_origin}},
        supports_credentials=True,
    )

    # Create the editor instance
    editor = MarkdownSlideEditor(markdown_path)

    @app.route("/save-slide-edits", methods=["POST"])
    def save_slide_edits():
        """Handle POST requests to save slide edits"""
        try:
            # Parse the JSON request
            data = request.get_json()

            if not data or "edits" not in data:
                return jsonify({"error": "Missing 'edits' field in request"}), 400

            edits = data["edits"]

            if not isinstance(edits, list):
                return jsonify({"error": "'edits' must be a list"}), 400

            # Apply the edits
            editor.apply_edits(edits)

            return (
                jsonify({"success": True, "message": "Edits saved successfully"}),
                200,
            )

        except ValueError as e:
            return jsonify({"error": str(e)}), 400
        except Exception as e:
            return jsonify({"error": f"Internal server error: {str(e)}"}), 500

    @app.route("/health", methods=["GET"])
    def health():
        """Health check endpoint"""
        return jsonify({"status": "ok", "markdown_file": markdown_path}), 200

    return app


def run_server(
    markdown_path: str, port: int = 3001, allowed_origin: str = "http://localhost:3000"
) -> None:
    """
    Start the edit server

    Args:
        markdown_path: Path to the markdown file to edit
        port: Port to listen on (default: 3001)
        allowed_origin: Allowed CORS origin (default: http://localhost:3000)
    """
    # Validate the markdown file exists
    if not os.path.exists(markdown_path):
        raise FileNotFoundError(f"Markdown file not found: {markdown_path}")

    if not os.path.isfile(markdown_path):
        raise ValueError(f"Path is not a file: {markdown_path}")

    # Get absolute path
    markdown_path = os.path.abspath(markdown_path)

    print(f"Starting figpack_slides edit server...")
    print(f"Markdown file: {markdown_path}")
    print(f"Server URL: http://127.0.0.1:{port}")
    print(f"Allowed origin: {allowed_origin}")
    print(f"\nServer is running. Press Ctrl+C to stop.\n")

    app = create_app(markdown_path, allowed_origin)
    app.run(host="127.0.0.1", port=port, debug=False, threaded=True)
