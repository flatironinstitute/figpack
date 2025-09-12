/* eslint-disable @typescript-eslint/no-explicit-any */
import { FunctionComponent, useCallback, useMemo, useState } from "react";
import {
  allUnitSelectionState,
  SortingRule
} from "../context-unit-selection";
import "./SortableTableWidget.css";
import {
  SortableTableProps,
  SortableTableWidgetColumn,
  SortableTableWidgetRow
} from "./SortableTableWidgetTypes";

const SortableTableWidget: FunctionComponent<SortableTableProps> = (props) => {
  const {
    selectedUnitIds,
    currentUnitId,
    selectionDispatch,
    rows,
    columns,
    orderedUnitIds,
    visibleUnitIds,
    primarySortRule,
    height,
    selectionDisabled,
    hideSelectionColumn,
  } = props;

  const [sortRule, setSortRule] = useState<SortingRule | undefined>(primarySortRule);

  const _visibleUnitIds = useMemo(() => {
    return visibleUnitIds && visibleUnitIds.length > 0
      ? visibleUnitIds
      : orderedUnitIds;
  }, [visibleUnitIds, orderedUnitIds]);

  const allUnitSelectionStatus = useMemo(
    () =>
      allUnitSelectionState({
        selectedUnitIds,
        orderedUnitIds,
        visibleUnitIds: _visibleUnitIds,
      }),
    [selectedUnitIds, orderedUnitIds, _visibleUnitIds],
  );

  const handleHeaderClick = useCallback((columnName: string, column: SortableTableWidgetColumn) => {
    const newSortAscending = sortRule?.columnName === columnName ? !sortRule?.sortAscending : true;
    const newSortRule: SortingRule = {
      columnName,
      sortAscending: newSortAscending,
    };
    setSortRule(newSortRule);
    
    if (selectionDispatch) {
      selectionDispatch({
        type: "UPDATE_SORT_FIELDS",
        newSortField: columnName,
        ascending: newSortAscending,
      });
    }
  }, [sortRule, selectionDispatch]);

  const handleSelectAll = useCallback(() => {
    if (selectionDispatch) {
      if (allUnitSelectionStatus === "all") {
        selectionDispatch({ type: "DESELECT_ALL" });
      } else {
        selectionDispatch({ type: "TOGGLE_SELECT_ALL" });
      }
    }
  }, [allUnitSelectionStatus, selectionDispatch]);

  const sortedVisibleRows = useMemo(() => {
    const visibleRows = _visibleUnitIds
      .map((id) => rows.get(id))
      .filter((r) => r !== undefined) as SortableTableWidgetRow[];

    if (!sortRule) return visibleRows;

    const column = columns.find(c => c.columnName === sortRule.columnName);
    if (!column) return visibleRows;

    return [...visibleRows].sort((a, b) => {
      const aValue = a.data[sortRule.columnName]?.sortValue;
      const bValue = b.data[sortRule.columnName]?.sortValue;
      const result = column.sort(aValue, bValue);
      return sortRule.sortAscending ? result : -result;
    });
  }, [_visibleUnitIds, rows, sortRule, columns]);

  const getSortIndicator = (columnName: string) => {
    if (sortRule?.columnName !== columnName) return "";
    return sortRule.sortAscending ? "↑" : "↓";
  };

  return (
    <div 
      className="compact-table-container" 
      style={{ height: height ? `${height}px` : "100%", overflow: "auto" }}
    >
      <table className="compact-table">
        <thead>
          <tr>
            {!hideSelectionColumn && (
              <th className="compact-table-header">
                <input
                  type="checkbox"
                  checked={allUnitSelectionStatus === "all"}
                  ref={(input) => {
                    if (input) input.indeterminate = allUnitSelectionStatus === "partial";
                  }}
                  onChange={handleSelectAll}
                  disabled={selectionDisabled}
                />
              </th>
            )}
            {columns.map((column) => (
              <th
                key={column.columnName}
                className="compact-table-header"
                onClick={() => handleHeaderClick(column.columnName, column)}
                title={column.tooltip}
                style={{ cursor: "pointer" }}
              >
                {column.label}
                <span className="sort-indicator">{getSortIndicator(column.columnName)}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedVisibleRows.map((row) => (
            <tr
              key={row.rowId}
              className={`compact-table-row ${
                selectedUnitIds.has(row.rowId) ? "selected" : ""
              } ${currentUnitId === row.rowId ? "current" : ""}`}
            >
              {!hideSelectionColumn && (
                <td className="compact-table-cell">
                  <input
                    type="checkbox"
                    checked={selectedUnitIds.has(row.rowId)}
                    onChange={(e) => {
                      if (row.checkboxFn) {
                        row.checkboxFn(e as any);
                      }
                    }}
                    disabled={selectionDisabled}
                  />
                </td>
              )}
              {columns.map((column) => (
                <td key={column.columnName} className="compact-table-cell">
                  {column.dataElement(row.data[column.columnName]?.value)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SortableTableWidget;
