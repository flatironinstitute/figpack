import React, { useState, useMemo, useRef } from "react";

interface ColumnInfo {
  name: string;
  dtype: string;
  simple_dtype: string;
}

interface SortConfig {
  column: string;
  direction: "asc" | "desc";
}

interface DataTableProps {
  data: string[][];
  columnInfo: ColumnInfo[];
  width: number;
  height: number;
}

const sortData = (
  data: string[][],
  sortConfig: SortConfig,
  columnInfo: ColumnInfo[]
): string[][] => {
  if (!sortConfig.column) return data;

  const columnIndex = columnInfo.findIndex(
    (col) => col.name === sortConfig.column
  );
  if (columnIndex === -1) return data;

  const column = columnInfo[columnIndex];

  return [...data].sort((a, b) => {
    let aVal = a[columnIndex];
    let bVal = b[columnIndex];

    // Handle empty values
    if (!aVal && !bVal) return 0;
    if (!aVal) return sortConfig.direction === "asc" ? 1 : -1;
    if (!bVal) return sortConfig.direction === "asc" ? -1 : 1;

    // Type-aware sorting
    if (column.simple_dtype === "integer" || column.simple_dtype === "float") {
      const numA = parseFloat(aVal);
      const numB = parseFloat(bVal);
      if (!isNaN(numA) && !isNaN(numB)) {
        return sortConfig.direction === "asc" ? numA - numB : numB - numA;
      }
    } else if (column.simple_dtype === "datetime") {
      const dateA = new Date(aVal);
      const dateB = new Date(bVal);
      if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
        return sortConfig.direction === "asc"
          ? dateA.getTime() - dateB.getTime()
          : dateB.getTime() - dateA.getTime();
      }
    }

    // String sorting (default)
    return sortConfig.direction === "asc"
      ? aVal.localeCompare(bVal)
      : bVal.localeCompare(aVal);
  });
};

export const DataTable: React.FC<DataTableProps> = ({
  data,
  columnInfo,
  width,
  height,
}) => {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    column: "",
    direction: "asc",
  });
  const tableRef = useRef<HTMLDivElement>(null);

  const sortedData = useMemo(() => {
    // Skip the first row if it contains headers (when data length > 0 and first row matches column names)
    const dataToSort =
      data.length > 0 &&
      data[0].length === columnInfo.length &&
      data[0].every((cell, index) => cell === columnInfo[index]?.name)
        ? data.slice(1)
        : data;

    return sortData(dataToSort, sortConfig, columnInfo);
  }, [data, sortConfig, columnInfo]);

  const handleSort = (columnName: string) => {
    setSortConfig((prevConfig) => ({
      column: columnName,
      direction:
        prevConfig.column === columnName && prevConfig.direction === "asc"
          ? "desc"
          : "asc",
    }));
  };

  const getSortIcon = (columnName: string) => {
    if (sortConfig.column !== columnName) {
      return "↕️";
    }
    return sortConfig.direction === "asc" ? "↑" : "↓";
  };

  const getColumnWidth = (columnIndex: number) => {
    // Calculate natural width based on content
    const headerLength = columnInfo[columnIndex]?.name.length || 0;
    const maxContentLength = Math.max(
      headerLength,
      ...sortedData.slice(0, 100).map((row) => (row[columnIndex] || "").length)
    );
    return Math.max(80, Math.min(200, maxContentLength * 8 + 20));
  };

  return (
    <div
      style={{
        width,
        height,
        overflow: "hidden",
        border: "1px solid #ddd",
        borderRadius: "4px",
        backgroundColor: "#fff",
        fontFamily: "monospace",
        fontSize: "12px",
      }}
    >
      <div
        ref={tableRef}
        style={{
          width: "100%",
          height: "100%",
          overflow: "auto",
        }}
      >
        <table
          style={{
            borderCollapse: "collapse",
            minWidth: "100%",
            width: "max-content",
          }}
        >
          <thead>
            <tr
              style={{
                backgroundColor: "#f8f9fa",
                position: "sticky",
                top: 0,
                zIndex: 1,
              }}
            >
              {columnInfo.map((column, index) => (
                <th
                  key={column.name}
                  onClick={() => handleSort(column.name)}
                  style={{
                    padding: "6px 8px",
                    textAlign: "left",
                    borderBottom: "2px solid #dee2e6",
                    borderRight:
                      index < columnInfo.length - 1
                        ? "1px solid #dee2e6"
                        : "none",
                    cursor: "pointer",
                    userSelect: "none",
                    backgroundColor: "#f8f9fa",
                    fontWeight: "600",
                    fontSize: "11px",
                    color: "#495057",
                    width: getColumnWidth(index),
                    minWidth: getColumnWidth(index),
                    maxWidth: getColumnWidth(index),
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    position: "relative",
                  }}
                  title={`${column.name} (${column.dtype})`}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span
                      style={{ overflow: "hidden", textOverflow: "ellipsis" }}
                    >
                      {column.name}
                    </span>
                    <span
                      style={{
                        marginLeft: "4px",
                        fontSize: "10px",
                        opacity: 0.7,
                      }}
                    >
                      {getSortIcon(column.name)}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                style={{
                  backgroundColor: rowIndex % 2 === 0 ? "#fff" : "#f8f9fa",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#e3f2fd";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    rowIndex % 2 === 0 ? "#fff" : "#f8f9fa";
                }}
              >
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    style={{
                      padding: "4px 8px",
                      borderBottom: "1px solid #dee2e6",
                      borderRight:
                        cellIndex < row.length - 1
                          ? "1px solid #dee2e6"
                          : "none",
                      fontSize: "11px",
                      color: "#212529",
                      width: getColumnWidth(cellIndex),
                      minWidth: getColumnWidth(cellIndex),
                      maxWidth: getColumnWidth(cellIndex),
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                    title={cell || ""}
                  >
                    {cell || ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
