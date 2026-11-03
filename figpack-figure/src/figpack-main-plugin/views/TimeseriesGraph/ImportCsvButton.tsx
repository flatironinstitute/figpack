import React, { useRef } from "react";
import ToolbarButton from "./ToolbarButton";

// Button that opens a file chooser and passes the chosen file's text on
const ImportCsvButton: React.FC<{
  onFile: (text: string, fileName: string) => void;
}> = ({ onFile }) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  return (
    <>
      <ToolbarButton
        onClick={() => inputRef.current?.click()}
        title="Replace all annotations with those in a CSV file (label,start_time,end_time)"
      >
        Import CSV
      </ToolbarButton>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          // reset so choosing the same file again still triggers a change
          e.target.value = "";
          if (!file) return;
          file.text().then((text) => onFile(text, file.name));
        }}
      />
    </>
  );
};

export default ImportCsvButton;
