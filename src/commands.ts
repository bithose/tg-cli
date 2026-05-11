import { existsSync } from "node:fs";
import { Api, type TelegramClient } from "telegram";
import { NewMessage } from "telegram/events";
import { readApiConfig } from "./client";
import { env } from "./env";
import {
  DEFAULT_INBOX_SESSION_PATH,
  DEFAULT_SESSION_PATH,
  clearSession,
  readSession,
  sessionPath,
} from "./session";
import {
  dialogRecord,
  formatDialogLine,
  formatInboxLine,
  formatMessageLine,
  messageRecord,
  setSelfLabelForColor,
  shouldWriteJson,
  writeJson,
} from "./format";
import { displayName, peerIdString, resolvePeer, selfLabel } from "./peers";
import type {
  ChatMode,
  Command,
  DialogRecord,
  InboxMode,
  MessageRecord,
  RuntimeOptions,
} from "./types";

export type CommandResult = "continue" | "exit" | ChatMode | InboxMode;

export async function cmdMe(
  client: TelegramClient,
  options: RuntimeOptions,
): Promise<void> {
  const me: any = await client.getMe();
  const record = {
    id: String(me.id?.toString?.() ?? me.id),
    username: me.username ? `@${me.username}` : undefined,
    name: displayName(me),
    phone: me.phone ? `+${me.phone}` : undefined,
  };

  if (shouldWriteJson(options.outputMode)) {
    writeJson(record);
    return;
  }

  console.log(`${record.name}${record.username ? ` (${record.username})` : ""}`);
  console.log(`id: ${record.id}`);
  if (record.phone) {
    console.log(`phone: ${record.phone}`);
  }
}

export async function cmdDialogs(
  client: TelegramClient,
  options: RuntimeOptions,
  limitText?: string,
): Promise<void> {
  const limit = Number(limitText ?? "25");
  const dialogs: any[] = await client.getDialogs({
    limit: Number.isFinite(limit) ? limit : 25,
  });
  const records: DialogRecord[] = dialogs.map(dialogRecord);

  if (shouldWriteJson(options.outputMode)) {
    writeJson(records);
    return;
  }

  for (const record of records) {
    console.log(formatDialogLine(record));
  }
}

export async function printHistory(
  client: TelegramClient,
  options: RuntimeOptions,
  peer: any,
  limit: number,
): Promise<MessageRecord[]> {
  const messages: any[] = await client.getMessages(peer, { limit });
  const records: MessageRecord[] = [];

  for (const message of messages.reverse()) {
    records.push(await messageRecord(client, message));
    if (!shouldWriteJson(options.outputMode)) {
      console.log(await formatMessageLine(client, message));
    }
  }

  return records;
}

export async function cmdHistory(
  client: TelegramClient,
  options: RuntimeOptions,
  peer: string | undefined,
  limitText?: string,
): Promise<void> {
  if (!peer) {
    throw new Error("Usage: history <peer> [limit]");
  }
  const limit = Number(limitText ?? "20");
  const records = await printHistory(
    client,
    options,
    await resolvePeer(client, peer),
    Number.isFinite(limit) ? limit : 20,
  );

  if (shouldWriteJson(options.outputMode)) {
    writeJson(records);
  }
}

export async function cmdSend(
  client: TelegramClient,
  options: RuntimeOptions,
  peer: string | undefined,
  messageParts: string[],
): Promise<void> {
  if (!peer || messageParts.length === 0) {
    throw new Error('Usage: send <peer> "message"');
  }
  const resolvedPeer = await resolvePeer(client, peer);
  const result: any = await client.sendMessage(resolvedPeer, {
    message: messageParts.join(" "),
  });
  const sent = await messageRecord(client, result);
  const history = await printHistory(client, options, resolvedPeer, 3);

  if (shouldWriteJson(options.outputMode)) {
    writeJson({ sent: true, message: sent, history });
    return;
  }

  console.log("Sent!");
}

export async function sendChatLine(
  client: TelegramClient,
  chat: ChatMode,
  text: string,
): Promise<void> {
  const result: any = await client.sendMessage(chat.peer, { message: text });
  console.log(await formatMessageLine(client, result));
}

export async function openChat(
  client: TelegramClient,
  options: RuntimeOptions,
  peer: string | undefined,
): Promise<ChatMode> {
  if (!peer) {
    throw new Error('Usage: open "groupchat-name"');
  }
  const entity = await resolvePeer(client, peer);
  const chat = {
    peer: entity,
    peerId: await peerIdString(client, entity),
    label: displayName(entity),
  };
  if (!shouldWriteJson(options.outputMode)) {
    console.log(`opened ${chat.label}. type :q to return to tg-cli>`);
  }
  await printHistory(client, options, entity, 20);
  if (shouldWriteJson(options.outputMode)) {
    writeJson({ open: true, peer: chat.label, peerId: chat.peerId });
  }
  return chat;
}

