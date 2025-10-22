#!/usr/bin/env python3
"""
Generate example_rotator.txt by extracting iframe URLs from tutorial markdown files.
"""

import re
from pathlib import Path


def extract_iframe_urls(markdown_content):
    """Extract src URLs from iframe tags in markdown content."""
    # Regex pattern to match iframe tags and capture src attribute
    pattern = r'<iframe[^>]+(?:data-)?src=["\']([^"\']+)["\']'
    matches = re.findall(pattern, markdown_content)
    return matches


def main():
    # Define the docs directory path
    docs_dir = Path(__file__).parent.parent

    # Tutorial markdown files to parse
    tutorial_files = [
        "basic_views_tutorial.md",
        "misc_tutorial.md",
        "nwb_tutorial.md",
        "spike_sorting_tutorial.md",
    ]

    # Collect all iframe URLs
    all_urls = []

    for tutorial_file in tutorial_files:
        file_path = docs_dir / tutorial_file

        if not file_path.exists():
            print(f"Warning: {tutorial_file} not found, skipping...")
            continue

        print(f"Processing {tutorial_file}...")

        # Read the markdown file
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Extract iframe URLs
        urls = extract_iframe_urls(content)

        if urls:
            print(f"  Found {len(urls)} iframe(s)")
            all_urls.extend(urls)
        else:
            print(f"  No iframes found")

    # Write to example_rotator.txt
    output_file = docs_dir / "example_rotator.txt"

    print(f"\nWriting {len(all_urls)} URLs to {output_file}...")

    with open(output_file, "w", encoding="utf-8") as f:
        for url in all_urls:
            f.write(f"{url}\n")

    print(f"Done! Generated {output_file}")
    print(f"\nURLs included:")
    for i, url in enumerate(all_urls, 1):
        print(f"  {i}. {url}")


if __name__ == "__main__":
    main()
