import {
  getBatchSignedUrls,
  uploadFileToSignedUrl,
} from "../EditFigureServicePage/uploadFilesApi";

// Saving a remix: upload it as remix-N.html into the figure directory and
// add it to the figure's manifest.json (patch-figure only updates pages
// listed there). Only the figure's owner can upload.

type Manifest = {
  files: { path: string; size: number }[];
  total_size?: number;
  total_files?: number;
  [key: string]: unknown;
};

const REMIX_PATH_REGEX = /^remix-(\d+)\.html$/;

export const isRemixPath = (path: string) => REMIX_PATH_REGEX.test(path);

const fetchManifest = async (figureDirUrl: string): Promise<Manifest> => {
  // The query parameter avoids a cached copy
  const response = await fetch(
    `${figureDirUrl}manifest.json?cb=${Date.now()}`,
    {
      cache: "no-store",
    },
  );
  if (!response.ok) {
    throw new Error(`Could not load manifest.json (HTTP ${response.status})`);
  }
  const manifest = await response.json();
  if (!manifest || !Array.isArray(manifest.files)) {
    throw new Error("Invalid manifest.json");
  }
  return manifest;
};

const nextRemixPath = (manifest: Manifest) => {
  let max = 0;
  for (const f of manifest.files) {
    const m = REMIX_PATH_REGEX.exec(f.path);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `remix-${max + 1}.html`;
};

// Uploads the remix and returns its path in the figure directory. With
// `path`, an earlier saved remix is replaced; otherwise a new remix-N.html
// is created.
export const saveRemix = async (opts: {
  apiKey: string;
  figureDirUrl: string;
  html: string;
  path: string | null;
}): Promise<string> => {
  const { apiKey, figureDirUrl, html } = opts;
  if (opts.path !== null && !isRemixPath(opts.path)) {
    throw new Error(`Not a remix page: ${opts.path}`);
  }
  const manifest = await fetchManifest(figureDirUrl);
  const path = opts.path ?? nextRemixPath(manifest);
  const size = new TextEncoder().encode(html).byteLength;
  const files = [
    ...manifest.files.filter((f) => f.path !== path),
    { path, size },
  ];
  const newManifest: Manifest = {
    ...manifest,
    files,
    total_files: files.length,
    total_size: files.reduce((sum, f) => sum + (f.size || 0), 0),
  };
  const manifestJson = JSON.stringify(newManifest, null, 2);

  // The figure as registered with the API
  const figureUrl = figureDirUrl + "index.html";
  const contents: { [path: string]: string } = {
    [path]: html,
    "manifest.json": manifestJson,
  };
  const signed = await getBatchSignedUrls(apiKey, figureUrl, contents);
  if (!signed.success) {
    throw new Error(signed.message || "Could not get upload URLs");
  }
  if (!signed.signedUrls) {
    throw new Error("Saving remixes is not supported for this figure's bucket");
  }
  // The page first, so that the manifest never lists a missing page
  for (const p of [path, "manifest.json"]) {
    const url = signed.signedUrls.find((s) => s.relativePath === p)?.signedUrl;
    if (!url) throw new Error(`No upload URL for ${p}`);
    const result = await uploadFileToSignedUrl(url, contents[p], p);
    if (!result.success) {
      throw new Error(`Failed to upload ${p}: ${result.message}`);
    }
  }
  return path;
};
