import { newAnnotationId } from "./annotationStorage";
import { TimeAnnotation } from "./types";

// CSV format: label,start_time,end_time with one row per annotation; label is
// empty when unlabeled and end_time is empty for a time point

const csvField = (s: string) =>
  /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;

export const downloadAnnotationsCsv = (annotations: TimeAnnotation[]) => {
  const lines = ["label,start_time,end_time"];
  for (const a of annotations) {
    lines.push(`${csvField(a.label ?? "")},${a.tStart},${a.tEnd ?? ""}`);
  }
  const blob = new Blob([lines.join("\n") + "\n"], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "annotations.csv";
  link.click();
  URL.revokeObjectURL(url);
};

// Rows of fields, with quoted fields ("" for a quote inside)
const parseCsvRows = (text: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((f) => f.trim() !== ""));
};

// Throws an Error with a message for the user when the file can't be read.
// Columns are found by header name, so their order and extra columns don't
// matter; only start_time is required.
export const parseAnnotationsCsv = (text: string): TimeAnnotation[] => {
  const rows = parseCsvRows(text);
  if (rows.length === 0) throw new Error("The file is empty");
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const labelCol = header.indexOf("label");
  const startCol = header.indexOf("start_time");
  const endCol = header.indexOf("end_time");
  if (startCol < 0) {
    throw new Error(
      "No start_time column; expected a header row label,start_time,end_time",
    );
  }
  const annotations: TimeAnnotation[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const startText = (r[startCol] ?? "").trim();
    const endText = endCol >= 0 ? (r[endCol] ?? "").trim() : "";
    const tStart = Number(startText);
    if (startText === "" || !isFinite(tStart)) {
      throw new Error(
        `Row ${i + 1}: start_time "${startText}" is not a number`,
      );
    }
    let tEnd: number | undefined = undefined;
    if (endText !== "") {
      tEnd = Number(endText);
      if (!isFinite(tEnd)) {
        throw new Error(`Row ${i + 1}: end_time "${endText}" is not a number`);
      }
    }
    const label = labelCol >= 0 ? (r[labelCol] ?? "").trim() : "";
    annotations.push({
      id: newAnnotationId(),
      label: label || undefined,
      tStart: tEnd !== undefined ? Math.min(tStart, tEnd) : tStart,
      tEnd: tEnd !== undefined ? Math.max(tStart, tEnd) : undefined,
    });
  }
  return annotations.sort((a, b) => a.tStart - b.tStart);
};
