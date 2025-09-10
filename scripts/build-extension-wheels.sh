#!/bin/bash

# Build wheels for all extension packages
# This script handles both JavaScript compilation and Python wheel building

set -e  # Exit on any error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
EXTENSION_PACKAGES_DIR="$PROJECT_ROOT/extension_packages"

if [ -z "$1" ]; then
    echo "Usage: $0 <wheels_output_directory>"
    echo "Example: $0 docs/_build/html/wheels"
    exit 1
fi

# Convert to absolute path
if [[ "$1" = /* ]]; then
    WHEELS_OUTPUT_DIR="$1"
else
    WHEELS_OUTPUT_DIR="$(pwd)/$1"
fi

echo "Building extension wheels..."
echo "Extension packages directory: $EXTENSION_PACKAGES_DIR"
echo "Wheels output directory: $WHEELS_OUTPUT_DIR"

# Create wheels output directory
mkdir -p "$WHEELS_OUTPUT_DIR"

# Function to build a single extension
build_extension() {
    local ext_dir="$1"
    local ext_name="$(basename "$ext_dir")"
    
    echo ""
    echo "=== Building $ext_name ==="
    
    cd "$ext_dir"
    
    # Check if this extension needs JavaScript compilation
    if [ -f "package.json" ]; then
        echo "Found package.json, building JavaScript assets..."
        npm install
        npm run build
    else
        echo "No package.json found, skipping JavaScript build"
    fi
    
    # Build Python wheel
    echo "Building Python wheel..."
    python -m build --wheel
    
    # Copy wheel to output directory
    echo "Copying wheel to output directory..."
    cp dist/*.whl "$WHEELS_OUTPUT_DIR/"
    
    echo "✓ Successfully built $ext_name"
}

# Build wheels for all extension packages
for ext_dir in "$EXTENSION_PACKAGES_DIR"/*; do
    if [ -d "$ext_dir" ] && [ -f "$ext_dir/setup.py" ]; then
        build_extension "$ext_dir"
    else
        echo "Skipping $(basename "$ext_dir") - not a valid Python package"
    fi
done

echo ""
echo "=== Wheel building complete ==="
echo "Built wheels:"
ls -la "$WHEELS_OUTPUT_DIR"/*.whl
