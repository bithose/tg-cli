import type { OutputMode } from "./types";

export function parseLine(line: string): string[] {
  const args: string[] = [];
  let current = "";
  let quote: "'" | '"' | null = null;
  let escaped = false;

  for (const char of line.trim()) {
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (quote) {
      if (char === quote) {
        quote = null;
      } else {
        current += char;
      }
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }
    if (/\s/.test(char)) {
      if (current) {
        args.push(current);
        current = "";
      }
      continue;
    }
    current += char;
  }

  if (escaped) {
    current += "\\";
  }
  if (quote) {
    throw new Error("Unclosed quote");
  }
  if (current) {
    args.push(current);
  }
  return args;
}

export function parseProcessArgs(argv: string[]): {
  args: string[];
  outputMode: OutputMode;
} {
  const args: string[] = [];
  let outputMode: OutputMode = "text";

  for (const arg of argv) {
    if (arg === "--json") {
      outputMode = "json";
      continue;
    }
    args.push(arg);
  }

  return { args, outputMode };
}