export function openInbox(): InboxMode {
  console.log("opened inbox. type :q to return to tg-cli>");
  return { label: "inbox" };
}

export async function streamInbox(
  client: TelegramClient,
  options: RuntimeOptions,
): Promise<void> {
  if (!shouldWriteJson(options.outputMode)) {
    console.log("inbox open. press Ctrl-C to quit.");
  }
  await new Promise<void>((resolve) => {
    const eventBuilder = new NewMessage({ incoming: true });
    const handler = async (event: any) => {
      if (shouldWriteJson(options.outputMode)) {
        writeJson(await messageRecord(client, event.message));
        return;
      }
      console.log(await formatInboxLine(client, event.message));
    };
    const stop = () => {
      client.removeEventHandler(handler, eventBuilder);
      resolve();
    };

    client.addEventHandler(handler, eventBuilder);
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
  });
}

export async function cmdLogout(client: TelegramClient): Promise<"exit"> {
  if (await client.isUserAuthorized()) {
    try {
      await client.invoke(new Api.auth.LogOut());
    } catch (error) {
      console.error(
        `remote logout failed; clearing local session anyway: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
  clearSession();
  console.log("signed out");
  return "exit";
}

export function cmdDoctor(options: RuntimeOptions): void {
  const { apiIdText, apiHash, apiId } = readApiConfig();
  const activeSession = readSession();
  const mainSession = readSession(DEFAULT_SESSION_PATH);
  const inboxSession = readSession(DEFAULT_INBOX_SESSION_PATH);
  const checks = [
    { ok: true, name: "bun", detail: Bun.version },
    { ok: existsSync(".env"), name: ".env", detail: existsSync(".env") ? "found" : "missing" },
    {
      ok: Number.isInteger(apiId) && apiId > 0,
      name: "TELEGRAM_API_ID",
      detail: apiIdText ? "set" : "missing",
    },
    {
      ok: Boolean(apiHash),
      name: "TELEGRAM_API_HASH",
      detail: apiHash ? "set" : "missing",
    },
    {
      ok: Boolean(env("TELEGRAM_PHONE")),
      name: "TELEGRAM_PHONE",
      detail: env("TELEGRAM_PHONE") ? "set" : "optional",
    },
    {
      ok: mainSession.length > 0,
      name: DEFAULT_SESSION_PATH,
      detail: mainSession ? "main shell session cached" : "login required",
    },
    {
      ok: inboxSession.length > 0,
      name: DEFAULT_INBOX_SESSION_PATH,
      detail: inboxSession ? "dedicated inbox session cached" : "login required",
    },
  ];

  if (
    sessionPath() !== DEFAULT_SESSION_PATH &&
    sessionPath() !== DEFAULT_INBOX_SESSION_PATH
  ) {
    checks.push({
      ok: activeSession.length > 0,
      name: sessionPath(),
      detail: activeSession ? "authorized session cached" : "login required",
    });
  }

  if (shouldWriteJson(options.outputMode)) {
    writeJson(checks);
    return;
  }

  for (const check of checks) {
    console.log(`${check.ok ? "ok " : "!! "} ${check.name}: ${check.detail}`);
  }

  if (!apiIdText || !apiHash) {
    console.log("next: cp .env.example .env, then fill in Telegram API values");
  } else if (!activeSession) {
    console.log("next: bun run tg-cli, then complete the login prompts");
  }
}

export function printHelp(): void {
  console.log(`Commands:
  me
  dialogs [limit]
  send <peer> "message"
  history <peer> [limit]
  open <peer>
  inbox
  logout
  doctor
  help
  :q

Options:
  --json    write machine-readable JSON for one-shot commands

Peer can be "me", @username, phone/contact, chat title, or a numeric id GramJS can resolve.`);
}

export async function runCommand(
  client: TelegramClient,
  options: RuntimeOptions,
  command: Command,
  args: string[],
): Promise<CommandResult> {
  if (!shouldWriteJson(options.outputMode)) {
    setSelfLabelForColor(await selfLabel(client));
  }

  switch (command) {
    case "login":
    case "shell":
      return "continue";
    case "me":
      await cmdMe(client, options);
      return "continue";
    case "dialogs":
      await cmdDialogs(client, options, args[0]);
      return "continue";
    case "send":
      await cmdSend(client, options, args[0], args.slice(1));
      return "continue";
    case "history":
      await cmdHistory(client, options, args[0], args[1]);
      return "continue";
    case "open":
      return await openChat(client, options, args[0]);
    case "inbox":
      return openInbox();
    case "logout":
      return await cmdLogout(client);
    case "doctor":
      cmdDoctor(options);
      return "continue";
    case "help":
      printHelp();
      return "continue";
    case ":q":
    case "exit":
    case "quit":
      return "exit";
    default:
      throw new Error(`Unknown command: ${command}`);
  }
}
