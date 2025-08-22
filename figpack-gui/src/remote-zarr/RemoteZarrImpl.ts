/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  DatasetDataType,
  ZarrDataset,
  ZarrGroup,
  ZarrSubdataset,
  ZarrSubgroup,
} from "@figpack/plugin-sdk";
import { ZarrFile, Canceler } from "@figpack/plugin-sdk";

const globalZarrStats = {
  getGroupCount: 0,
  getDatasetCount: 0,
  getDatasetDataCount: 0,
  numPendingRequests: 0,
};

import zarrDatasetDataLoader from "./zarrDatasetDataLoader";
import zarrDecodeChunkArray from "./zarrDecodeChunkArray";

type ZMetaDataZAttrs = { [key: string]: any };

type ZMetaDataZGroup = {
  zarr_format: number;
};

export type ZMetaDataZArray = {
  chunks?: number[];
  compressor?: any;
  dtype?: string;
  fill_value?: any;
  filters?: any[];
  order?: "C" | "F";
  shape?: number[];
  zarr_format?: 2;
};

export class ZarrFileSystemClient {
  #fileContentCache: {
    [key: string]: { content: any | undefined; found: boolean };
  } = {};
  #inProgressReads: { [key: string]: boolean } = {};
  constructor(
    private url: string,
    private zmetadata: any
  ) {}
  async readJson(path: string): Promise<{ [key: string]: any } | undefined> {
    if (path in this.zmetadata.metadata) {
      return this.zmetadata.metadata[path];
    }
    const lastPartOfPath = path.split("/").slice(-1)[0];
    if (lastPartOfPath.startsWith(".")) {
      // if it's not in the metadata, we assume it's not there
      return undefined;
    }
    const buf = await this.readBinary(path, { decodeArray: false });
    if (!buf) return undefined;
    const text = new TextDecoder().decode(buf);
    try {
      return JSON.parse(text, (_key, value) => {
        if (value === "___NaN___") return NaN;
        return value;
      });
    } catch (e) {
      console.warn(text);
      throw Error("Failed to parse JSON for " + path + ": " + e);
    }
  }
  async readBinary(
    path: string,
    o: {
      decodeArray?: boolean;
      startByte?: number;
      endByte?: number;
      disableCache?: boolean;
    }
  ): Promise<any | undefined> {
    if (o.startByte !== undefined) {
      if (o.decodeArray)
        throw Error("Cannot decode array and read a slice at the same time");
      if (o.endByte === undefined)
        throw Error("If you specify startByte, you must also specify endByte");
    } else if (o.endByte !== undefined) {
      throw Error("If you specify endByte, you must also specify startByte");
    }
    if (
      o.endByte !== undefined &&
      o.startByte !== undefined &&
      o.endByte < o.startByte
    ) {
      throw Error(
        `endByte must be greater than or equal to startByte: ${o.startByte} ${o.endByte} for ${path}`
      );
    }
    if (
      o.endByte !== undefined &&
      o.startByte !== undefined &&
      o.endByte === o.startByte
    ) {
      return new ArrayBuffer(0);
    }
    const kk =
      path +
      "|" +
      (o.decodeArray ? "decode" : "") +
      "|" +
      o.startByte +
      "|" +
      o.endByte;
    while (this.#inProgressReads[kk]) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    this.#inProgressReads[kk] = true;
    try {
      if (path.startsWith("/")) path = path.slice(1);
      if (this.#fileContentCache[kk]) {
        if (this.#fileContentCache[kk].found) {
          return this.#fileContentCache[kk].content;
        }
        return undefined;
      }
      const url = this.url + "/" + path;
      let buf: ArrayBuffer | undefined;
      if (o.startByte !== undefined && o.endByte !== undefined) {
        buf = await fetchByteRange(url, o.startByte, o.endByte - o.startByte);
      } else {
        const r = await fetch(url);
        if (!r.ok) {
          if (r.status === 404) {
            this.#fileContentCache[kk] = { content: undefined, found: false };
            return undefined; // file not found
          }
          throw Error(`Failed to fetch ${url}: ${r.statusText}`);
        }
        buf = await r.arrayBuffer();
      }
      if (o.decodeArray) {
        const parentPath = path.split("/").slice(0, -1).join("/");
        const zarray = (await this.readJson(parentPath + "/.zarray")) as
          | ZMetaDataZArray
          | undefined;
        if (!zarray) throw Error("Failed to read .zarray for " + path);
        try {
          buf = await zarrDecodeChunkArray(
            buf,
            zarray.dtype,
            zarray.compressor,
            zarray.filters,
            zarray.chunks
          );
        } catch (e) {
          throw Error(`Failed to decode chunk array for ${path}: ${e}`);
        }
      }
      if (buf) {
        this.#fileContentCache[kk] = { content: buf, found: true };
      } else {
        this.#fileContentCache[kk] = { content: undefined, found: false };
      }
      return buf;
    } catch (e) {
      this.#fileContentCache[kk] = { content: undefined, found: false }; // important to do this so we don't keep trying to read the same file
      throw e;
    } finally {
      this.#inProgressReads[kk] = false;
    }
  }
}

