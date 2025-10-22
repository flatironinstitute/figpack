#!/usr/bin/env python3
"""
NWB Tutorial Example Generator

Parses docs/nwb_tutorial.md, extracts Python code blocks that precede iframe elements,
modifies them to save HTML files instead of showing interactively, and executes
them to generate the NWB tutorial example HTML files in docs/_build/html/nwb_tutorial_*/
"""

import re
import tempfile
import subprocess
import os
import sys
from pathlib import Path
from typing import List, Tuple, Optional


def extract_iframe_and_code_pairs(tutorial_content: str) -> List[Tuple[str, str]]:
    """
    Extract iframe elements and their preceding Python code blocks.

    Returns:
        List of (folder_name, code) tuples
    """
    pairs = []

    # Split content into lines for easier processing
    lines = tutorial_content.split("\n")

    # Find all iframe elements and their folder names
    iframe_pattern = r'<iframe\s+(?:data-)?src="([^"]+)"'

    i = 0
    while i < len(lines):
        line = lines[i]

        # Check if this line contains an iframe
        iframe_match = re.search(iframe_pattern, line)
        if iframe_match:
            src = iframe_match.group(1)
            # Extract folder name from src like "./nwb_tutorial_plane_segmentation/index.html?embedded=1"
            folder_match = re.match(r"\./?(nwb_tutorial_[^/]+)/", src)
            if folder_match:
                folder_name = folder_match.group(1)

                # Now look backwards to find the preceding Python code block
                code_block = find_preceding_python_code(lines, i)
                if code_block:
                    pairs.append((folder_name, code_block))
                    print(f"Found code block for {folder_name}")
                else:
                    print(
                        f"Warning: No Python code block found before iframe for {folder_name}"
                    )

        i += 1

    return pairs


def find_preceding_python_code(lines: List[str], iframe_line_idx: int) -> Optional[str]:
    """
    Find the Python code block that precedes the iframe at the given line index.

    Args:
        lines: All lines from the markdown file
        iframe_line_idx: Index of the line containing the iframe

    Returns:
        The Python code block as a string, or None if not found
    """
    # Look backwards from the iframe line
    i = iframe_line_idx - 1

    # Skip empty lines and other content until we find the end of a code block
    while i >= 0:
        line = lines[i].strip()
        if line == "```":
            # Found end of a code block, now find the start
            code_lines = []
            i -= 1

            # Collect code lines
            while i >= 0 and lines[i].strip() != "```python":
                code_lines.append(lines[i])
                i -= 1

            # Check if we found the start of a Python code block
            if i >= 0 and lines[i].strip() == "```python":
                # Reverse the code lines since we collected them backwards
                code_lines.reverse()
                return "\n".join(code_lines)

        i -= 1

    return None


def modify_code_for_generation(code: str, folder_name: str) -> str:
    """
    Modify code to save HTML files instead of showing interactively.

    Args:
        code: Original Python code
        folder_name: Target folder name (e.g., "nwb_tutorial_plane_segmentation")

    Returns:
        Modified code that saves to the appropriate directory
    """
    modified = code

    # Remove or modify .show() calls
    # Pattern to match .show(...) calls
    show_pattern = r"(\w+)\.show\([^)]*\)"

    def replace_show_call(match):
        var_name = match.group(1)
        # Replace with save call, using folder name as title
        title = folder_name.replace("_", " ").replace("nwb tutorial ", "").title()
        return f"{var_name}.save('_build/html/{folder_name}', title='{title}')"

    modified = re.sub(show_pattern, replace_show_call, modified)

    return modified


