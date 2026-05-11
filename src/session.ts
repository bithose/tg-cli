import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import type { TelegramClient } from "telegram";
import { env } from "./env";

export const DEFAULT_SESSION_PATH = ".session";
export const DEFAULT_INBOX_SESSION_PATH = ".session.inbox";

let activeSessionPath = env("TG_CLI_SESSION") ?? DEFAULT_SESSION_PATH;

export function sessionPath(): string {
  return activeSessionPath;
}

export function setDefaultSessionPath(path: string): void {
  if (!env("TG_CLI_SESSION")) {
    activeSessionPath = path;
  }
}

export function readSession(path = activeSessionPath): string {
  if (!existsSync(path)) {
    return "";
  }
  return readFileSync(path, "utf8").trim();
}

export function saveSession(client: TelegramClient): void {
  const saved = client.session.save();
  writeFileSync(activeSessionPath, String(saved), { mode: 0o600 });
}

export function clearSession(): void {
  if (existsSync(activeSessionPath)) {
    rmSync(activeSessionPath);
  }
}
