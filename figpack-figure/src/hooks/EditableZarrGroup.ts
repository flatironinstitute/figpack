/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Canceler,
  DatasetDataType,
  ZarrDataset,
  ZarrGroup,
  ZarrSubgroup,
} from "../figpack-interface";

type ZarrEditsState = {
  editedFiles: { [file: string]: string | ArrayBuffer | null };
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
    }
  | {
      type: "clearEdits";
    };

export const zarrEditsReducer = (
  state: ZarrEditsState,
  action: ZarrEditsAction,
): ZarrEditsState => {
  switch (action.type) {
    case "setAttrs": {
      return {
        ...state,
        editedFiles: {
          ...state.editedFiles,
          [action.path + "/.zattrs"]: JSON.stringify(action.attrs, null, 2),
        },
      };
    }
    case "removeDataset": {
      return {
        ...state,
        editedFiles: {
          ...state.editedFiles,
          [action.path + "/.zarray"]: null,
          [action.path + "/.zattrs"]: null,
        },
      };
    }
    case "removeGroup": {
      return {
        ...state,
        editedFiles: {
          ...state.editedFiles,
          [action.path + "/.zgroup"]: null,
          [action.path + "/.zattrs"]: null,
        },
      };
    }
    case "createGroup": {
      return {
        ...state,
        editedFiles: {
          ...state.editedFiles,
          [action.path + "/.zgroup"]: JSON.stringify(
            {
              zarr_format: 2,
            },
            null,
            2,
          ),
          [action.path + "/.zattrs"]: JSON.stringify(action.attrs, null, 2),
        },
      };
    }
    case "createDataset": {
      const numDims = action.options.shape.length;
      const chunkFname = new Array(numDims).fill(0).join(".");
      return {
        ...state,
        editedFiles: {
          ...state.editedFiles,
          [action.path + "/.zarray"]: JSON.stringify(
            {
              zarr_format: 2,
              shape: action.options.shape,
              chunks: action.options.shape, // single chunk
              dtype: action.options.dtype,
              compressor: null,
              fill_value: null,
              order: "C",
              filters: null,
            },
            null,
            2,
          ),
          [action.path + "/.zattrs"]: JSON.stringify(
            action.options.attrs,
            null,
            2,
          ),
          [action.path + `/${chunkFname}`]: action.data, // this will actually be a typed array
        },
      };
    }
    case "clearEdits": {
      return {
        ...state,
        editedFiles: {},
      };
    }
    default:
      return state;
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
      .filter((sg) => {
        // remove those groups that have been removed
        if (this.edits.editedFiles[sg.path + "/.zgroup"] === null) {
          return false;
        }
        return true;
      })
      .map((sg) => {
        if (this.edits.editedFiles[sg.path + "/.zattrs"]) {
          return {
            ...sg,
            attrs: JSON.parse(
              this.edits.editedFiles[sg.path + "/.zattrs"] as string,
            ),
          };
        }
        return sg;
      });

    // Find created groups that are direct children of this path
    const createdSubgroups: ZarrSubgroup[] = [];
    for (const filePath in this.edits.editedFiles) {
      if (filePath.endsWith("/.zgroup")) {
        const groupPath = filePath.slice(0, -"/.zgroup".length);
        if (isDirectChild(this.path, groupPath)) {
          const name = getChildName(this.path, groupPath);
          const attrsFile = groupPath + "/.zattrs";
          let attrs = {};
          if (attrsFile in this.edits.editedFiles) {
            attrs = JSON.parse(this.edits.editedFiles[attrsFile] as string);
          }
          createdSubgroups.push({
            name,
            path: groupPath,
            attrs,
          });
        }
      }
    }

    // created subgroups replace any base subgroups with the same name
    const createdNames = new Set(createdSubgroups.map((sg) => sg.name));
    const filteredBaseSubgroups = baseSubgroups.filter(
      (sg) => !createdNames.has(sg.name),
    );

    return [...filteredBaseSubgroups, ...createdSubgroups];
  }

  async getGroup(name: string): Promise<ZarrGroup | undefined> {
    const groupPath = this.path === "/" ? `/${name}` : `${this.path}/${name}`;

    // check if this is a deleted group
    if (this.edits.editedFiles[groupPath + "/.zgroup"] === null) {
      return undefined;
    }

    if (groupPath + "/.zgroup" in this.edits.editedFiles) {
      // Create a virtual group for the created group
      const virtualGroup: ZarrGroup = {
        file: this.file,
        path: groupPath,
        subgroups: [],
        datasets: [],
        attrs:
          JSON.parse(
            this.edits.editedFiles[groupPath + "/.zattrs"] as string,
          ) || {},
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

    return new EditableZarrGroup(group, this.edits, this.dispatch);
  }

  async getDataset(name: string) {
    const datasetPath = this.path === "/" ? `/${name}` : `${this.path}/${name}`;

    // check if this is a deleted dataset
    if (this.edits.editedFiles[datasetPath + "/.zarray"] === null) {
      return undefined;
    }

    const zarrayText = this.edits.editedFiles[datasetPath + "/.zarray"];
    if (zarrayText) {
      const created = JSON.parse(zarrayText as string);
      const datasetAttrs =
        JSON.parse(
          this.edits.editedFiles[datasetPath + "/.zattrs"] as string,
        ) || {};
      return {
        name,
        path: datasetPath,
        shape: created.shape,
        dtype: created.dtype,
        attrs: datasetAttrs,
      } as ZarrDataset;
    }

    const dataset = await this.base.getDataset(name);
    if (!dataset) return dataset;

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

    // check if this is a deleted dataset
    if (this.edits.editedFiles[datasetPath + "/.zarray"] === null) {
      return undefined;
    }

    const zarrayText = this.edits.editedFiles[datasetPath + "/.zarray"];
    if (zarrayText) {
      if (o.slice) {
        throw new Error("Slicing not supported for created datasets");
      }
      const zarray = JSON.parse(zarrayText as string);
      const shape = zarray.shape;
      // we assume only one chunk for created datasets
      const numDims = shape.length;
      const chunkFileName = new Array(numDims).fill(0).join(".");
      const chunkData =
        this.edits.editedFiles[datasetPath + "/" + chunkFileName];
      if (!chunkData) {
        throw new Error("No data found for created dataset");
      }
      return chunkData as DatasetDataType; // this will actually be a typed array
    }
    // otherwise, get from base
    return await this.base.getDatasetData(name, o);
  }

  get datasets() {
    // Start with base datasets, filtered and with attribute overrides
    const baseDatasets = this.base.datasets
      .filter((ds) => {
        // remove those datasets that have been removed
        if (this.edits.editedFiles[ds.path + "/.zarray"] === null) {
          return false;
        }
        return true;
      })
      .map((ds) => {
        if (this.edits.editedFiles[ds.path + "/.zattrs"]) {
          return {
            ...ds,
            attrs: JSON.parse(
              this.edits.editedFiles[ds.path + "/.zattrs"] as string,
            ),
          };
        }
        return ds;
      });

    // Find created datasets that are direct children of this path
    const createdDatasets: ZarrDataset[] = [];
    for (const filePath in this.edits.editedFiles) {
      if (filePath.endsWith("/.zarray")) {
        const datasetPath = filePath.slice(0, -"/.zarray".length);
        if (isDirectChild(this.path, datasetPath)) {
          const name = getChildName(this.path, datasetPath);
          const zarray = JSON.parse(this.edits.editedFiles[filePath] as string);
          const attrsFile = datasetPath + "/.zattrs";
          let attrs = {};
          if (attrsFile in this.edits.editedFiles) {
            attrs = JSON.parse(this.edits.editedFiles[attrsFile] as string);
          }
          createdDatasets.push({
            file: this.file,
            name,
            path: datasetPath,
            shape: zarray.shape,
            dtype: zarray.dtype,
            attrs,
            getData: async (o) => {
              return this.getDatasetData(name, o);
            },
          });
        }
      }
    }
    // created datasets replace any base datasets with the same name
    const createdNames = new Set(createdDatasets.map((ds) => ds.name));
    const filteredBaseDatasets = baseDatasets.filter(
      (ds) => !createdNames.has(ds.name),
    );

    return [...filteredBaseDatasets, ...createdDatasets];
  }

  get attrs() {
    if (this.edits.editedFiles[this.path + "/.zattrs"]) {
      return JSON.parse(
        this.edits.editedFiles[this.path + "/.zattrs"] as string,
      );
    }
    return this.base.attrs;
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
    let dtype = o.dtype;
    if (dtype === "uint8") {
      dtype = "|u1";
    } else if (dtype === "int8") {
      dtype = "|i1";
    } else if (dtype === "uint16") {
      dtype = "|u2";
    } else if (dtype === "int16") {
      dtype = "|i2";
    } else if (dtype === "uint32") {
      dtype = "|u4";
    } else if (dtype === "int32") {
      dtype = "|i4";
    } else if (dtype === "uint64") {
      dtype = "|u8";
    } else if (dtype === "int64") {
      dtype = "|i8";
    } else if (dtype === "float32") {
      dtype = "|f4";
    } else if (dtype === "float64") {
      dtype = "|f8";
    }
    if (
      ![
        "|u1",
        "|i1",
        "|u2",
        "|i2",
        "|u4",
        "|i4",
        "|u8",
        "|i8",
        "|f4",
        "|f8",
        "<f4",
        "<f8",
        "<i1",
        "<i2",
        "<i4",
        "<i8",
        "<u1",
        "<u2",
        "<u4",
        "<u8",
      ].includes(dtype)
    ) {
      throw new Error(`Unsupported dtype: ${dtype}`);
    }
    this.dispatch({
      type: "createDataset",
      path: datasetPath,
      data,
      options: {
        ...o,
        dtype,
      },
    });
  }

  get hasEdits() {
    return Object.keys(this.edits.editedFiles).length > 0;
  }

  get fileEdits() {
    return this.edits.editedFiles;
  }
}

function isDirectChild(parentPath: string, childPath: string) {
  if (parentPath === "/") {
    parentPath = "";
  }
  if (!childPath.startsWith(parentPath + "/")) {
    return false;
  }
  const rest = childPath.slice(parentPath.length + 1);
  return !rest.includes("/");
}

function getChildName(parentPath: string, childPath: string) {
  if (parentPath === "/") {
    parentPath = "";
  }
  if (!childPath.startsWith(parentPath + "/")) {
    throw new Error("Not a child path");
  }
  const rest = childPath.slice(parentPath.length + 1);
  const parts = rest.split("/");
  return parts[0];
}

export const emptyZarrEdits: ZarrEditsState = {
  editedFiles: {},
};

export default EditableZarrGroup;
