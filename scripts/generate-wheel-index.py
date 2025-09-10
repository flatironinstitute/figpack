#!/usr/bin/env python3
"""
Generate an HTML index page for Python wheels that's compatible with pip's --find-links option.
"""

import os
import sys
import re
from pathlib import Path
from typing import List, Dict, Tuple


def parse_wheel_filename(filename: str) -> Dict[str, str]:
    """
    Parse a wheel filename to extract package information.

    Wheel filename format: {distribution}-{version}(-{build tag})?-{python tag}-{abi tag}-{platform tag}.whl
    """
    # Remove .whl extension
    basename = filename[:-4] if filename.endswith(".whl") else filename

    # Split on hyphens, but be careful about package names with hyphens
    parts = basename.split("-")

    if len(parts) < 5:
        # Fallback for malformed filenames
        return {
            "name": parts[0] if parts else filename,
            "version": parts[1] if len(parts) > 1 else "unknown",
            "python_tag": "unknown",
            "abi_tag": "unknown",
            "platform_tag": "unknown",
        }

    # The last 3 parts are always python_tag, abi_tag, platform_tag
    python_tag = parts[-3]
    abi_tag = parts[-2]
    platform_tag = parts[-1]

    # Everything before the last 3 parts, split between name and version
    name_version_parts = parts[:-3]

    # Find where version starts (first part that looks like a version number)
    version_start_idx = 1  # Default to second part
    for i, part in enumerate(name_version_parts[1:], 1):
        if re.match(r"^\d+", part):  # Starts with a digit
            version_start_idx = i
            break

    name = "-".join(name_version_parts[:version_start_idx])
    version = "-".join(name_version_parts[version_start_idx:])

    return {
        "name": name,
        "version": version,
        "python_tag": python_tag,
        "abi_tag": abi_tag,
        "platform_tag": platform_tag,
    }


def get_wheel_info(wheels_dir: Path) -> List[Tuple[str, Dict[str, str]]]:
    """Get information about all wheel files in the directory."""
    wheels = []

    for wheel_file in wheels_dir.glob("*.whl"):
        info = parse_wheel_filename(wheel_file.name)
        wheels.append((wheel_file.name, info))

    # Sort by package name, then by version
    wheels.sort(key=lambda x: (x[1]["name"], x[1]["version"]))

    return wheels


def generate_html_index(
    wheels_dir: Path, wheels_info: List[Tuple[str, Dict[str, str]]]
) -> str:
    """Generate HTML index page for the wheels."""

    html = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Figpack Extension Wheels</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
        }
        h1 {
            color: #2c3e50;
            border-bottom: 2px solid #3498db;
            padding-bottom: 10px;
        }
        .intro {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .install-command {
            background-color: #2c3e50;
            color: #ecf0f1;
            padding: 15px;
            border-radius: 5px;
            font-family: 'Courier New', monospace;
            margin: 10px 0;
            overflow-x: auto;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        th {
            background-color: #3498db;
            color: white;
        }
        tr:hover {
            background-color: #f5f5f5;
        }
        .wheel-link {
            color: #3498db;
            text-decoration: none;
            font-weight: bold;
        }
        .wheel-link:hover {
            text-decoration: underline;
        }
        .package-name {
            font-weight: bold;
            color: #2c3e50;
        }
        .version {
            color: #27ae60;
            font-family: monospace;
        }
        .compatibility {
            font-size: 0.9em;
            color: #7f8c8d;
        }
    </style>
</head>
<body>
    <h1>Figpack Extension Wheels</h1>
    
    <div class="intro">
        <p>This page provides Python wheels for figpack extension packages. You can install these packages directly using pip's <code>--find-links</code> option.</p>
        
        <h3>Installation Instructions</h3>
        <p>To install any of the extension packages below, use:</p>
        <div class="install-command">pip install --find-links https://flatironinstitute.github.io/figpack/wheels/ &lt;package-name&gt;</div>
        
        <p>For example, to install the 3D visualization extension:</p>
        <div class="install-command">pip install --find-links https://flatironinstitute.github.io/figpack/wheels/ figpack_3d</div>
    </div>

    <h2>Available Wheels</h2>
    <table>
        <thead>
            <tr>
                <th>Package</th>
                <th>Version</th>
                <th>Wheel File</th>
                <th>Python Compatibility</th>
            </tr>
        </thead>
        <tbody>
"""

    # Group wheels by package name
    packages = {}
    for filename, info in wheels_info:
        package_name = info["name"]
        if package_name not in packages:
            packages[package_name] = []
        packages[package_name].append((filename, info))

    # Generate table rows
    for package_name in sorted(packages.keys()):
        wheels = packages[package_name]
        for i, (filename, info) in enumerate(wheels):
            html += f"""            <tr>
                <td class="package-name">{'figpack_' + package_name.split('_', 1)[1] if package_name.startswith('figpack_') else package_name}</td>
                <td class="version">{info['version']}</td>
                <td><a href="{filename}" class="wheel-link">{filename}</a></td>
                <td class="compatibility">{info['python_tag']}-{info['abi_tag']}-{info['platform_tag']}</td>
            </tr>
"""

    html += """        </tbody>
    </table>

    <div class="intro">
        <h3>Package Descriptions</h3>
        <ul>
            <li><strong>figpack_3d</strong>: 3D visualization extension using Three.js</li>
            <li><strong>figpack_force_graph</strong>: Force-directed graph visualization extension</li>
            <li><strong>figpack_franklab</strong>: Frank Lab specific neuroscience visualization tools</li>
            <li><strong>figpack_spike_sorting</strong>: Spike sorting specific visualization tools</li>
        </ul>
        
        <p>For more information about figpack and its extensions, visit the <a href="../">main documentation</a>.</p>
    </div>
</body>
</html>"""

    return html


def main():
    if len(sys.argv) != 2:
        print("Usage: python generate-wheel-index.py <wheels_directory>")
        print("Example: python generate-wheel-index.py docs/_build/html/wheels")
        sys.exit(1)

    wheels_dir = Path(sys.argv[1])

    if not wheels_dir.exists():
        print(f"Error: Wheels directory {wheels_dir} does not exist")
        sys.exit(1)

    # Get wheel information
    wheels_info = get_wheel_info(wheels_dir)

    if not wheels_info:
        print(f"Warning: No wheel files found in {wheels_dir}")
        # Create a basic index anyway
        wheels_info = []

    # Generate HTML index
    html_content = generate_html_index(wheels_dir, wheels_info)

    # Write index.html
    index_path = wheels_dir / "index.html"
    with open(index_path, "w", encoding="utf-8") as f:
        f.write(html_content)

    print(f"Generated wheel index at {index_path}")
    print(f"Found {len(wheels_info)} wheel files")

    # Also create a simple index for pip compatibility
    simple_index_path = wheels_dir / "simple.html"
    simple_html = "<!DOCTYPE html>\n<html><body>\n"
    for filename, info in wheels_info:
        simple_html += f'<a href="{filename}">{filename}</a><br>\n'
    simple_html += "</body></html>\n"

    with open(simple_index_path, "w", encoding="utf-8") as f:
        f.write(simple_html)

    print(f"Generated simple index at {simple_index_path}")


if __name__ == "__main__":
    main()
