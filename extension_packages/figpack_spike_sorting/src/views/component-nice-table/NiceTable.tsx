/* eslint-disable @typescript-eslint/no-explicit-any */
import { FunctionComponent, useCallback, useMemo, useState } from "react";
import "./NiceTable.css";
import {
  Checkbox,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@mui/material";
import { FaPencilAlt, FaTimes, FaTrash } from "react-icons/fa";

export type NiceTableRow = {
  key: string;
  columnValues: { [key: string]: any };
};
export type NiceTableColumn = {
  key: string;
  label: string;
  element?: any;
};

interface Props {
  rows: NiceTableRow[];
  columns: NiceTableColumn[];
  onDeleteRow?: (key: string) => void;
  deleteRowLabel?: string;
  onEditRow?: (key: string) => void;
  editRowLabel?: string;
  selectionMode?: "none" | "single" | "multiple";
  selectedRowKeys?: string[];
  onSelectedRowKeysChanged?: (keys: string[]) => void;
  selectionDisabled?: boolean;
}

const NiceTable: FunctionComponent<Props> = ({
  rows,
  columns,
  onDeleteRow = undefined,
  deleteRowLabel = undefined,
  onEditRow = undefined,
  editRowLabel = undefined,
  selectionMode = "none", // none, single, multiple
  selectedRowKeys = [],
  onSelectedRowKeysChanged = undefined,
  selectionDisabled,
}) => {
  const selectedRowKeysObj = useMemo(() => {
    const x: { [key: string]: boolean } = {};
    selectedRowKeys.forEach((key) => {
      x[key] = true;
    });
    return x;
  }, [selectedRowKeys]);
  const [confirmDeleteRowKey, setConfirmDeleteRowKey] = useState<string | null>(
    null,
  );
  const handleClickRow = useCallback(
    (key: string) => {
      if (!onSelectedRowKeysChanged || false) return;

      if (selectionMode === "single") {
        if (!(key in selectedRowKeysObj) || !selectedRowKeysObj[key]) {
          onSelectedRowKeysChanged([key + ""]);
        } else {
          onSelectedRowKeysChanged([]);
        }
      } else if (selectionMode === "multiple") {
        // todo: write this logic. Note, we'll need to also pass in the event to get the ctrl/shift modifiers
        onSelectedRowKeysChanged(
          Object.keys(selectedRowKeysObj)
            .filter((k) => k != key && selectedRowKeysObj[k])
            .concat(selectedRowKeysObj[key] ? [] : [key.toString()]),
        );
      }
    },
    [onSelectedRowKeysChanged, selectionMode, selectedRowKeysObj],
  );
  const handleDeleteRow = useCallback((rowKey: string) => {
    setConfirmDeleteRowKey(rowKey);
  }, []);
  const handleConfirmDeleteRow = useCallback(
    (rowKey: string, confirmed: boolean) => {
      if (confirmed) {
        if (onDeleteRow) onDeleteRow(rowKey);
      }
      setConfirmDeleteRowKey(null);
    },
    [onDeleteRow],
  );
  const handleEditRow = useCallback(
    (rowKey: string) => {
      if (onEditRow) onEditRow(rowKey);
    },
    [onEditRow],
  );
  return (
    <Table className="NiceTable">
      <TableHead>
        <TableRow>
          <TableCell key="_first" style={{ width: 0 }} />
          {columns.map((col) => (
            <TableCell key={col.key}>
              {col.element ? col.element : <span>{col.label}</span>}
            </TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.key}>
            <TableCell>
              {onDeleteRow &&
                (confirmDeleteRowKey === row.key ? (
                  <ConfirmDeleteRowButton
                    title={deleteRowLabel || ""}
                    onConfirmDeleteRow={handleConfirmDeleteRow}
                    rowKey={row.key}
                  />
                ) : (
                  <DeleteRowButton
                    title={deleteRowLabel || ""}
                    onDeleteRow={handleDeleteRow}
                    rowKey={row.key}
                  />
                ))}
              {onEditRow && (
                <EditRowButton
                  title={editRowLabel || ""}
                  onEditRow={handleEditRow}
                  rowKey={row.key}
                />
              )}
              {selectionMode !== "none" && (
                <Checkbox
                  checked={selectedRowKeysObj[row.key] || false}
                  onClick={() => handleClickRow(row.key)}
                  disabled={selectionDisabled}
                />
              )}
            </TableCell>
            {columns.map((col) => (
              <TableCell key={col.key}>
                <span>{makeCell(row.columnValues[col.key])}</span>
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

const DeleteRowButton: FunctionComponent<{
  title: string;
  rowKey: string;
  onDeleteRow?: (key: string) => void;
}> = ({ title, rowKey, onDeleteRow }) => {
  const handleClick = useCallback(() => {
    if (onDeleteRow) onDeleteRow(rowKey);
  }, [onDeleteRow, rowKey]);
  return (
    <IconButton title={title} onClick={handleClick}>
      <FaTrash />
    </IconButton>
  );
};

const ConfirmDeleteRowButton: FunctionComponent<{
  title: string;
  rowKey: string;
  onConfirmDeleteRow?: (key: string, confirmed: boolean) => void;
}> = ({ title, rowKey, onConfirmDeleteRow }) => {
  const handleClick = useCallback(() => {
    if (onConfirmDeleteRow) onConfirmDeleteRow(rowKey, true);
  }, [onConfirmDeleteRow, rowKey]);
  const handleCancel = useCallback(() => {
    if (onConfirmDeleteRow) onConfirmDeleteRow(rowKey, false);
  }, [onConfirmDeleteRow, rowKey]);
  return (
    <span>
      Confirm delete?
      <IconButton title={title} onClick={handleClick}>
        <FaTrash />
      </IconButton>
      <IconButton title={"Cancel"} onClick={handleCancel}>
        <FaTimes />
      </IconButton>
    </span>
  );
};

const EditRowButton: FunctionComponent<{
  title: string;
  rowKey: string;
  onEditRow?: (key: string) => void;
}> = ({ title, rowKey, onEditRow }) => {
  return (
    <IconButton title={title} onClick={() => onEditRow && onEditRow(rowKey)}>
      <FaPencilAlt />
    </IconButton>
  );
};

const makeCell = (x: any) => {
  if (x == 0) return x; // !'0' is true, but we shouldn't null out actual 0s
  if (!x) return "";
  if (typeof x == "object") {
    if (x.element) return x.element;
    else return x.text || "";
  } else {
    return x;
  }
};

export default NiceTable;
