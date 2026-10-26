// Text field value for the per-bucket figure limit.
//
// `maxFiguresPerUser` in the API:
//   null → use the system default (1000)
//   0    → no limit
//   N>0  → at most N unexpired figures per user in the bucket
//
// In the form an empty string means the system default.

export const FIGURE_LIMIT_HELPER_TEXT =
  "Maximum number of unexpired figures each user may have in this bucket. Leave blank for the default (1000); 0 means no limit.";

export function figureLimitToText(value: number | null | undefined): string {
  return value === null || value === undefined ? "" : String(value);
}

// Returns null for the default, a non-negative integer, or "invalid".
export function parseFigureLimit(text: string): number | null | "invalid" {
  const t = text.trim();
  if (t === "") return null;
  if (!/^\d+$/.test(t)) return "invalid";
  return Number(t);
}
