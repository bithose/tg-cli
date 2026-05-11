import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";
import { NewMessage, type NewMessageEvent } from "telegram/events";
import { ensureAuthorized, makeClient } from "./client";
import { formatInboxLine, formatMessageLine, setSelfLabelForColor } from "./format";
import { parseLine } from "./parse";
import { messagePeerId, selfLabel } from "./peers";
import { saveSession } from "./session";
import { clearCurrentLine, clearSubmittedLine } from "./terminal";
import type { ChatMode, Command, InboxMode, RuntimeOptions } from "./types";
import { runCommand, sendChatLine } from "./commands";

export async function shell(options: RuntimeOptions): Promise<void> {
  const rl = createInterface({ input, output, terminal: true });
  const client = makeClient();

  try {
    await ensureAuthorized(client, rl);
    saveSession(client);
    setSelfLabelForColor(await selfLabel(client));
    console.log("connected. type help for commands, :q to quit.");

    let chatMode: ChatMode | null = null;
    let inboxMode: InboxMode | null = null;
    const promptText = () => {
      if (chatMode) {
        return `${chatMode.label}> `;
      }
      if (inboxMode) {
        return "inbox> ";
      }
      return "tg-cli> ";
    };
    const redrawPrompt = () => {
      rl.setPrompt(promptText());
      rl.prompt(true);
    };
    const liveHandler = async (event: NewMessageEvent) => {
      if (!chatMode) {
        if (inboxMode) {
          clearCurrentLine();
          console.log(await formatInboxLine(client, event.message));
          redrawPrompt();
        }
        return;
      }
      const peerId = await messagePeerId(client, event.message);
      if (peerId !== chatMode.peerId) {
        return;
      }
      clearCurrentLine();
      console.log(await formatMessageLine(client, event.message));
      redrawPrompt();
    };
    client.addEventHandler(liveHandler, new NewMessage({ incoming: true }));

    redrawPrompt();
    for await (const line of rl) {
      const trimmed = line.trim();
      if (chatMode) {
        clearSubmittedLine(promptText(), line);
        if (trimmed === ":q") {
          chatMode = null;
          redrawPrompt();
          continue;
        }
        if (!trimmed) {
          redrawPrompt();
          continue;
        }
        try {
          await sendChatLine(client, chatMode, trimmed);
        } catch (error) {
          console.error(error instanceof Error ? error.message : error);
        }
        redrawPrompt();
        continue;
      }

      if (inboxMode) {
        clearSubmittedLine(promptText(), line);
        if (trimmed === ":q") {
          inboxMode = null;
          redrawPrompt();
          continue;
        }
        if (trimmed) {
          console.log("inbox is read-only. type :q to return to tg-cli>");
        }
        redrawPrompt();
        continue;
      }

      const args = parseLine(line);
      if (args.length === 0) {
        redrawPrompt();
        continue;
      }

      const [rawCommand, ...commandArgs] = args;
      try {
        const result = await runCommand(
          client,
          options,
          rawCommand as Command,
          commandArgs,
        );
        if (result === "exit") {
          break;
        }
        if (typeof result === "object") {
          if ("peer" in result) {
            chatMode = result;
            inboxMode = null;
          } else {
            inboxMode = result;
            chatMode = null;
          }
        }
      } catch (error) {
        console.error(error instanceof Error ? error.message : error);
      }
      redrawPrompt();
    }
  } finally {
    rl.close();
    await client.disconnect();
  }
}