def execute_code(code: str, folder_name: str) -> Tuple[bool, str, str]:
    """
    Execute the modified code to generate HTML files.

    Args:
        code: Python code to execute
        folder_name: Folder name for identification

    Returns:
        Tuple of (success, stdout, stderr)
    """
    try:
        # Create the output directory if it doesn't exist
        output_dir = Path("_build/html") / folder_name
        output_dir.mkdir(parents=True, exist_ok=True)

        # Write code to temporary file
        with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False) as f:
            f.write(code)
            temp_file = f.name

        # Execute the code
        result = subprocess.run(
            [sys.executable, temp_file],
            capture_output=True,
            text=True,
            timeout=120,  # 120 second timeout
            cwd=Path(__file__).parent.parent,  # Run from docs directory
        )

        success = result.returncode == 0
        return success, result.stdout, result.stderr

    except subprocess.TimeoutExpired:
        return False, "", f"Timeout: Code execution took longer than 120 seconds"
    except Exception as e:
        return False, "", f"Error executing code: {str(e)}"
    finally:
        # Clean up temp file
        try:
            os.unlink(temp_file)
        except:
            pass


def main():
    """Main function to generate all NWB tutorial examples."""
    print("🧠 NWB Tutorial Example Generator")
    print("=" * 50)

    # Read NWB tutorial file
    tutorial_path = Path(__file__).parent.parent / "nwb_tutorial.md"

    if not tutorial_path.exists():
        print(f"❌ NWB tutorial file not found: {tutorial_path}")
        sys.exit(1)

    try:
        with open(tutorial_path, "r", encoding="utf-8") as f:
            tutorial_content = f.read()
    except Exception as e:
        print(f"❌ Error reading NWB tutorial file: {e}")
        sys.exit(1)

    # Extract iframe and code pairs
    print(f"📖 Parsing {tutorial_path}")
    pairs = extract_iframe_and_code_pairs(tutorial_content)
    print(f"Found {len(pairs)} iframe/code pairs")
    print()

    if not pairs:
        print("❌ No iframe/code pairs found in NWB tutorial")
        sys.exit(1)

    # Process each pair
    results = []
    for i, (folder_name, code) in enumerate(pairs, 1):
        print(f"🔧 Generating {i}/{len(pairs)}: {folder_name}")

        # Modify code for generation
        modified_code = modify_code_for_generation(code, folder_name)

        # Execute the code
        success, stdout, stderr = execute_code(modified_code, folder_name)

        if success:
            print(f"  ✅ Generated successfully")
            # Check if HTML file was created
            html_file = Path("_build/html") / folder_name / "index.html"
            if html_file.exists():
                print(f"  📄 Created {html_file}")
            else:
                print(f"  ⚠️  Warning: {html_file} not found")
        else:
            print(f"  ❌ Generation failed")
            if stderr:
                print(f"     Error: {stderr.strip()}")

            # Print the modified code for debugging
            print(f"     Modified code:")
            print("     " + "-" * 40)
            for line_num, line in enumerate(modified_code.split("\n"), 1):
                print(f"     {line_num:3d}: {line}")
            print("     " + "-" * 40)

        results.append((folder_name, success, stdout, stderr))
        print()

    # Summary
    print("=" * 50)
    print("📊 SUMMARY")
    print("=" * 50)

    passed = sum(1 for _, success, _, _ in results if success)
    total = len(results)

    print(f"Total examples: {total}")
    print(f"Generated: {passed}")
    print(f"Failed: {total - passed}")
    print(f"Success rate: {passed/total*100:.1f}%")
    print()

    # List generated files
    if passed > 0:
        print("✅ GENERATED EXAMPLES:")
        for folder_name, success, _, _ in results:
            if success:
                html_file = Path("_build/html") / folder_name / "index.html"
                if html_file.exists():
                    print(f"  • {folder_name} → {html_file}")
                else:
                    print(f"  • {folder_name} (HTML file not found)")

    # List failures
    if total - passed > 0:
        print("\n❌ FAILED EXAMPLES:")
        for folder_name, success, stdout, stderr in results:
            if not success:
                print(f"  • {folder_name}")
                if stderr:
                    # Show first few lines of error
                    error_lines = stderr.strip().split("\n")
                    for line in error_lines[:2]:
                        print(f"    {line}")
                    if len(error_lines) > 2:
                        print(f"    ... ({len(error_lines)-2} more lines)")

    # Exit with error code if any generation failed
    if total - passed > 0:
        print(f"\n❌ {total - passed} examples failed to generate")
        sys.exit(1)
    else:
        print(f"\n🎉 All {total} NWB tutorial examples generated successfully!")


if __name__ == "__main__":
    main()
