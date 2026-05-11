import "dotenv/config";
import { ensureAuthorized, makeClient } from "./client";
import { cmdDoctor, printHelp, runCommand, streamInbox } from "./commands";
import { parseProcessArgs } from "./parse";
import {
  DEFAULT_INBOX_SESSION_PATH,
  saveSession,
  setDefaultSessionPath,
} from "./session";
import { shell } from "./shell";
import type { Command, RuntimeOptions } from "./types";

async function oneShot(
  command: Command,
  args: string[],
  options: RuntimeOptions,
): Promise<void> {
  const client = makeClient();
  try {
    await ensureAuthorized(client);
    saveSession(client);
    if (command === "inbox") {
      await streamInbox(client, options);
      return;
    }
    await runCommand(client, options, command, args);
  } finally {
    await client.disconnect();
  }
}

export async function main(argv = process.argv.slice(2)): Promise<void> {
  const parsed = parseProcessArgs(argv);
  const [rawCommand, ...args] = parsed.args;
  const command = (rawCommand ?? "shell") as Command;
  const options: RuntimeOptions = { outputMode: parsed.outputMode };

  if (command === "inbox") {
    setDefaultSessionPath(DEFAULT_INBOX_SESSION_PATH);
  }

  if (command === "help") {
    printHelp();
    return;
  }
  if (command === "doctor") {
    cmdDoctor(options);
    return;
  }

  if (command === "shell" || command === "login" || !rawCommand) {
    await shell(options);
    return;
  }

  await oneShot(command, args, options);
}
