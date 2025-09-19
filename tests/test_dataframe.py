import numpy as np
import pandas as pd
import pytest
import zarr
import zarr.storage
from datetime import datetime
from unittest.mock import MagicMock

import figpack
from figpack.views.DataFrame import DataFrame


@pytest.fixture
def sample_dataframe():
    """Create a sample DataFrame for testing"""
    data = {
        "name": ["Alice", "Bob", "Charlie", "Diana"],
        "age": [25, 30, 35, 28],
        "salary": [50000.0, 60000.0, 70000.0, 55000.0],
        "is_active": [True, False, True, True],
        "start_date": [
            datetime(2020, 1, 15),
            datetime(2019, 6, 1),
            datetime(2018, 3, 10),
            datetime(2021, 9, 5),
        ],
    }
    return pd.DataFrame(data)


@pytest.fixture
def empty_dataframe():
    """Create an empty DataFrame for testing"""
    return pd.DataFrame()


@pytest.fixture
def mixed_types_dataframe():
    """Create a DataFrame with various data types"""
    data = {
        "int_col": [1, 2, 3],
        "float_col": [1.1, 2.2, 3.3],
        "str_col": ["a", "b", "c"],
        "bool_col": [True, False, True],
        "datetime_col": [
            datetime(2023, 1, 1),
            datetime(2023, 1, 2),
            datetime(2023, 1, 3),
        ],
        "object_col": [{"a": 1}, [1, 2], "string"],
    }
    return pd.DataFrame(data)


def test_dataframe_init_valid():
    """Test DataFrame initialization with valid pandas DataFrame"""
    df = pd.DataFrame({"a": [1, 2, 3], "b": [4, 5, 6]})
    view = DataFrame(df)
    assert view.df.equals(df)


def test_dataframe_init_invalid():
    """Test DataFrame initialization with invalid input"""
    with pytest.raises(ValueError, match="df must be a pandas DataFrame"):
        DataFrame("not a dataframe")

    with pytest.raises(ValueError, match="df must be a pandas DataFrame"):
        DataFrame([1, 2, 3])

    with pytest.raises(ValueError, match="df must be a pandas DataFrame"):
        DataFrame(None)


def test_write_to_zarr_basic(sample_dataframe):
    """Test basic writing to zarr group"""
    view = DataFrame(sample_dataframe)
    store = zarr.storage.MemoryStore()
    root = zarr.group(store=store)
    group = figpack.Group(root.create_group("test"))

    view.write_to_zarr_group(group)

    # Check basic attributes
    assert group.attrs["view_type"] == "DataFrame"
    assert "csv_data" in group
    assert "data_size" in group.attrs
    assert "row_count" in group.attrs
    assert "column_count" in group.attrs
    assert "column_info" in group.attrs

    # Verify array properties
    csv_data_array = group["csv_data"]
    assert csv_data_array.dtype == np.uint8

    # Check metadata
    assert group.attrs["row_count"] == len(sample_dataframe)
    assert group.attrs["column_count"] == len(sample_dataframe.columns)

    # Convert array back to string for content verification
    csv_data = csv_data_array[:].tobytes().decode("utf-8")
    assert (
        "name,age,salary,is_active,start_date" in csv_data
    )  # Header should be present
    assert "Alice" in csv_data  # Data should be present
    assert "25" in csv_data  # Numeric data should be present

    # Verify data size
    assert group.attrs["data_size"] == len(csv_data.encode("utf-8"))


def test_write_to_zarr_empty_dataframe(empty_dataframe):
    """Test writing empty DataFrame to zarr group"""
    view = DataFrame(empty_dataframe)
    store = zarr.storage.MemoryStore()
    root = zarr.group(store=store)
    group = figpack.Group(root.create_group("test"))

    view.write_to_zarr_group(group)

    # Check basic attributes
    assert group.attrs["view_type"] == "DataFrame"
    assert group.attrs["row_count"] == 0
    assert group.attrs["column_count"] == 0
    assert "csv_data" in group

    # Convert array back to string
    csv_data_array = group["csv_data"]
    csv_data = csv_data_array[:].tobytes().decode("utf-8")

    # Empty DataFrame should still have a header line (empty)
    assert csv_data.strip() == ""


def test_write_to_zarr_mixed_types(mixed_types_dataframe):
    """Test writing DataFrame with mixed data types"""
    view = DataFrame(mixed_types_dataframe)
    store = zarr.storage.MemoryStore()
    root = zarr.group(store=store)
    group = figpack.Group(root.create_group("test"))

    view.write_to_zarr_group(group)

    # Check basic attributes
    assert group.attrs["view_type"] == "DataFrame"
    assert group.attrs["row_count"] == len(mixed_types_dataframe)
    assert group.attrs["column_count"] == len(mixed_types_dataframe.columns)

    # Check column info
    import json

    column_info = json.loads(group.attrs["column_info"])
    assert len(column_info) == len(mixed_types_dataframe.columns)

    # Check that column types are correctly identified
    column_names = [col["name"] for col in column_info]
    assert "int_col" in column_names
    assert "float_col" in column_names
    assert "str_col" in column_names
    assert "bool_col" in column_names
    assert "datetime_col" in column_names
    assert "object_col" in column_names

    # Check simple dtype mapping
    simple_dtypes = {col["name"]: col["simple_dtype"] for col in column_info}
    assert simple_dtypes["int_col"] == "integer"
    assert simple_dtypes["float_col"] == "float"
    assert simple_dtypes["str_col"] == "string"
    assert simple_dtypes["bool_col"] == "boolean"
    assert simple_dtypes["datetime_col"] == "datetime"
    assert simple_dtypes["object_col"] == "string"  # object defaults to string


