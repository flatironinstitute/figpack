import React, { useEffect, useState } from "react";
import { ZarrGroup } from "@figpack/plugin-sdk";
import { DataTable } from "../components/DataTable";

const join = (path: string, name: string) => {
  if (path.endsWith("/")) {
    return path + name;
  } else {
    return path + "/" + name;
  }
};

interface ColumnInfo {
  name: string;
  dtype: string;
  simple_dtype: string;
}

const parseCSV = (csvString: string): string[][] => {
  const lines = csvString.trim().split("\n");
  const result: string[][] = [];

  for (const line of lines) {
    const row: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        row.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    row.push(current);
    result.push(row);
  }

  return result;
};

export const FPDataFrame: React.FC<{
  zarrGroup: ZarrGroup;
  width: number;
  height: number;
}> = ({ zarrGroup, width, height }) => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [csvData, setCsvData] = useState<string[][] | null>(null);
  const [columnInfo, setColumnInfo] = useState<ColumnInfo[]>([]);

  // Load DataFrame data from zarr array
  useEffect(() => {
    let mounted = true;
    const loadDataFrameData = async () => {
      if (!zarrGroup) return;
      try {
        setLoading(true);
        setError(null);

        // Check for error in attributes
        if (zarrGroup.attrs.error) {
          throw new Error(zarrGroup.attrs.error);
        }

        // Get the CSV data from the zarr array
        const data = await zarrGroup.file.getDatasetData(
          join(zarrGroup.path, "csv_data"),
          {},
        );
        if (!data || data.length === 0) {
          throw new Error("Empty CSV data");
        }

        // Convert the uint8 array back to string
        const uint8Array = new Uint8Array(data);
        const decoder = new TextDecoder("utf-8");
        const csvString = decoder.decode(uint8Array);

        // Parse CSV data
        const parsedData = parseCSV(csvString);

        // Get column info
        const columnInfoStr = zarrGroup.attrs.column_info || "[]";
        const columnInfoData: ColumnInfo[] = JSON.parse(columnInfoStr);

        if (mounted) {
          setCsvData(parsedData);
          setColumnInfo(columnInfoData);
        }
      } catch (err) {
        console.error("Failed to load DataFrame data:", err);
        if (mounted) {
          setError(
            `Failed to load DataFrame data: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadDataFrameData();
    return () => {
      mounted = false;
    };
  }, [zarrGroup]);

  const commonStyles = {
    width,
    height,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#666",
    backgroundColor: "#f5f5f5",
  };

  if (error) {
    return (
      <div style={{ ...commonStyles, padding: "20px", textAlign: "center" }}>
        <div>
          <div style={{ marginBottom: "10px", fontWeight: "bold" }}>
            DataFrame Error
          </div>
          <div style={{ fontSize: "14px" }}>{error}</div>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div style={commonStyles}>Loading DataFrame...</div>;
  }

  if (!csvData || csvData.length === 0) {
    return <div style={commonStyles}>No DataFrame data available</div>;
  }

  return (
    <DataTable
      data={csvData}
      columnInfo={columnInfo}
      width={width}
      height={height}
    />
  );
};
