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
        print("--- apply_edits 1")
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
                        print("--- apply edit_markdown", slide_index, action)
                        slides[slide_index] = self._update_markdown_section(
                            slides[slide_index],
                            action["sectionIndex"],
                            action["content"],
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
        print("--- update_markdown_section", section_index)
        lines = slide_content.split("\n")

        # Parse the slide structure to identify sections and special blocks
        sections = []  # List of (start_line, end_line) tuples for each section
        current_section_start = None
        in_metadata_block = False
        in_overlay_block = False
        title_line_index = None

        for i, line in enumerate(lines):
            # Track title
            if line.strip().startswith("# ") and title_line_index is None:
                title_line_index = i
                continue

            # Track metadata blocks
            if line == "```yaml slide-metadata" or line == "```yaml section-metadata":
                in_metadata_block = True
                continue
            elif in_metadata_block and line == "```":
                in_metadata_block = False
                continue

            # Track overlay blocks
            if line == "```svg slide-overlay":
                in_overlay_block = True
                continue
            elif in_overlay_block and line == "```":
                in_overlay_block = False
                continue

            # Skip lines in special blocks
            if in_metadata_block or in_overlay_block:
                continue

            # Detect section separator
            if line == "* * *":
                # End current section and start new one
                if current_section_start is not None:
                    sections.append((current_section_start, i - 1))
                current_section_start = i + 1
            else:
                # Start first section if not started yet
                if (
                    current_section_start is None
                    and line.strip()
                    and not line.strip().startswith("# ")
                ):
                    current_section_start = i

        # Add the last section
        if current_section_start is not None:
            sections.append((current_section_start, len(lines) - 1))

        # Validate section index
        if section_index < 0 or section_index >= len(sections):
            raise ValueError(
                f"Invalid section index: {section_index} (total sections: {len(sections)})"
            )

        # Replace the content of the specified section
        section_start, section_end = sections[section_index]

        # Build the updated slide
        updated_lines = []

        # Add lines before the section
        updated_lines.extend(lines[:section_start])

        # Add the new content (strip to avoid extra blank lines)
        new_content_stripped = new_content.strip()
        if new_content_stripped:
            updated_lines.append(new_content_stripped)

        # Add lines after the section
        updated_lines.extend(lines[section_end + 1 :])

        return "\n".join(updated_lines)


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
