import { createInterface, type Interface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { Logger, TelegramClient } from "telegram";
import { LogLevel } from "telegram/extensions/Logger";
import { StringSession } from "telegram/sessions";
import { env } from "./env";
import { readSession, saveSession } from "./session";

export function readApiConfig(): {
  apiIdText: string | undefined;
  apiHash: string | undefined;
  apiId: number;
} {
  const apiIdText = env("TELEGRAM_API_ID");
  const apiHash = env("TELEGRAM_API_HASH");
  return { apiIdText, apiHash, apiId: Number(apiIdText) };
}

export function requireApiConfig(): { apiId: number; apiHash: string } {
  const { apiIdText, apiHash, apiId } = readApiConfig();

  if (!Number.isInteger(apiId) || apiId <= 0) {
    throw new Error("Set TELEGRAM_API_ID in .env");
  }
  if (!apiHash) {
    throw new Error("Set TELEGRAM_API_HASH in .env");
  }
  return { apiId, apiHash };
}

export function makeClient(): TelegramClient {
  const { apiId, apiHash } = requireApiConfig();
  return new TelegramClient(new StringSession(readSession()), apiId, apiHash, {
    baseLogger: new Logger(LogLevel.NONE),
    connectionRetries: 5,
  });
}

async function prompt(question: string, rl?: Interface): Promise<string> {
  if (rl) {
    return (await rl.question(question)).trim();
  }

  const singleUseRl = createInterface({ input, output });
  try {
    return (await singleUseRl.question(question)).trim();
  } finally {
    singleUseRl.close();
  }
}

export async function ensureAuthorized(
  client: TelegramClient,
  rl?: Interface,
): Promise<void> {
  await client.connect();
  if (await client.isUserAuthorized()) {
    return;
  }

  await client.start({
    phoneNumber: async () =>
      env("TELEGRAM_PHONE") ?? (await prompt("phone number: ", rl)),
    password: async () => await prompt("2FA password: ", rl),
    phoneCode: async () => await prompt("login code: ", rl),
    onError: (error) => {
      console.error(error);
    },
  });
  saveSession(client);
}
