/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Canceler,
  DatasetDataType,
  ZarrDataset,
  ZarrGroup,
  ZarrSubgroup,
} from "../figpack-interface";

type ZarrEditsState = {
  attrs: { [path: string]: { [key: string]: any } };
  removedDatasets: { [path: string]: true };
  removedGroups: { [path: string]: true };
  createdGroups: { [path: string]: { [key: string]: any } };
  createdDatasets: {
    [path: string]: {
      data: DatasetDataType;
      options: {
        shape: number[];
        dtype: string;
        attrs: { [key: string]: any };
      };
    };
  };
};

type ZarrEditsAction =
  | {
      type: "setAttrs";
      path: string;
      attrs: { [key: string]: any };
    }
  | {
      type: "removeDataset";
      path: string;
    }
  | {
      type: "removeGroup";
      path: string;
    }
  | {
      type: "createGroup";
      path: string;
      attrs: { [key: string]: any };
    }
  | {
      type: "createDataset";
      path: string;
      data: DatasetDataType;
      options: {
        shape: number[];
        dtype: string;
        attrs: { [key: string]: any };
      };
    };

export const zarrEditsReducer = (
  state: ZarrEditsState,
  action: ZarrEditsAction,
): ZarrEditsState => {
  switch (action.type) {
    case "setAttrs": {
      const newState = { ...state };
      newState.attrs = { ...newState.attrs, [action.path]: action.attrs };
      if (action.path in newState.createdGroups) {
        newState.createdGroups = {
          ...newState.createdGroups,
          [action.path]: action.attrs,
        };
      }
      return newState;
    }
    case "removeDataset": {
      const newState = { ...state };
      // check if this dataset was created in this session
      if (action.path in state.createdDatasets) {
        newState.createdDatasets = { ...newState.createdDatasets };
        delete newState.createdDatasets[action.path];
      }
      newState.removedDatasets = {
        ...newState.removedDatasets,
        [action.path]: true,
      };
      return newState;
    }
    case "removeGroup": {
      const newState = { ...state };

      // If this group exists in createdGroups, just remove it from there
      if (action.path in state.createdGroups) {
        newState.createdGroups = { ...newState.createdGroups };
        delete newState.createdGroups[action.path];
      } else {
        // Only add to removedGroups if it's not a created group (i.e., it exists in base)
        newState.removedGroups = {
          ...newState.removedGroups,
          [action.path]: true,
        };
      }

      // Clean up attrs regardless
      newState.attrs = { ...newState.attrs };
      if (action.path in newState.attrs) {
        delete newState.attrs[action.path];
      }

      return newState;
    }
    case "createGroup": {
      if (action.path in state.removedGroups) {
        throw new Error(
          "Cannot create a group at a path that has been removed, because this would be potentially dangerous if child datasets/groups exist in the base.",
        );
      }
      const newState = { ...state };
      newState.createdGroups = {
        ...newState.createdGroups,
        [action.path]: action.attrs,
      };
      newState.attrs = { ...newState.attrs, [action.path]: action.attrs };
      // Remove from removedGroups if it was previously removed
      if (action.path in newState.removedGroups) {
        newState.removedGroups = { ...newState.removedGroups };
        delete newState.removedGroups[action.path];
      }
      return newState;
    }
    case "createDataset": {
      // if it was removed, then un-remove it
      const newState = { ...state };
      if (action.path in newState.removedDatasets) {
        newState.removedDatasets = { ...newState.removedDatasets };
        delete newState.removedDatasets[action.path];
      }
      newState.createdDatasets = {
        ...newState.createdDatasets,
        [action.path]: { data: action.data, options: action.options },
      };
      return newState;
    }
    default:
      return state;
  }
};

export const emptyZarrEdits: ZarrEditsState = {
  attrs: {},
  removedDatasets: {},
  removedGroups: {},
  createdGroups: {},
  createdDatasets: {},
};

// Helper functions for path handling
const isDirectChild = (parentPath: string, childPath: string): boolean => {
  if (parentPath === "/") {
    // For root path, check if childPath is like "/name" (no additional slashes)
    return (
      childPath.startsWith("/") &&
      childPath.slice(1).indexOf("/") === -1 &&
      childPath !== "/"
    );
  } else {
    // For non-root paths, check if childPath starts with parentPath + "/" and has no additional slashes
    const expectedPrefix = parentPath + "/";
    if (!childPath.startsWith(expectedPrefix)) return false;
    const remainder = childPath.slice(expectedPrefix.length);
    return remainder.indexOf("/") === -1 && remainder.length > 0;
  }
};

const getChildName = (parentPath: string, childPath: string): string => {
  if (parentPath === "/") {
    return childPath.slice(1); // Remove leading "/"
  } else {
    return childPath.slice(parentPath.length + 1); // Remove parent path and "/"
  }
};

class EditableZarrGroup implements ZarrGroup {
  constructor(
    private base: ZarrGroup,
    private edits: ZarrEditsState,
    private dispatch: React.Dispatch<ZarrEditsAction>,
  ) {}

  get path() {
    return this.base.path;
  }

  get file() {
    return this.base.file;
  }

