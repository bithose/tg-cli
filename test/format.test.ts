import { describe, expect, test } from "bun:test";
import {
  dialogRecord,
  formatDate,
  formatDialogLine,
  messageText,
  shouldWriteJson,
} from "../src/format";

describe("format helpers", () => {
  test("formats Telegram epoch seconds as minute precision UTC text", () => {
    expect(formatDate(1_767_590_940)).toBe("2026-01-05 05:29");
  });

  test("collapses text whitespace and marks empty media-like messages", () => {
    expect(messageText(" hello\n\nthere ")).toBe("hello there");
    expect(messageText("")).toBe("[media]");
    expect(messageText(undefined)).toBe("[media]");
  });

  test("records and displays dialogs consistently", () => {
    const record = dialogRecord({
      entity: { id: 123, title: "Build Room", username: "builds" },
      unreadCount: 4,
    });

    expect(record).toEqual({
      id: "123",
      title: "@builds",
      username: "@builds",
      unreadCount: 4,
    });
    expect(formatDialogLine(record)).toBe("123            @builds @builds unread:4");
  });

  test("identifies json output mode", () => {
    expect(shouldWriteJson("json")).toBe(true);
    expect(shouldWriteJson("text")).toBe(false);
  });
});
