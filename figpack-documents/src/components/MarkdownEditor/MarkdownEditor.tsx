/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  useCallback,
  useEffect,
  useState,
  type FunctionComponent
} from "react";

import type { editor } from "monaco-editor";


import { Editor } from "@monaco-editor/react";

type Props = {
  text: string;
  onTextChange: (newText: string) => void;
};

const MarkdownEditor: FunctionComponent<Props> = ({
  text,
  onTextChange,
}) => {
  const handleChange = useCallback(
    (value: string | undefined) => {
      onTextChange(value || "");
    },
    [onTextChange],
  );

  //////////////////////////////////////////////////
  // Seems that it is important to set the initial value of the editor
  // this way rather than using defaultValue. The defaultValue approach
  // worked okay until I navigated away and then back to the editors
  // and then everything was blank, and I couldn't figure out what
  // was causing this. But I think this method is more flexible anyway
  // as it gives us access to the editor instance.
  const [editorInstance, setEditor] = useState<
    editor.IStandaloneCodeEditor | undefined
  >(undefined);

  useEffect(() => {
    if (!editorInstance) return;
    if (text === undefined) return;
    if (editorInstance.getValue() === text) return;
    editorInstance.setValue(text);
  }, [text, editorInstance]);

  return (
    <Editor
      height="100%"
      defaultLanguage="markdown"
      value={text}
      onChange={handleChange}
      onMount={(editor, _) => setEditor(editor)}
      options={{
        minimap: { enabled: false },
        wordWrap: "on",
        wrappingIndent: "indent",
        fontSize: 14,
        lineHeight: 22,
        padding: { top: 10, bottom: 10 },
      }}
    />
  );
};

export default MarkdownEditor;
