"""
Pytest configuration and fixtures for figpack tests
"""

import pathlib
import tempfile
from unittest.mock import Mock

import numpy as np
import pytest
import zarr


@pytest.fixture
def temp_dir():
    """Provide a temporary directory for tests"""
    with tempfile.TemporaryDirectory() as temp_dir:
        yield pathlib.Path(temp_dir)


@pytest.fixture
def sample_image_data():
    """Provide sample image data for testing"""
    # Create a simple RGB test image
    np.random.seed(42)  # For reproducible tests
    return np.random.randint(0, 255, (50, 50, 3), dtype=np.uint8)


@pytest.fixture
def sample_grayscale_data():
    """Provide sample grayscale image data for testing"""
    np.random.seed(42)  # For reproducible tests
    return np.random.randint(0, 255, (30, 30), dtype=np.uint8)


@pytest.fixture
def zarr_store(temp_dir):
    """Provide a zarr store for testing"""
    store = zarr.DirectoryStore(str(temp_dir / "test.zarr"))
    return store


@pytest.fixture
def zarr_group(zarr_store):
    """Provide a zarr group for testing"""
    return zarr.group(store=zarr_store)


@pytest.fixture
def mock_requests_response():
    """Provide a mock requests response"""
    mock_response = Mock()
    mock_response.status_code = 200
    mock_response.raise_for_status.return_value = None
    mock_response.text = '{"test": "data"}'
    mock_response.content = b'{"test": "data"}'
    mock_response.json.return_value = {"test": "data"}
    return mock_response


# Test markers
pytest.mark.unit = pytest.mark.unit
pytest.mark.integration = pytest.mark.integration
pytest.mark.slow = pytest.mark.slow