class RemoteZarr implements ZarrFile {
  #cacheDisabled = false; // just for benchmarking
  #sourceUrls: string[] | undefined = undefined;
  constructor(
    public url: string,
    private zarrFileSystemClient: ZarrFileSystemClient,
    private pathsByParentPath: { [key: string]: string[] }
  ) {}
  static async createFromZarr(url: string) {
    const zmetadataUrl = `${url}/.zmetadata`;
    const zmetadataResponse = await fetch(zmetadataUrl);
    if (!zmetadataResponse.ok) {
      throw new Error(`Failed to fetch Zarr metadata from ${zmetadataUrl}`);
    }
    const zmetadata = await zmetadataResponse.json();
    const zarrFileSystemClient = new ZarrFileSystemClient(url, zmetadata);
    const pathsByParentPath: { [key: string]: string[] } = {};
    for (const path in zmetadata.metadata) {
      if (path === ".zattrs" || path === ".zgroup") continue;
      const parts = path.split("/");
      if (parts.length <= 1) continue;
      const lastPart = parts[parts.length - 1];
      if (
        lastPart === ".zattrs" ||
        lastPart === ".zgroup" ||
        lastPart === ".zarray"
      ) {
        const thePath = parts.slice(0, parts.length - 1).join("/");
        const theParentPath = parts.slice(0, parts.length - 2).join("/");
        if (!pathsByParentPath[theParentPath])
          pathsByParentPath[theParentPath] = [];
        if (!pathsByParentPath[theParentPath].includes(thePath)) {
          pathsByParentPath[theParentPath].push(thePath);
        }
      }
    }
    return new RemoteZarr(url, zarrFileSystemClient, pathsByParentPath);
  }
  get dataIsRemote() {
    return !this.url.startsWith("http://localhost");
  }
  async getGroup(path: string): Promise<ZarrGroup | undefined> {
    if (path === "") path = "/";
    let group: ZarrGroup | undefined;
    const pathWithoutBeginningSlash = path.startsWith("/")
      ? path.slice(1)
      : path;
    let zgroup: ZMetaDataZGroup | undefined;
    let zattrs: ZMetaDataZAttrs | undefined;
    if (path === "/") {
      zgroup = (await this.zarrFileSystemClient.readJson(".zgroup")) as
        | ZMetaDataZGroup
        | undefined;
      zattrs = (await this.zarrFileSystemClient.readJson(".zattrs")) as
        | ZMetaDataZAttrs
        | undefined;
    } else {
      zgroup = (await this.zarrFileSystemClient.readJson(
        pathWithoutBeginningSlash + "/.zgroup"
      )) as ZMetaDataZGroup | undefined;
      zattrs = (await this.zarrFileSystemClient.readJson(
        pathWithoutBeginningSlash + "/.zattrs"
      )) as ZMetaDataZAttrs | undefined;
    }
    if (zgroup) {
      const subgroups: ZarrSubgroup[] = [];
      const subdatasets: ZarrSubdataset[] = [];
      const childPaths: string[] =
        this.pathsByParentPath[pathWithoutBeginningSlash] || [];
      for (const childPath of childPaths) {
        const childZgroup = await this.zarrFileSystemClient.readJson(
          childPath + "/.zgroup"
        );
        const childZarray = await this.zarrFileSystemClient.readJson(
          childPath + "/.zarray"
        );
        const childZattrs = await this.zarrFileSystemClient.readJson(
          childPath + "/.zattrs"
        );
        if (childZgroup) {
          subgroups.push({
            name: getNameFromPath(childPath),
            path: "/" + childPath,
            attrs: childZattrs || {},
          });
        } else if (childZarray) {
          const shape = childZarray.shape;
          const dtype = childZarray.dtype;
          if (shape && dtype) {
            subdatasets.push({
              name: getNameFromPath(childPath),
              path: "/" + childPath,
              shape,
              dtype,
              attrs: childZattrs || {},
            });
          } else {
            console.warn("Unexpected .zarray item", childPath, childZarray);
          }
        }
      }
      group = {
        file: this,
        path: path,
        subgroups,
        datasets: subdatasets,
        attrs: zattrs || {},
      };
    }
    globalZarrStats.getGroupCount++;
    return group;
  }
  async getDataset(path: string): Promise<ZarrDataset | undefined> {
    const pathWithoutBeginningSlash = path.startsWith("/")
      ? path.slice(1)
      : path;
    const zarray = (await this.zarrFileSystemClient.readJson(
      pathWithoutBeginningSlash + "/.zarray"
    )) as ZMetaDataZArray;
    const zattrs = (await this.zarrFileSystemClient.readJson(
      pathWithoutBeginningSlash + "/.zattrs"
    )) as ZMetaDataZAttrs;
    let dataset: ZarrDataset | undefined;
    if (zarray) {
      dataset = {
        file: this,
        name: getNameFromPath(path),
        path,
        shape: zarray.shape || [],
        dtype: zarray.dtype || "",
        attrs: zattrs || {},
      };
    } else {
      dataset = undefined;
    }
    globalZarrStats.getDatasetCount++;
    return dataset;
  }
  async getDatasetData(
    path: string,
    o: {
      slice?: [number, number][];
      allowBigInt?: boolean;
      canceler?: Canceler;
    }
  ): Promise<DatasetDataType | undefined> {
    // check for invalid slice
    if (o.slice) {
      for (const ss of o.slice) {
        if (isNaN(ss[0]) || isNaN(ss[1])) {
          console.warn("Invalid slice", path, o.slice);
          throw Error("Invalid slice");
        }
      }
    }
    if (o.slice && o.slice.length > 3) {
      console.warn(
        "Tried to slice more than three dimensions at a time",
        path,
        o.slice
      );
      throw Error(
        `For now, you can't slice more than three dimensions at a time. You tried to slice ${o.slice.length} dimensions for ${path}.`
      );
    }

    const pathWithoutBeginningSlash = path.startsWith("/")
      ? path.slice(1)
      : path;
    const zarray = (await this.zarrFileSystemClient.readJson(
      pathWithoutBeginningSlash + "/.zarray"
    )) as ZMetaDataZArray | undefined;
    if (!zarray) {
      console.warn("No .zarray for", path);
      return undefined;
    }

    // const { slice, allowBigInt, canceler } = o;

    globalZarrStats.getDatasetDataCount++;

    // const zattrs = (await this.zarrFileSystemClient.readJson(
    //   pathWithoutBeginningSlash + "/.zattrs",
    // )) as ZMetaDataZAttrs;

    const ret = await zarrDatasetDataLoader({
      client: this.zarrFileSystemClient,
      path: pathWithoutBeginningSlash,
      zarray,
      slice: o.slice || [],
      disableCache: this.#cacheDisabled,
    });
    if (ret.length === 1) {
      // candidate for scalar, need to check for _SCALAR attribute
      const ds = await this.getDataset(path);
      if (ds && ds.attrs["_SCALAR"]) {
        return ret[0];
      }
    }
    return ret;
  }
  get _zarrFileSystemClient() {
    return this.zarrFileSystemClient;
  }
  async getZarrZarray(path: string): Promise<ZMetaDataZArray | undefined> {
    const pathWithoutBeginningSlash = path.startsWith("/")
      ? path.slice(1)
      : path;
    return (await this.zarrFileSystemClient.readJson(
      pathWithoutBeginningSlash + "/.zarray"
    )) as ZMetaDataZArray | undefined;
  }
  getUrls() {
    return [this.url];
  }
  get sourceUrls(): string[] | undefined {
    return this.#sourceUrls;
  }
  set sourceUrls(v: string[] | undefined) {
    this.#sourceUrls = v;
  }
  _disableCache() {
    this.#cacheDisabled = true;
  }
}

const fetchByteRange = async (url: string, startByte: number, size: number) => {
  const r = await fetch(url, {
    headers: {
      Range: `bytes=${startByte}-${startByte + size - 1}`,
    },
  });
  if (!r.ok)
    throw Error(
      `Failed to fetch byte range ${startByte}-${startByte + size - 1} of ${url}`
    );
  return await r.arrayBuffer();
};

const getNameFromPath = (path: string) => {
  const parts = path.split("/");
  if (parts.length === 0) return "";
  return parts[parts.length - 1];
};

export default RemoteZarr;
