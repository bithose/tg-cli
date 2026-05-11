import { stdout as output } from "node:process";
import type { TelegramClient } from "telegram";
import { env } from "./env";
import { displayName, messageChat, messageSenderLabel } from "./peers";
import type { DialogRecord, MessageRecord, OutputMode } from "./types";

const resetColor = "\x1b[0m";
const whiteColor = "\x1b[97m";
const senderColors = [
  "\x1b[31m",
  "\x1b[32m",
  "\x1b[33m",
  "\x1b[34m",
  "\x1b[35m",
  "\x1b[36m",
  "\x1b[91m",
  "\x1b[92m",
  "\x1b[93m",
  "\x1b[94m",
  "\x1b[95m",
  "\x1b[96m",
];
const assignedSenderColors = new Map<string, string>();
let nextSenderColor = Math.floor(Math.random() * senderColors.length);
let selfLabelForColor: string | null = null;

export function setSelfLabelForColor(label: string): void {
  selfLabelForColor = label;
}

export function formatDate(value: unknown): string {
  if (typeof value !== "number") {
    return "";
  }
  return new Date(value * 1000).toISOString().replace("T", " ").slice(0, 16);
}

export function messageText(value: unknown): string {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text || "[media]";
}

export function colorize(value: string, color: string): string {
  if (!output.isTTY || env("NO_COLOR") !== undefined) {
    return value;
  }
  return `${color}${value}${resetColor}`;
}

export function senderColor(label: string): string {
  if (label === selfLabelForColor) {
    return whiteColor;
  }
  const existing = assignedSenderColors.get(label);
  if (existing) {
    return existing;
  }
  const color = senderColors[nextSenderColor % senderColors.length];
  nextSenderColor += 1;
  assignedSenderColors.set(label, color);
  return color;
}

export function writeJson(value: unknown): void {
  console.log(JSON.stringify(value));
}

export function shouldWriteJson(outputMode: OutputMode): boolean {
  return outputMode === "json";
}

export function dialogRecord(dialog: any): DialogRecord {
  const entity = dialog.entity;
  return {
    id: String(entity?.id?.toString?.() ?? entity?.id ?? ""),
    title: displayName(entity),
    username: entity?.username ? `@${entity.username}` : undefined,
    unreadCount: Number(dialog.unreadCount ?? 0),
  };
}

export async function messageRecord(
  client: TelegramClient,
  message: any,
): Promise<MessageRecord> {
  const sender = await messageSenderLabel(client, message);
  const chat = await messageChat(client, message);
  const peerKind = chat?.title ? "group" : chat ? "dm" : "unknown";
  return {
    id: String(message.id ?? ""),
    date: formatDate(message.date),
    peer: chat ? displayName(chat) : undefined,
    peerKind,
    sender,
    text: messageText(message.message || "[media]"),
    out: Boolean(message.out),
  };
}

export async function formatMessageLine(
  client: TelegramClient,
  message: any,
): Promise<string> {
  const record = await messageRecord(client, message);
  setSelfLabelForColor(record.out ? record.sender : selfLabelForColor ?? "");
  const sender = `${colorize(record.sender, senderColor(record.sender))} `;
  return `${record.id.padStart(5)} ${record.date} ${sender}${record.text}`;
}

export async function formatInboxLine(
  client: TelegramClient,
  message: any,
): Promise<string> {
  const record = await messageRecord(client, message);
  if (record.peerKind === "group" && record.peer) {
    const peer = colorize(`📣${record.peer}`, senderColor(record.peer));
    const sender = colorize(record.sender, senderColor(record.sender));
    return `${record.date} ${peer} ${sender} ${record.text}`;
  }

  const peerLabel = record.sender || record.peer || "unknown";
  const peer = colorize(peerLabel, senderColor(peerLabel));
  return `${record.date} ${peer} ${record.text}`;
}

export function formatDialogLine(record: DialogRecord): string {
  const username = record.username ? ` ${record.username}` : "";
  const unread = record.unreadCount ? ` unread:${record.unreadCount}` : "";
  return `${record.id.padEnd(14)} ${record.title}${username}${unread}`;
}
