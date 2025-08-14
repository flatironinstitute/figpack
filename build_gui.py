#!/usr/bin/env python3
"""
Build script for figpack GUI assets.
This script builds the React frontend and places it in the correct location
for inclusion in the Python package.
"""

import os
import subprocess
import sys
import shutil
from pathlib import Path
from setuptools.command.build_py import build_py


def build_gui():
    """Build the figpack GUI and place it in the correct location."""

    # Get the project root directory
    project_root = Path(__file__).parent.resolve()
    gui_dir = project_root / "figpack-gui"
    dist_dir = project_root / "figpack" / "figpack-gui-dist"

    print("Building figpack GUI...")

    # Check if figpack-gui directory exists
    if not gui_dir.exists():
        print(f"Error: GUI source directory not found: {gui_dir}")
        sys.exit(1)

    # Check if node_modules exists, if not run npm install
    node_modules = gui_dir / "node_modules"
    if not node_modules.exists():
        print("Installing GUI dependencies...")
        try:
            subprocess.run(
                ["npm", "install"],
                cwd=gui_dir,
                check=True,
                capture_output=True,
                text=True,
            )
        except subprocess.CalledProcessError as e:
            print(f"Error installing dependencies: {e}")
            print(f"stdout: {e.stdout}")
            print(f"stderr: {e.stderr}")
            sys.exit(1)

    # Remove existing dist directory if it exists
    if dist_dir.exists():
        print(f"Removing existing dist directory: {dist_dir}")
        shutil.rmtree(dist_dir)

    # Build the GUI
    print("Building GUI assets...")
    try:
        result = subprocess.run(
            ["npm", "run", "build"],
            cwd=gui_dir,
            check=True,
            capture_output=True,
            text=True,
        )
        print("GUI build completed successfully!")

        # Verify the build output exists
        if not dist_dir.exists():
            print(f"Error: Build output not found at {dist_dir}")
            sys.exit(1)

        # List what was built
        built_files = list(dist_dir.rglob("*"))
        print(f"Built {len(built_files)} files/directories")

    except subprocess.CalledProcessError as e:
        print(f"Error building GUI: {e}")
        print(f"stdout: {e.stdout}")
        print(f"stderr: {e.stderr}")
        sys.exit(1)


class BuildPyWithGUI(build_py):
    """Custom build_py command that builds the GUI before building Python package."""

    def run(self):
        # Build the GUI first
        build_gui()
        # Then run the normal build_py
        super().run()


if __name__ == "__main__":
    build_gui()