  get subgroups(): ZarrSubgroup[] {
    // Start with base subgroups, filtered and with attribute overrides
    const baseSubgroups = this.base.subgroups
      .filter((sg) => !(sg.path in this.edits.removedGroups))
      .map((sg) =>
        sg.path in this.edits.attrs
          ? {
              ...sg,
              attrs: this.edits.attrs[sg.path],
            }
          : sg,
      );

    // Find created groups that are direct children of this path
    const createdSubgroups: ZarrSubgroup[] = [];
    for (const [createdPath, createdAttrs] of Object.entries(
      this.edits.createdGroups,
    )) {
      if (
        isDirectChild(this.path, createdPath) &&
        !(createdPath in this.edits.removedGroups)
      ) {
        const name = getChildName(this.path, createdPath);
        createdSubgroups.push({
          name,
          path: createdPath,
          attrs: createdAttrs,
        });
      }
    }

    // Combine and deduplicate (created groups override base groups with same name)
    const allSubgroups = [...baseSubgroups];
    for (const createdSg of createdSubgroups) {
      const existingIndex = allSubgroups.findIndex(
        (sg) => sg.name === createdSg.name,
      );
      if (existingIndex >= 0) {
        allSubgroups[existingIndex] = createdSg;
      } else {
        allSubgroups.push(createdSg);
      }
    }

    return allSubgroups;
  }

  async getGroup(name: string): Promise<ZarrGroup | undefined> {
    const groupPath = this.path === "/" ? `/${name}` : `${this.path}/${name}`;

    // Check if this is a created group
    if (groupPath in this.edits.createdGroups) {
      // Check if it's been removed
      if (groupPath in this.edits.removedGroups) {
        return undefined;
      }
      // Create a virtual group for the created group
      const virtualGroup: ZarrGroup = {
        file: this.file,
        path: groupPath,
        subgroups: [],
        datasets: [],
        attrs: this.edits.createdGroups[groupPath],
        getGroup: async () => undefined,
        getDataset: async () => undefined,
        getDatasetData: async () => undefined,
        setAttrs: (attrs: { [key: string]: any }) => {
          this.dispatch({ type: "setAttrs", path: groupPath, attrs });
        },
        createGroup: (name: string, attrs: { [key: string]: any }) => {
          const childPath = `${groupPath}/${name}`;
          this.dispatch({ type: "createGroup", path: childPath, attrs });
        },
        removeGroup: (name: string) => {
          const childPath = `${groupPath}/${name}`;
          this.dispatch({ type: "removeGroup", path: childPath });
        },
        removeDataset: (name: string) => {
          const childPath = `${groupPath}/${name}`;
          this.dispatch({ type: "removeDataset", path: childPath });
        },
      };
      return new EditableZarrGroup(virtualGroup, this.edits, this.dispatch);
    }

    // Try to get from base
    const group = await this.base.getGroup(name);
    if (!group) return group;

    // Check if this group has been removed
    if (group.path in this.edits.removedGroups) {
      return undefined;
    }

    return new EditableZarrGroup(group, this.edits, this.dispatch);
  }

  async getDataset(name: string) {
    const datasetPath = this.path === "/" ? `/${name}` : `${this.path}/${name}`;
    if (datasetPath in this.edits.createdDatasets) {
      const created = this.edits.createdDatasets[datasetPath];
      return {
        name,
        path: datasetPath,
        shape: created.options.shape,
        dtype: created.options.dtype,
        attrs: created.options.attrs,
      } as ZarrDataset;
    }

    const dataset = await this.base.getDataset(name);
    if (!dataset) return dataset;

    // Check if this dataset has been removed
    if (dataset.path in this.edits.removedDatasets) {
      return undefined;
    }

    return dataset;
  }

  async getDatasetData(
    name: string,
    o: {
      slice?: [number, number][];
      allowBigInt?: boolean;
      canceler?: Canceler;
    },
  ) {
    const datasetPath = this.path === "/" ? `/${name}` : `${this.path}/${name}`;
    if (datasetPath in this.edits.createdDatasets) {
      if (o.slice) {
        throw new Error("Slicing not supported for created datasets");
      }
      const created = this.edits.createdDatasets[datasetPath];
      return created.data;
    }
    return await this.base.getDatasetData(name, o);
  }

  get datasets() {
    const ret = this.base.datasets
      .filter((ds) => !(ds.path in this.edits.removedDatasets))
      .map((ds) =>
        ds.path in this.edits.attrs
          ? {
              ...ds,
              attrs: this.edits.attrs[ds.path],
            }
          : ds,
      );
    for (const [createdPath, createdData] of Object.entries(
      this.edits.createdDatasets,
    )) {
      if (
        isDirectChild(this.path, createdPath) &&
        !(createdPath in this.edits.removedDatasets)
      ) {
        const name = getChildName(this.path, createdPath);
        ret.push({
          name,
          path: createdPath,
          shape: createdData.options.shape,
          dtype: createdData.options.dtype,
          attrs: createdData.options.attrs,
        });
      }
    }
    return ret;
  }

  get attrs() {
    if (this.path in this.edits.attrs) {
      return this.edits.attrs[this.path];
    } else {
      return this.base.attrs;
    }
  }

  setAttrs(attrs: { [key: string]: any }) {
    this.dispatch({ type: "setAttrs", path: this.path, attrs });
  }

  removeGroup(name: string) {
    const groupPath = this.path === "/" ? `/${name}` : `${this.path}/${name}`;
    this.dispatch({ type: "removeGroup", path: groupPath });
  }

  removeDataset(name: string) {
    const datasetPath = this.path === "/" ? `/${name}` : `${this.path}/${name}`;
    this.dispatch({ type: "removeDataset", path: datasetPath });
  }

  createGroup(name: string, attrs: { [key: string]: any }) {
    const groupPath = this.path === "/" ? `/${name}` : `${this.path}/${name}`;
    this.dispatch({ type: "createGroup", path: groupPath, attrs });
  }

  createDataset(
    name: string,
    data: DatasetDataType,
    o: { shape: number[]; dtype: string; attrs: { [key: string]: any } },
  ) {
    const datasetPath = this.path === "/" ? `/${name}` : `${this.path}/${name}`;
    this.dispatch({
      type: "createDataset",
      path: datasetPath,
      data,
      options: o,
    });
  }
}

export default EditableZarrGroup;
