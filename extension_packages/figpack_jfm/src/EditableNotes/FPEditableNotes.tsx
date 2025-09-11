import React, { FunctionComponent, useEffect, useRef } from "react";
import { ZarrGroup } from "../figpack-interface";

type Props = {
  zarrGroup: ZarrGroup;
  width: number;
  height: number;
};

const FPEditableNotes: React.FC<Props> = ({ zarrGroup }) => {
  const client = useEditableNotesClient(zarrGroup);
  if (!client) {
    return <div>Loading...</div>;
  }
  return (
    <TextEditView
      text={client.text}
      onSave={(newText) => {
        client.setText(newText);
      }}
    />
  );
};

const TextEditView: FunctionComponent<{
  text: string;
  onSave: (newText: string) => void;
}> = ({ text, onSave }) => {
  const [internalText, setInternalText] = React.useState(text);
  const internalTextRef = useRef(internalText);
  useEffect(() => {
    internalTextRef.current = internalText;
  }, [internalText]);
  useEffect(() => {
    setInternalText(text);
  }, [text]);
  // save every 3 seconds if changed
  useEffect(() => {
    const interval = setInterval(() => {
      if (internalTextRef.current !== text) {
        onSave(internalTextRef.current);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [text, onSave]);
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <textarea
        style={{ flexGrow: 1, width: "100%", boxSizing: "border-box" }}
        value={internalText}
        onChange={(e) => setInternalText(e.target.value)}
      />
    </div>
  );
};

const useEditableNotesClient = (zarrGroup: ZarrGroup) => {
  const [client, setClient] = React.useState<any>(null);

  useEffect(() => {
    const load = async () => {
      const c = await EditableNotesClient.create(zarrGroup);
      setClient(c);
    };
    load();
  }, [zarrGroup]);

  return client;
};

class EditableNotesClient {
  constructor(private zarrGroup: ZarrGroup, public text: string) {}
  static async create(zarrGroup: ZarrGroup) {
    let text = "";
    try {
      const ds = await zarrGroup.getDataset("text");
      if (!ds) throw new Error("No text dataset found");
      const data = await zarrGroup.getDatasetData("text", {});
      if (data && data.length > 0) {
        text = new TextDecoder().decode(data);
      }
    } catch (err) {
      console.warn("Error loading text dataset:", err);
    }
    return new EditableNotesClient(zarrGroup, text);
  }
  setText(newText: string) {
    if (!this.zarrGroup.createDataset) {
      throw new Error("Zarr group is not editable");
    }
    const data = new TextEncoder().encode(newText);
    this.zarrGroup.createDataset("text", data, {
      shape: [data.length],
      dtype: "uint8",
      attrs: {},
    });
  }
}

export default FPEditableNotes;
