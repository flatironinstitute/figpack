"""
Setup script for figpack_3d package
"""

from setuptools import setup, find_packages
import os


# Read the README file
def read_readme():
    readme_path = os.path.join(os.path.dirname(__file__), "README.md")
    if os.path.exists(readme_path):
        with open(readme_path, "r", encoding="utf-8") as f:
            return f.read()
    return "3D visualization extension for figpack using Three.js"


setup(
    name="figpack_3d",
    version="0.1.0",
    description="3D visualization extension for figpack using Three.js",
    long_description=read_readme(),
    long_description_content_type="text/markdown",
    author="figpack contributors",
    author_email="",
    url="https://github.com/flatironinstitute/figpack",
    packages=find_packages(),
    package_data={
        "figpack_3d": ["*.js"],
    },
    include_package_data=True,
    install_requires=[
        "figpack>=0.2.9",
        "numpy",
        "zarr",
    ],
    python_requires=">=3.8",
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Science/Research",
        "License :: OSI Approved :: Apache Software License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Topic :: Scientific/Engineering :: Visualization",
    ],
    keywords="visualization, 3d, three.js, interactive, webgl",
)
