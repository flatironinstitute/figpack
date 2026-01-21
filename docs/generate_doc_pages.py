#!/usr/bin/env python3
"""
Generate doc-pages.json from available documentation files.

This script scans the docs directory for all .md files and generates
the doc-pages.json file with metadata for each page.
"""

import json
import re
from pathlib import Path
from typing import List, Dict, Any

# Base URL for the documentation
BASE_URL = "https://flatironinstitute.github.io/figpack/"

# Pages that should have includeFromStart set to true
INCLUDE_FROM_START = {
    "index.html",
    "installation.html",
    "creating_figures.html",
    "basic_views_tutorial.html",
}

# Directories to exclude from scanning
EXCLUDE_DIRS = {
    "_build",
    "_static",
    "_templates",
    "devel",
}

# Files to exclude
EXCLUDE_FILES = {
    "README.md",
}


def extract_title_from_md(file_path: Path) -> str:
    """
    Extract the title from a markdown file.

    Looks for the first # heading. If not found, derives title from filename.
    """
    try:
        content = file_path.read_text(encoding="utf-8")

        # Look for first # heading (level 1)
        match = re.search(r"^#\s+(.+)$", content, re.MULTILINE)
        if match:
            return match.group(1).strip()
    except Exception as e:
        print(f"Warning: Could not read {file_path}: {e}")

    # Fallback: derive from filename
    # Convert: basic_views_tutorial -> Basic Views Tutorial
    name = file_path.stem
    # Replace underscores with spaces and title case
    title = name.replace("_", " ").title()
    return title


def md_path_to_html_url(md_path: Path, docs_root: Path) -> str:
    """
    Convert a markdown file path to its corresponding HTML URL.

    Example: docs/basic_views_tutorial.md -> https://...../basic_views_tutorial.html
    """
    # Get relative path from docs root
    rel_path = md_path.relative_to(docs_root)

    # Convert .md to .html
    html_path = rel_path.with_suffix(".html")

    # Convert to URL
    url = BASE_URL + str(html_path).replace("\\", "/")
    return url


def md_path_to_source_url(md_path: Path, docs_root: Path) -> str:
    """
    Convert a markdown file path to its corresponding source URL.

    Example: docs/basic_views_tutorial.md -> https://..../_sources/basic_views_tutorial.md.txt
    """
    # Get relative path from docs root
    rel_path = md_path.relative_to(docs_root)

    # Convert to source URL format
    source_path = f"_sources/{rel_path}.txt"
    url = BASE_URL + source_path.replace("\\", "/")
    return url


def should_include_file(file_path: Path, docs_root: Path) -> bool:
    """
    Determine if a file should be included in the doc-pages.json.
    """
    # Check if file is in an excluded directory
    try:
        rel_path = file_path.relative_to(docs_root)
        for part in rel_path.parts[:-1]:  # Exclude the filename itself
            if part in EXCLUDE_DIRS:
                return False
    except ValueError:
        return False

    # Check if filename is excluded
    if file_path.name in EXCLUDE_FILES:
        return False

    return True


def scan_docs_directory(docs_root: Path) -> List[Dict[str, Any]]:
    """
    Scan the docs directory for all markdown files and generate metadata.
    """
    doc_pages = []

    # Find all .md files recursively
    for md_file in sorted(docs_root.rglob("*.md")):
        if not should_include_file(md_file, docs_root):
            continue

        # Extract title
        title = extract_title_from_md(md_file)

        # Generate URLs
        url = md_path_to_html_url(md_file, docs_root)
        source_url = md_path_to_source_url(md_file, docs_root)

        # Determine includeFromStart
        html_filename = md_file.with_suffix(".html").name
        include_from_start = html_filename in INCLUDE_FROM_START

        doc_pages.append(
            {
                "title": title,
                "url": url,
                "sourceUrl": source_url,
                "includeFromStart": include_from_start,
            }
        )

    # Sort: index.html first, then alphabetically by URL
    def sort_key(page: Dict[str, Any]) -> tuple:
        if "index.html" in page["url"]:
            return (0, page["url"])
        return (1, page["url"])

    doc_pages.sort(key=sort_key)

    return doc_pages


def main():
    """Main function to generate doc-pages.json."""
    # Get the docs directory (parent of this script)
    script_dir = Path(__file__).parent
    docs_root = script_dir

    print(f"Scanning documentation files in: {docs_root}")

    # Scan and generate metadata
    doc_pages = scan_docs_directory(docs_root)

    print(f"Found {len(doc_pages)} documentation pages")

    # Create output structure
    output = {"docPages": doc_pages}

    # Write to doc-pages.json
    output_file = docs_root / "doc-pages.json"
    with output_file.open("w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
        f.write("\n")  # Add trailing newline

    print(f"Generated: {output_file}")
    print(f"\nPages with includeFromStart=true:")
    for page in doc_pages:
        if page["includeFromStart"]:
            print(f"  - {page['title']}")


if __name__ == "__main__":
    main()
