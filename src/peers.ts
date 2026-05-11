import type { TelegramClient } from "telegram";

let cachedSelfLabel: string | null = null;

export function displayName(entity: any): string {
  const name = [entity?.firstName, entity?.lastName].filter(Boolean).join(" ");
  return (
    (entity?.username ? `@${entity.username}` : undefined) ??
    entity?.title ??
    (name || undefined) ??
    String(entity?.id ?? "")
  );
}

function normalizePeerName(value: string): string {
  return value.trim().replace(/^@/, "").toLowerCase();
}

function dialogAliases(entity: any): string[] {
  const id = entity?.id?.toString?.() ?? entity?.id;
  return [
    entity?.title,
    entity?.username,
    entity?.username ? `@${entity.username}` : undefined,
    [entity?.firstName, entity?.lastName].filter(Boolean).join(" "),
    entity?.firstName,
    entity?.lastName,
    id ? String(id) : undefined,
  ]
    .filter((value): value is string => Boolean(value))
    .map(normalizePeerName);
}

export async function resolvePeer(
  client: TelegramClient,
  peer: string,
): Promise<any> {
  const needle = normalizePeerName(peer);
  const dialogs: any[] = await client.getDialogs({ limit: 500 });
  const matches = dialogs.filter((dialog) =>
    dialogAliases(dialog.entity).includes(needle),
  );

  if (matches.length === 1) {
    return matches[0].entity;
  }
  if (matches.length > 1) {
    throw new Error(
      `Ambiguous peer "${peer}". Matches: ${matches
        .map((dialog) => displayName(dialog.entity))
        .join(", ")}`,
    );
  }

  try {
    return await client.getEntity(peer);
  } catch {
    throw new Error(
      `Could not resolve "${peer}". Run dialogs and use the exact title, @username, or id.`,
    );
  }
}

export async function peerIdString(
  client: TelegramClient,
  entity: any,
): Promise<string> {
  const peerId = await client.getPeerId(entity);
  return String(peerId?.toString?.() ?? peerId);
}

export async function selfLabel(client: TelegramClient): Promise<string> {
  if (!cachedSelfLabel) {
    cachedSelfLabel = displayName(await client.getMe());
  }
  return cachedSelfLabel;
}

export async function messageSenderLabel(
  client: TelegramClient,
  message: any,
): Promise<string> {
  if (message.out) {
    return await selfLabel(client);
  }

  try {
    const sender = await message.getSender?.();
    if (sender) {
      return displayName(sender);
    }
  } catch {
    // Fall back to the local flags below.
  }
  return message.out ? "You" : "Them";
}

export async function messagePeerId(
  client: TelegramClient,
  message: any,
): Promise<string | undefined> {
  try {
    const chat = await message.getChat?.();
    if (chat) {
      return await peerIdString(client, chat);
    }
  } catch {
    // Fall back to chatId below.
  }
  return message.chatId?.toString?.();
}

export async function messageChat(
  client: TelegramClient,
  message: any,
): Promise<any> {
  try {
    const chat = await message.getChat?.();
    if (chat) {
      return chat;
    }
  } catch {
    // Fall back to peer id lookup below.
  }

  try {
    const peerId = await messagePeerId(client, message);
    return peerId ? await client.getEntity(peerId) : undefined;
  } catch {
    return undefined;
  }
}
