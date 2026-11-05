import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

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
  columnInfo: ColumnInfo[],
): string[][] => {
  if (!sortConfig.column) return data;

  const columnIndex = columnInfo.findIndex(
    (col) => col.name === sortConfig.column,
  );
  if (columnIndex === -1) return data;

  const column = columnInfo[columnIndex];

  return [...data].sort((a, b) => {
    const aVal = a[columnIndex];
    const bVal = b[columnIndex];

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
      return "⇅";
    }
    return sortConfig.direction === "asc" ? "▲" : "▼";
  };

  const isNumeric = (columnIndex: number) => {
    const t = columnInfo[columnIndex]?.simple_dtype;
    return t === "integer" || t === "float";
  };

  // Show a fade at the left or right edge when the table can be scrolled
  // horizontally in that direction, since overlay scrollbars (e.g. on macOS)
  // are hidden until the user scrolls
  const [overflow, setOverflow] = useState({ left: false, right: false });
  const updateOverflow = useCallback(() => {
    const el = tableRef.current;
    if (!el) return;
    const left = el.scrollLeft > 1;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
    setOverflow((prev) =>
      prev.left === left && prev.right === right ? prev : { left, right },
    );
  }, []);
  useEffect(() => {
    updateOverflow();
  }, [updateOverflow, width, height, sortedData, columnInfo]);

  const fade = (side: "left" | "right"): React.CSSProperties => ({
    position: "absolute",
    top: 0,
    bottom: 0,
    [side]: 0,
    width: 28,
    pointerEvents: "none",
    background: `linear-gradient(to ${side}, rgba(255,255,255,0), rgba(0,0,0,0.15))`,
  });

  const cellContentStyle: React.CSSProperties = {
    maxWidth: 320,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };

  return (
    <div
      style={{
        position: "relative",
        width,
        height,
        boxSizing: "border-box",
        overflow: "hidden",
        border: "1px solid #ddd",
        borderRadius: "4px",
        backgroundColor: "#fff",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        fontSize: "12px",
      }}
    >
      <div
        ref={tableRef}
        onScroll={updateOverflow}
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
          }}
        >
          <thead>
            <tr>
              {columnInfo.map((column, index) => (
                <th
                  key={column.name}
                  onClick={() => handleSort(column.name)}
                  style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 1,
                    padding: "6px 10px",
                    textAlign: isNumeric(index) ? "right" : "left",
                    borderBottom: "2px solid #dee2e6",
                    borderRight:
                      index < columnInfo.length - 1
                        ? "1px solid #dee2e6"
                        : "none",
                    cursor: "pointer",
                    userSelect: "none",
                    backgroundColor: "#f8f9fa",
                    fontWeight: 600,
                    color: "#343a40",
                    whiteSpace: "nowrap",
                  }}
                  title={`${column.name} (${column.dtype}); click to sort`}
                >
                  <span
                    style={{
                      ...cellContentStyle,
                      display: "inline-block",
                      verticalAlign: "bottom",
                    }}
                  >
                    {column.name}
                  </span>
                  <span
                    style={{
                      marginLeft: 6,
                      fontSize: "10px",
                      color:
                        sortConfig.column === column.name
                          ? "#1976d2"
                          : "#adb5bd",
                    }}
                  >
                    {getSortIcon(column.name)}
                  </span>
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
                      padding: "4px 10px",
                      borderBottom: "1px solid #dee2e6",
                      borderRight:
                        cellIndex < row.length - 1
                          ? "1px solid #dee2e6"
                          : "none",
                      color: "#212529",
                      textAlign: isNumeric(cellIndex) ? "right" : "left",
                      fontVariantNumeric: "tabular-nums",
                    }}
                    title={cell || ""}
                  >
                    <div style={cellContentStyle}>{cell || ""}</div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {overflow.left && <div style={fade("left")} />}
      {overflow.right && <div style={fade("right")} />}
    </div>
  );
};
