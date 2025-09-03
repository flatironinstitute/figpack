#!/usr/bin/env python3
"""
Automatic Basic Views Tutorial Snippet Tester

Parses docs/basic_views_tutorial.md, extracts Python code blocks, modifies them to be
non-interactive, and tests each one by running in a subprocess.
"""

import re
import tempfile
import subprocess
import os
import sys
from pathlib import Path
from typing import List, Tuple


def extract_python_snippets(tutorial_content: str) -> List[Tuple[str, str]]:
    """
    Extract Python code blocks from tutorial markdown content.

    Returns:
        List of (section_name, code) tuples
    """
    snippets = []

    # Find all Python code blocks
    pattern = r"```python\n(.*?)\n```"
    matches = re.findall(pattern, tutorial_content, re.DOTALL)

    # Also look for section headers to provide context
    lines = tutorial_content.split("\n")
    current_section = "Unknown"
    snippet_counter = 1

    # Process line by line to associate snippets with sections
    i = 0
    while i < len(lines):
        line = lines[i]

        # Check for section headers
        if line.startswith("##"):
            current_section = line.strip("# ").strip()
        elif line.startswith("###"):
            current_section = line.strip("# ").strip()

        # Check for start of Python code block
        if line.strip() == "```python":
            # Find the end of the code block
            code_lines = []
            i += 1
            while i < len(lines) and lines[i].strip() != "```":
                code_lines.append(lines[i])
                i += 1

            if code_lines:
                code = "\n".join(code_lines)
                snippet_name = f"{snippet_counter:02d}_{current_section.replace(' ', '_').replace('/', '_')}"
                snippets.append((snippet_name, code))
                snippet_counter += 1

        i += 1

    return snippets


def modify_snippet_for_testing(code: str) -> str:
    """
    Modify code snippet to be non-interactive for testing.

    Args:
        code: Original code snippet

    Returns:
        Modified code that won't open browsers or wait for input
    """
    modified = code

    # Replace open_in_browser=True with False
    modified = re.sub(r"open_in_browser\s*=\s*True", "open_in_browser=False", modified)

    # Add wait_for_input=False to .show() calls that don't already have it
    # Look for .show() calls and add the parameter if not present
    def add_wait_for_input(match):
        show_call = match.group(0)
        if "wait_for_input" not in show_call:
            # Insert wait_for_input=False before the closing parenthesis
            if show_call.endswith(")"):
                # Check if there are already parameters
                if "(" in show_call and show_call.count("(") == show_call.count(")"):
                    # Find the last opening paren and insert before closing
                    parts = show_call.rsplit(")", 1)
                    if len(parts) == 2:
                        before_close = parts[0]
                        # Check if we need a comma
                        if before_close.strip().endswith("("):
                            # No existing parameters
                            return before_close + "wait_for_input=False)"
                        else:
                            # Has existing parameters
                            return before_close + ", wait_for_input=False)"
        return show_call

    # Find .show() method calls
    modified = re.sub(r"\.show\([^)]*\)", add_wait_for_input, modified)

    return modified


def test_snippet(snippet_code: str, snippet_name: str) -> Tuple[bool, str, str, str]:
    """
    Test a code snippet by writing to temp file and running with subprocess.

    Args:
        snippet_code: The Python code to test
        snippet_name: Name for identification

    Returns:
        Tuple of (success, stdout, stderr, actual_code)
    """
    try:
        with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False) as f:
            f.write(snippet_code)
            temp_file = f.name

        # Run the snippet
        result = subprocess.run(
            [sys.executable, temp_file],
            capture_output=True,
            text=True,
            timeout=30,  # 30 second timeout
            cwd=Path(__file__).parent.parent,  # Run from project root
        )

        success = result.returncode == 0
        return success, result.stdout, result.stderr, snippet_code

    except subprocess.TimeoutExpired:
        return False, "", "Timeout: Snippet took longer than 30 seconds", snippet_code
    except Exception as e:
        return False, "", f"Error running snippet: {str(e)}", snippet_code
    finally:
        # Clean up temp file
        try:
            os.unlink(temp_file)
        except:
            pass


def main():
    """Main function to run all tutorial snippet tests."""
    print("🧪 Tutorial Snippet Tester")
    print("=" * 50)

    # Read tutorial file
    tutorial_path = Path(__file__).parent.parent / "docs" / "basic_views_tutorial.md"

    if not tutorial_path.exists():
        print(f"❌ Tutorial file not found: {tutorial_path}")
        sys.exit(1)

    try:
        with open(tutorial_path, "r", encoding="utf-8") as f:
            tutorial_content = f.read()
    except Exception as e:
        print(f"❌ Error reading tutorial file: {e}")
        sys.exit(1)

    # Extract snippets
    print(f"📖 Parsing {tutorial_path}")
    snippets = extract_python_snippets(tutorial_content)
    print(f"Found {len(snippets)} Python code snippets")
    print()

    if not snippets:
        print("❌ No Python snippets found in tutorial")
        sys.exit(1)

    # Test each snippet
    results = []
    for i, (snippet_name, code) in enumerate(snippets, 1):
        print(f"🔍 Testing snippet {i}/{len(snippets)}: {snippet_name}")

        # Modify code for testing
        modified_code = modify_snippet_for_testing(code)

        # Test the snippet
        success, stdout, stderr, actual_code = test_snippet(modified_code, snippet_name)

        if success:
            print(f"  ✅ PASS")
        else:
            print(f"  ❌ FAIL")
            if stderr:
                print(f"     Error: {stderr.strip()}")

            # Print the actual script that was run for immediate debugging
            print(f"     Script that was executed:")
            print("     " + "-" * 40)
            for line_num, line in enumerate(actual_code.split("\n"), 1):
                print(f"     {line_num:3d}: {line}")
            print("     " + "-" * 40)

            # Exit immediately on first failure
            print(f"\n❌ Test failed on snippet: {snippet_name}")
            sys.exit(1)

        results.append((snippet_name, success, stdout, stderr, actual_code))
        print()

    # Summary
    print("=" * 50)
    print("📊 SUMMARY")
    print("=" * 50)

    passed = sum(1 for _, success, _, _, _ in results if success)
    total = len(results)

    print(f"Total snippets: {total}")
    print(f"Passed: {passed}")
    print(f"Failed: {total - passed}")
    print(f"Success rate: {passed/total*100:.1f}%")
    print()

    # Detailed results
    if total - passed > 0:
        print("❌ FAILED SNIPPETS:")
        for snippet_name, success, stdout, stderr, actual_code in results:
            if not success:
                print(f"  • {snippet_name}")
                if stderr:
                    # Show first few lines of error
                    error_lines = stderr.strip().split("\n")
                    for line in error_lines[:3]:
                        print(f"    {line}")
                    if len(error_lines) > 3:
                        print(f"    ... ({len(error_lines)-3} more lines)")

                # Print the actual script that was run
                print(f"    Script that was executed:")
                print("    " + "-" * 40)
                for line_num, line in enumerate(actual_code.split("\n"), 1):
                    print(f"    {line_num:3d}: {line}")
                print("    " + "-" * 40)
                print()

    print("✅ PASSED SNIPPETS:")
    for snippet_name, success, stdout, stderr, actual_code in results:
        if success:
            print(f"  • {snippet_name}")

    # Exit with error code if any tests failed
    if total - passed > 0:
        sys.exit(1)
    else:
        print(f"\n🎉 All {total} tutorial snippets passed!")


if __name__ == "__main__":
    main()
