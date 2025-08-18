#!/usr/bin/env python3
"""
Simple test runner script for figpack
"""

import subprocess
import sys
import os


def run_command(cmd, description):
    """Run a command and handle errors"""
    print(f"\n{'='*60}")
    print(f"Running: {description}")
    print(f"Command: {' '.join(cmd)}")
    print(f"{'='*60}")

    result = subprocess.run(cmd, capture_output=False)
    if result.returncode != 0:
        print(f"\n❌ {description} failed with exit code {result.returncode}")
        return False
    else:
        print(f"\n✅ {description} passed")
        return True


def main():
    """Main test runner"""
    print("🧪 Running figpack test suite")

    # Change to project directory
    os.chdir(os.path.dirname(os.path.abspath(__file__)))

    success = True

    # Run tests with coverage
    if not run_command(
        [
            "python",
            "-m",
            "pytest",
            "--cov=figpack",
            "--cov-report=term-missing",
            "--cov-report=html",
        ],
        "Running tests with coverage",
    ):
        success = False

    # Run tests without coverage for faster feedback
    if not run_command(["python", "-m", "pytest", "-v"], "Running tests (verbose)"):
        success = False

    if success:
        print(f"\n🎉 All tests passed!")
        print("📊 Coverage report generated in htmlcov/index.html")
    else:
        print(f"\n💥 Some tests failed!")
        sys.exit(1)


if __name__ == "__main__":
    main()
