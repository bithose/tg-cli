import { stdout as output } from "node:process";

export function clearCurrentLine(): void {
  if (!output.isTTY) {
    return;
  }
  output.write("\r\x1b[2K");
}

export function clearSubmittedLine(promptText: string, line: string): void {
  if (!output.isTTY) {
    return;
  }
  const columns = output.columns || 80;
  const rows = Math.max(
    1,
    Math.ceil((promptText.length + line.length + 1) / columns),
  );
  for (let i = 0; i < rows; i++) {
    output.write("\x1b[1A\r\x1b[2K");
  }
}
