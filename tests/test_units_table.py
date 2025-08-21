import pytest
import zarr

from figpack.spike_sorting.views.UnitsTable import UnitsTable
from figpack.spike_sorting.views.UnitsTableColumn import UnitsTableColumn
from figpack.spike_sorting.views.UnitsTableRow import UnitsTableRow
from figpack.spike_sorting.views.UnitSimilarityScore import UnitSimilarityScore


@pytest.fixture
def sample_columns():
    """Create sample columns for testing"""
    return [
        UnitsTableColumn(key="id", label="Unit ID", dtype="int"),
        UnitsTableColumn(key="quality", label="Quality", dtype="float"),
        UnitsTableColumn(key="group", label="Group", dtype="str"),
        UnitsTableColumn(key="valid", label="Valid", dtype="bool"),
    ]


@pytest.fixture
def sample_rows():
    """Create sample rows for testing"""
    return [
        UnitsTableRow(
            unit_id="unit1",
            values={"id": 1, "quality": 0.95, "group": "good", "valid": True},
        ),
        UnitsTableRow(
            unit_id="unit2",
            values={"id": 2, "quality": 0.85, "group": "medium", "valid": True},
        ),
        UnitsTableRow(
            unit_id=3,  # Test numeric unit_id
            values={"id": 3, "quality": 0.75, "group": "noise", "valid": False},
        ),
    ]


@pytest.fixture
def sample_similarity_scores():
    """Create sample similarity scores for testing"""
    return [
        UnitSimilarityScore(unit_id1="unit1", unit_id2="unit2", similarity=0.8),
        UnitSimilarityScore(unit_id1="unit2", unit_id2=3, similarity=0.6),
    ]


def test_units_table_init(sample_columns, sample_rows):
    """Test UnitsTable initialization"""
    # Test with minimal parameters
    table = UnitsTable(columns=sample_columns, rows=sample_rows)
    assert table.columns == sample_columns
    assert table.rows == sample_rows
    assert table.similarity_scores == []
    assert table.height == 600  # Default height

    # Test with custom height
    table = UnitsTable(columns=sample_columns, rows=sample_rows, height=800)
    assert table.height == 800


def test_units_table_with_similarity_scores(
    sample_columns, sample_rows, sample_similarity_scores
):
    """Test UnitsTable with similarity scores"""
    table = UnitsTable(
        columns=sample_columns,
        rows=sample_rows,
        similarity_scores=sample_similarity_scores,
    )
    assert table.similarity_scores == sample_similarity_scores
    assert len(table.similarity_scores) == 2


def test_write_to_zarr(sample_columns, sample_rows, sample_similarity_scores):
    """Test writing UnitsTable to zarr group"""
    table = UnitsTable(
        columns=sample_columns,
        rows=sample_rows,
        similarity_scores=sample_similarity_scores,
        height=700,
    )

    store = zarr.storage.TempStore()
    root = zarr.group(store=store)
    group = root.create_group("test")

    table._write_to_zarr_group(group)

    # Check basic attributes
    assert group.attrs["view_type"] == "UnitsTable"
    assert group.attrs["height"] == 700

    # Check columns metadata
    columns_metadata = group.attrs["columns"]
    assert len(columns_metadata) == 4
    assert columns_metadata[0]["key"] == "id"
    assert columns_metadata[0]["label"] == "Unit ID"
    assert columns_metadata[0]["dtype"] == "int"

    # Check rows metadata
    rows_metadata = group.attrs["rows"]
    assert len(rows_metadata) == 3
    assert rows_metadata[0]["unitId"] == "unit1"
    assert rows_metadata[0]["values"]["quality"] == 0.95

    # Check similarity scores metadata
    similarity_scores_metadata = group.attrs["similarityScores"]
    assert len(similarity_scores_metadata) == 2
    assert similarity_scores_metadata[0]["unitId1"] == "unit1"
    assert similarity_scores_metadata[0]["unitId2"] == "unit2"
    assert similarity_scores_metadata[0]["similarity"] == 0.8


def test_column_data_types(sample_rows):
    """Test UnitsTable with different column data types"""
    columns = [
        UnitsTableColumn(key="int_col", label="Integer", dtype="int"),
        UnitsTableColumn(key="float_col", label="Float", dtype="float"),
        UnitsTableColumn(key="str_col", label="String", dtype="str"),
        UnitsTableColumn(key="bool_col", label="Boolean", dtype="bool"),
    ]

    rows = [
        UnitsTableRow(
            unit_id="test1",
            values={
                "int_col": 42,
                "float_col": 3.14,
                "str_col": "test",
                "bool_col": True,
            },
        )
    ]

    table = UnitsTable(columns=columns, rows=rows)

    store = zarr.storage.TempStore()
    root = zarr.group(store=store)
    group = root.create_group("test")

    table._write_to_zarr_group(group)

    # Verify column types were stored correctly
    columns_metadata = group.attrs["columns"]
    assert columns_metadata[0]["dtype"] == "int"
    assert columns_metadata[1]["dtype"] == "float"
    assert columns_metadata[2]["dtype"] == "str"
    assert columns_metadata[3]["dtype"] == "bool"


def test_mixed_unit_id_types():
    """Test UnitsTable with mixed string and integer unit IDs"""
    columns = [UnitsTableColumn(key="val", label="Value", dtype="int")]
    rows = [
        UnitsTableRow(unit_id="str1", values={"val": 1}),
        UnitsTableRow(unit_id=2, values={"val": 2}),  # numeric ID
    ]

    table = UnitsTable(columns=columns, rows=rows)

    store = zarr.storage.TempStore()
    root = zarr.group(store=store)
    group = root.create_group("test")

    table._write_to_zarr_group(group)

    # Verify both types of IDs were stored correctly
    rows_metadata = group.attrs["rows"]
    assert rows_metadata[0]["unitId"] == "str1"
    assert rows_metadata[1]["unitId"] == 2
