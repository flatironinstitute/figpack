"""
Extension management functionality for figpack
"""

import json
import re
import subprocess
import sys
from typing import Dict, List, Optional, Tuple
from urllib.parse import urljoin

import requests


# Default wheel repository URL
DEFAULT_WHEEL_REPO_URL = "https://flatironinstitute.github.io/figpack/wheels/"


def parse_wheel_filename(filename: str) -> Optional[Dict[str, str]]:
    """
    Parse a wheel filename to extract package information.

    Wheel filename format: {distribution}-{version}(-{build tag})?-{python tag}-{abi tag}-{platform tag}.whl
    """
    if not filename.endswith(".whl"):
        return None

    # Remove .whl extension
    basename = filename[:-4]

    # Split on hyphens, but be careful about package names with hyphens
    parts = basename.split("-")

    if len(parts) < 5:
        return None

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


class ExtensionManager:
    """Manages figpack extension packages"""

    def __init__(self, wheel_repo_url: str = DEFAULT_WHEEL_REPO_URL):
        self.wheel_repo_url = wheel_repo_url.rstrip("/") + "/"
        self._available_cache = None

    def get_installed_packages(self) -> Dict[str, str]:
        """Get currently installed figpack extension packages and their versions"""
        try:
            result = subprocess.run(
                [sys.executable, "-m", "pip", "list", "--format=json"],
                capture_output=True,
                text=True,
                check=True,
            )
            installed_packages = json.loads(result.stdout)

            # Get available extensions to filter against
            available_extensions = self.get_available_packages()

            # Filter for figpack extensions
            figpack_extensions = {}
            for pkg in installed_packages:
                pkg_name = pkg["name"]
                if pkg_name in available_extensions:
                    figpack_extensions[pkg_name] = pkg["version"]

            return figpack_extensions
        except (subprocess.CalledProcessError, json.JSONDecodeError) as e:
            print(f"Warning: Could not get installed packages: {e}")
            return {}

    def get_available_packages(self) -> Dict[str, Dict[str, str]]:
        """
        Get available packages from the wheel repository.

        Returns:
            Dict mapping package names to their info (version, description, etc.)
        """
        if self._available_cache is not None:
            return self._available_cache

        try:
            # Try the simple index first as it's easier to parse
            packages = self._get_packages_from_simple_index()

            # If that fails, try the main index.html
            if not packages:
                packages = self._get_packages_from_main_index()

            self._available_cache = packages
            return packages

        except requests.RequestException as e:
            print(f"Warning: Could not fetch available packages: {e}")
            return {}

    def _get_packages_from_simple_index(self) -> Dict[str, Dict[str, str]]:
        """Get packages from simple.html using regex parsing"""
        try:
            simple_url = urljoin(self.wheel_repo_url, "simple.html")
            response = requests.get(simple_url, timeout=10)
            response.raise_for_status()

            packages = {}

            # Parse wheel filenames from simple index using regex
            # Look for href attributes containing .whl files
            wheel_pattern = re.compile(r'href="([^"]*\.whl)"')
            matches = wheel_pattern.findall(response.text)

            for wheel_filename in matches:
                wheel_info = parse_wheel_filename(wheel_filename)
                if wheel_info and wheel_info["name"].startswith("figpack_"):
                    pkg_name = wheel_info["name"]

                    if pkg_name not in packages:
                        packages[pkg_name] = {
                            "version": wheel_info["version"],
                            "description": self._get_package_description(pkg_name),
                        }
                    else:
                        current_version = packages[pkg_name]["version"]
                        new_version = wheel_info["version"]
                        if self._is_newer_version(new_version, current_version):
                            packages[pkg_name]["version"] = new_version

            return packages

        except requests.RequestException:
            return {}

    def _get_packages_from_main_index(self) -> Dict[str, Dict[str, str]]:
        """Get packages from main index.html using regex parsing"""
        try:
            index_url = urljoin(self.wheel_repo_url, "index.html")
            response = requests.get(index_url, timeout=10)
            response.raise_for_status()

            packages = {}

            # Parse wheel filenames from main index using regex
            # Look for links to .whl files
            wheel_pattern = re.compile(r'<a[^>]+href="([^"]*\.whl)"[^>]*>')
            matches = wheel_pattern.findall(response.text)

            for wheel_filename in matches:
                wheel_info = parse_wheel_filename(wheel_filename)
                if wheel_info and wheel_info["name"].startswith("figpack_"):
                    pkg_name = wheel_info["name"]

                    if pkg_name not in packages:
                        packages[pkg_name] = {
                            "version": wheel_info["version"],
                            "description": self._get_package_description(pkg_name),
                        }
                    else:
                        current_version = packages[pkg_name]["version"]
                        new_version = wheel_info["version"]
                        if self._is_newer_version(new_version, current_version):
                            packages[pkg_name]["version"] = new_version

            return packages

        except requests.RequestException:
            return {}

    def _get_package_description(self, package_name: str) -> str:
        """Get a description for a package based on its name"""
        descriptions = {
            "figpack_3d": "3D visualization extension using Three.js",
            "figpack_force_graph": "Force-directed graph visualization extension",
            "figpack_franklab": "Frank Lab specific neuroscience visualization tools",
            "figpack_spike_sorting": "Spike sorting specific visualization tools",
        }
        return descriptions.get(package_name, "Figpack extension package")

    def _is_newer_version(self, version1: str, version2: str) -> bool:
        """Simple version comparison - returns True if version1 > version2"""
        try:
            v1_parts = [int(x) for x in version1.split(".")]
            v2_parts = [int(x) for x in version2.split(".")]

            # Pad shorter version with zeros
            max_len = max(len(v1_parts), len(v2_parts))
            v1_parts.extend([0] * (max_len - len(v1_parts)))
            v2_parts.extend([0] * (max_len - len(v2_parts)))

            return v1_parts > v2_parts
        except ValueError:
            # If we can't parse versions, just do string comparison
            return version1 > version2

    def list_extensions(self) -> None:
        """List all available extensions with their status"""
        print("Available figpack extensions:")
        print()

        installed = self.get_installed_packages()
        available = self.get_available_packages()

        if not available:
            print("No extensions found in the wheel repository.")
            return

        for ext_name, ext_info in available.items():
            if ext_name in installed:
                status = f"✓ {ext_name} (installed: {installed[ext_name]}, latest: {ext_info['version']})"
            else:
                status = f"✗ {ext_name} (not installed, latest: {ext_info['version']})"

            print(f"{status} - {ext_info['description']}")

    def install_extensions(
        self, extensions: List[str], upgrade: bool = False, install_all: bool = False
    ) -> bool:
        """Install or upgrade extensions"""
        available = self.get_available_packages()

        if install_all:
            extensions = list(available.keys())

        if not extensions:
            print("No extensions specified")
            return False

        # Validate extension names
        invalid_extensions = [ext for ext in extensions if ext not in available]
        if invalid_extensions:
            print(f"Error: Unknown extensions: {', '.join(invalid_extensions)}")
            print(f"Available extensions: {', '.join(available.keys())}")
            return False

        success = True
        for extension in extensions:
            if not self._install_single_extension(extension, upgrade):
                success = False

        return success

    def _install_single_extension(self, extension: str, upgrade: bool = False) -> bool:
        """Install a single extension"""
        cmd = [
            sys.executable,
            "-m",
            "pip",
            "install",
            "--find-links",
            self.wheel_repo_url,
            extension,
        ]

        if upgrade:
            cmd.append("--upgrade")

        try:
            print(f"Installing {extension}...")
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)

            # Check if it was actually installed or already satisfied
            if "successfully installed" in result.stdout.lower():
                print(f"✓ Successfully installed {extension}")
            elif "already satisfied" in result.stdout.lower():
                print(f"✓ {extension} is already installed")
            else:
                print(f"✓ {extension} installation completed")

            return True

        except subprocess.CalledProcessError as e:
            print(f"✗ Failed to install {extension}")
            if e.stderr:
                print(f"Error: {e.stderr.strip()}")
            return False

    def uninstall_extensions(self, extensions: List[str]) -> bool:
        """Uninstall extensions"""
        if not extensions:
            print("No extensions specified")
            return False

        available = self.get_available_packages()

        # Validate extension names
        invalid_extensions = [ext for ext in extensions if ext not in available]
        if invalid_extensions:
            print(f"Error: Unknown extensions: {', '.join(invalid_extensions)}")
            return False

        # Check which extensions are actually installed
        installed = self.get_installed_packages()
        not_installed = [ext for ext in extensions if ext not in installed]

        if not_installed:
            print(
                f"Warning: These extensions are not installed: {', '.join(not_installed)}"
            )

        to_uninstall = [ext for ext in extensions if ext in installed]
        if not to_uninstall:
            print("No installed extensions to uninstall")
            return True

        # Confirm uninstallation
        print(f"This will uninstall: {', '.join(to_uninstall)}")
        response = input("Continue? [y/N]: ").strip().lower()
        if response not in ["y", "yes"]:
            print("Uninstallation cancelled")
            return False

        success = True
        for extension in to_uninstall:
            if not self._uninstall_single_extension(extension):
                success = False

        return success

    def _uninstall_single_extension(self, extension: str) -> bool:
        """Uninstall a single extension"""
        cmd = [sys.executable, "-m", "pip", "uninstall", "-y", extension]

        try:
            print(f"Uninstalling {extension}...")
            subprocess.run(cmd, capture_output=True, text=True, check=True)
            print(f"✓ Successfully uninstalled {extension}")
            return True

        except subprocess.CalledProcessError as e:
            print(f"✗ Failed to uninstall {extension}")
            if e.stderr:
                print(f"Error: {e.stderr.strip()}")
            return False
