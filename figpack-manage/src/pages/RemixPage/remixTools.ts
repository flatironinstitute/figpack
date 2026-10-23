import type { ConsoleEntry } from "./consoleCapture";
import { isErrorLevel } from "./consoleCapture";
import type { LlmTool } from "./llmApi";

// Tools of the remix agent. They act only on the in-memory remix page and
// on the console log of its preview.

export const REMIX_TOOLS: LlmTool[] = [
  {
    type: "function",
    function: {
      name: "read_page",
      description:
        "Read the remix page (the figure's index.html) with line numbers. Returns up to `limit` lines starting at line `offset` (1-based).",
      parameters: {
        type: "object",
        properties: {
          offset: {
            type: "integer",
            description: "First line to read (default 1)",
          },
          limit: {
            type: "integer",
            description: "Number of lines to read (default 1000)",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "edit_page",
      description:
        "Replace an exact string in the remix page. old_string must match the page exactly (without the line numbers shown by read_page) and must be unique unless replace_all is true. After the edit the preview reloads, and the result lists the console errors and warnings of the reloaded page.",
      parameters: {
        type: "object",
        properties: {
          old_string: { type: "string", description: "Text to replace" },
          new_string: { type: "string", description: "Replacement text" },
          replace_all: {
            type: "boolean",
            description: "Replace every occurrence (default false)",
          },
        },
        required: ["old_string", "new_string"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_console",
      description:
        "Read the console output of the preview since its last reload: console messages, uncaught errors and failed resource loads.",
      parameters: {
        type: "object",
        properties: {
          max_entries: {
            type: "integer",
            description: "Maximum number of most recent entries (default 100)",
          },
        },
      },
    },
  },
];

export interface RemixToolContext {
  getHtml: () => string;
  setHtml: (html: string) => void;
  getConsoleEntries: () => ConsoleEntry[];
  // Resolves once the preview has reloaded after a change and settled;
  // false if it did not reload in time
  waitForReload: () => Promise<boolean>;
}

export type ToolResult = { content: string; isError: boolean };

const MAX_READ_CHARS = 60000;
const MAX_LINE_CHARS = 2000;

const formatEntry = (e: ConsoleEntry) => `[${e.level}] ${e.text}`;

const entriesSinceLoad = (entries: ConsoleEntry[]) => {
  const lastLoad = entries.map((e) => e.level).lastIndexOf("page-load");
  return entries.slice(lastLoad + 1);
};

const readPage = (ctx: RemixToolContext, args: Record<string, unknown>) => {
  const lines = ctx.getHtml().split("\n");
  const offset = Math.max(1, Number(args.offset) || 1);
  const limit = Math.max(1, Number(args.limit) || 1000);
  const out: string[] = [];
  let chars = 0;
  let i = offset - 1;
  for (; i < Math.min(lines.length, offset - 1 + limit); i++) {
    let line = lines[i];
    if (line.length > MAX_LINE_CHARS) {
      line = line.slice(0, MAX_LINE_CHARS) + " ...[line truncated]";
    }
    const s = `${i + 1}\t${line}`;
    if (chars + s.length > MAX_READ_CHARS && out.length > 0) break;
    out.push(s);
    chars += s.length + 1;
  }
  const header = `Lines ${offset}-${i} of ${lines.length}`;
  return { content: `${header}\n${out.join("\n")}`, isError: false };
};

const countOccurrences = (s: string, sub: string) => {
  let n = 0;
  let idx = s.indexOf(sub);
  while (idx >= 0) {
    n++;
    idx = s.indexOf(sub, idx + sub.length);
  }
  return n;
};

const editPage = async (
  ctx: RemixToolContext,
  args: Record<string, unknown>,
): Promise<ToolResult> => {
  const oldString = args.old_string;
  const newString = args.new_string;
  if (typeof oldString !== "string" || typeof newString !== "string") {
    return { content: "old_string and new_string are required", isError: true };
  }
  if (!oldString) return { content: "old_string is empty", isError: true };
  if (oldString === newString) {
    return { content: "old_string and new_string are the same", isError: true };
  }
  const html = ctx.getHtml();
  const n = countOccurrences(html, oldString);
  if (n === 0) {
    return {
      content:
        "old_string was not found in the page. Read the page again and copy the text exactly, without line numbers.",
      isError: true,
    };
  }
  if (n > 1 && args.replace_all !== true) {
    return {
      content: `old_string occurs ${n} times. Include more surrounding text to make it unique, or set replace_all.`,
      isError: true,
    };
  }
  ctx.setHtml(html.split(oldString).join(newString));
  const reloaded = await ctx.waitForReload();
  if (!reloaded) {
    return {
      content:
        "Edit applied, but the preview has not reloaded yet. Use read_console later to check it.",
      isError: false,
    };
  }
  const problems = entriesSinceLoad(ctx.getConsoleEntries()).filter(
    (e) => isErrorLevel(e.level) || e.level === "warn",
  );
  const summary =
    problems.length === 0
      ? "No console errors or warnings."
      : `Console errors and warnings:\n${problems.slice(-20).map(formatEntry).join("\n")}`;
  return {
    content: `Edit applied (${n} replacement${n > 1 ? "s" : ""}). The preview reloaded. ${summary}`,
    isError: false,
  };
};

const readConsole = (ctx: RemixToolContext, args: Record<string, unknown>) => {
  const max = Math.max(1, Number(args.max_entries) || 100);
  const entries = entriesSinceLoad(ctx.getConsoleEntries());
  if (entries.length === 0) {
    return {
      content: "No console output since the last reload.",
      isError: false,
    };
  }
  const shown = entries.slice(-max);
  const header =
    shown.length < entries.length
      ? `Last ${shown.length} of ${entries.length} entries since the last reload:`
      : `${entries.length} entries since the last reload:`;
  return {
    content: `${header}\n${shown.map(formatEntry).join("\n")}`,
    isError: false,
  };
};

export const executeRemixTool = async (
  ctx: RemixToolContext,
  name: string,
  argsJson: string,
): Promise<ToolResult> => {
  let args: Record<string, unknown>;
  try {
    args = argsJson ? JSON.parse(argsJson) : {};
  } catch {
    return { content: `Invalid JSON arguments: ${argsJson}`, isError: true };
  }
  switch (name) {
    case "read_page":
      return readPage(ctx, args);
    case "edit_page":
      return editPage(ctx, args);
    case "read_console":
      return readConsole(ctx, args);
    default:
      return { content: `Unknown tool: ${name}`, isError: true };
  }
};

// A short description of a tool call for the chat panel
export const describeToolCall = (name: string, argsJson: string) => {
  let args: Record<string, unknown> = {};
  try {
    args = JSON.parse(argsJson || "{}");
  } catch {
    // shown without details
  }
  switch (name) {
    case "read_page": {
      const offset = Number(args.offset) || 1;
      return args.limit
        ? `Read page, lines ${offset}-${offset + Number(args.limit) - 1}`
        : `Read page from line ${offset}`;
    }
    case "edit_page":
      return "Edited page";
    case "read_console":
      return "Read console";
    default:
      return name;
  }
};
