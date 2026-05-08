// Dropdown choices for the per-bucket figure-expiration override.
//
// `value` is what we send to the API as defaultExpirationSeconds:
//   null → use the system default (24h)
//   0    → never expire
//   N>0  → seconds
//
// We use string values in the <Select> component (MUI doesn't love mixed
// number/null values), and convert at the boundary.

export type ExpirationOptionValue =
	| "default"
	| "1h"
	| "1d"
	| "1w"
	| "1mo"
	| "1y"
	| "never";

export const EXPIRATION_OPTIONS: Array<{
	value: ExpirationOptionValue;
	label: string;
}> = [
	{ value: "default", label: "System default (24 hours)" },
	{ value: "1h", label: "1 hour" },
	{ value: "1d", label: "1 day" },
	{ value: "1w", label: "1 week" },
	{ value: "1mo", label: "1 month (30 days)" },
	{ value: "1y", label: "1 year" },
	{ value: "never", label: "Never expire" },
];

const VALUE_TO_SECONDS: Record<ExpirationOptionValue, number | null> = {
	default: null,
	"1h": 3600,
	"1d": 86400,
	"1w": 604800,
	"1mo": 2592000,
	"1y": 31536000,
	never: 0,
};

export function expirationOptionToSeconds(
	v: ExpirationOptionValue,
): number | null {
	return VALUE_TO_SECONDS[v];
}

// Map a stored value (number | null | undefined) back to the option key.
// Unknown numeric values fall back to the closest option, biased toward
// "default" so existing API-set values don't silently get overwritten.
export function secondsToExpirationOption(
	seconds: number | null | undefined,
): ExpirationOptionValue {
	if (seconds === null || seconds === undefined) return "default";
	if (seconds === 0) return "never";
	if (seconds === 3600) return "1h";
	if (seconds === 86400) return "1d";
	if (seconds === 604800) return "1w";
	if (seconds === 2592000) return "1mo";
	if (seconds === 31536000) return "1y";
	return "default";
}
