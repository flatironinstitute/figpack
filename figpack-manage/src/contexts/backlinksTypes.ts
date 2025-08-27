export type BacklinkEntry = {
  repo: string;
  file: string;
  url: string;
};

export type BacklinksContextType = {
  backlinks: BacklinkEntry[];
  loading: boolean;
  error: string | null;
};