def test_column_info_structure(sample_dataframe):
    """Test that column info has correct structure"""
    view = DataFrame(sample_dataframe)
    store = zarr.storage.MemoryStore()
    root = zarr.group(store=store)
    group = figpack.Group(root.create_group("test"))

    view.write_to_zarr_group(group)

    import json

    column_info = json.loads(group.attrs["column_info"])

    # Check structure of each column info
    for col_info in column_info:
        assert "name" in col_info
        assert "dtype" in col_info
        assert "simple_dtype" in col_info
        assert isinstance(col_info["name"], str)
        assert isinstance(col_info["dtype"], str)
        assert isinstance(col_info["simple_dtype"], str)


def test_csv_roundtrip(sample_dataframe):
    """Test that CSV conversion preserves data integrity"""
    view = DataFrame(sample_dataframe)
    store = zarr.storage.MemoryStore()
    root = zarr.group(store=store)
    group = figpack.Group(root.create_group("test"))

    view.write_to_zarr_group(group)

    # Extract CSV data
    csv_data_array = group["csv_data"]
    csv_string = csv_data_array[:].tobytes().decode("utf-8")

    # Parse CSV back to DataFrame
    from io import StringIO

    reconstructed_df = pd.read_csv(StringIO(csv_string))

    # Check that we have the same number of rows and columns
    assert len(reconstructed_df) == len(sample_dataframe)
    assert len(reconstructed_df.columns) == len(sample_dataframe.columns)

    # Check column names
    assert list(reconstructed_df.columns) == list(sample_dataframe.columns)


def test_error_handling():
    """Test error handling in write_to_zarr_group"""
    # Create a mock DataFrame that will raise an exception
    mock_df = MagicMock()
    mock_df.to_csv.side_effect = Exception("CSV conversion failed")
    mock_df.columns = ["col1", "col2"]

    view = DataFrame.__new__(DataFrame)  # Create instance without calling __init__
    view.df = mock_df

    store = zarr.storage.MemoryStore()
    root = zarr.group(store=store)
    group = figpack.Group(root.create_group("test"))

    # Should not raise exception, but should store error info
    view.write_to_zarr_group(group)

    # Check error attributes
    assert "error" in group.attrs
    assert "Failed to process DataFrame" in group.attrs["error"]
    assert group.attrs["row_count"] == 0
    assert group.attrs["column_count"] == 0
    assert group.attrs["data_size"] == 0
    assert group.attrs["column_info"] == "[]"
    assert "csv_data" in group


def test_dtype_mapping():
    """Test specific dtype mapping logic"""
    # Create DataFrame with specific dtypes
    df = pd.DataFrame(
        {
            "int8_col": pd.array([1, 2, 3], dtype="int8"),
            "int64_col": pd.array([1, 2, 3], dtype="int64"),
            "float32_col": pd.array([1.1, 2.2, 3.3], dtype="float32"),
            "float64_col": pd.array([1.1, 2.2, 3.3], dtype="float64"),
            "bool_col": pd.array([True, False, True], dtype="bool"),
            "datetime_col": pd.to_datetime(["2023-01-01", "2023-01-02", "2023-01-03"]),
            "string_col": pd.array(["a", "b", "c"], dtype="string"),
            "category_col": pd.Categorical(["x", "y", "z"]),
        }
    )

    view = DataFrame(df)
    store = zarr.storage.MemoryStore()
    root = zarr.group(store=store)
    group = figpack.Group(root.create_group("test"))

    view.write_to_zarr_group(group)

    import json

    column_info = json.loads(group.attrs["column_info"])
    simple_dtypes = {col["name"]: col["simple_dtype"] for col in column_info}

    assert simple_dtypes["int8_col"] == "integer"
    assert simple_dtypes["int64_col"] == "integer"
    assert simple_dtypes["float32_col"] == "float"
    assert simple_dtypes["float64_col"] == "float"
    assert simple_dtypes["bool_col"] == "boolean"
    assert simple_dtypes["datetime_col"] == "datetime"
    assert simple_dtypes["string_col"] == "string"
    assert simple_dtypes["category_col"] == "string"  # category defaults to string


def test_large_dataframe():
    """Test with a larger DataFrame to ensure performance"""
    # Create a larger DataFrame
    n_rows = 1000
    df = pd.DataFrame(
        {
            "id": range(n_rows),
            "value": np.random.randn(n_rows),
            "category": np.random.choice(["A", "B", "C"], n_rows),
            "timestamp": pd.date_range("2023-01-01", periods=n_rows, freq="h"),
        }
    )

    view = DataFrame(df)
    store = zarr.storage.MemoryStore()
    root = zarr.group(store=store)
    group = figpack.Group(root.create_group("test"))

    view.write_to_zarr_group(group)

    # Check that it completed successfully
    assert group.attrs["view_type"] == "DataFrame"
    assert group.attrs["row_count"] == n_rows
    assert group.attrs["column_count"] == 4
    assert "csv_data" in group

    # Verify compression worked
    csv_data_array = group["csv_data"]
    assert csv_data_array.dtype == np.uint8
