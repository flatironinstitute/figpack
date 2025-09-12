import { SortingCuration } from "./SortingCurationContext";

export interface AddUnitLabelCurationAction {
  type: "ADD_UNIT_LABEL";
  unitId: number | string | (number | string)[];
  label: string;
}

export interface ToggleUnitLabelCurationAction {
  type: "TOGGLE_UNIT_LABEL";
  unitId: number | string | (number | string)[];
  label: string;
}

export interface RemoveUnitLabelCurationAction {
  type: "REMOVE_UNIT_LABEL";
  unitId: number | string | (number | string)[];
  label: string;
}

export interface MergeUnitsCurationAction {
  type: "MERGE_UNITS";
  unitIds: (number | string)[];
}

export interface UnmergeUnitsCurationAction {
  type: "UNMERGE_UNITS";
  unitIds: (number | string)[];
}

export interface SetCurationCurationAction {
  type: "SET_CURATION";
  curation: SortingCuration;
}

export interface CloseCurationCurationAction {
  type: "CLOSE_CURATION";
}

export interface ReopenCurationCurationAction {
  type: "REOPEN_CURATION";
}

export interface SetLabelChoicesAction {
  type: "SET_LABEL_CHOICES";
  labelChoices: string[];
}

type SortingCurationAction =
  | AddUnitLabelCurationAction
  | ToggleUnitLabelCurationAction
  | RemoveUnitLabelCurationAction
  | MergeUnitsCurationAction
  | UnmergeUnitsCurationAction
  | SetCurationCurationAction
  | CloseCurationCurationAction
  | ReopenCurationCurationAction
  | SetLabelChoicesAction;

export default SortingCurationAction;
