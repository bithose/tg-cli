import { describe, expect, test } from "bun:test";
import { parseLine, parseProcessArgs } from "../src/parse";

describe("parseLine", () => {
  test("keeps quoted peer names and message text together", () => {
    expect(parseLine('send "Some Group Title" "hello there"')).toEqual([
      "send",
      "Some Group Title",
      "hello there",
    ]);
  });

  test("supports escaping inside and outside quotes", () => {
    expect(parseLine(String.raw`send me "hello \"friend\"" done\ now`)).toEqual([
      "send",
      "me",
      'hello "friend"',
      "done now",
    ]);
  });

  test("rejects unclosed quotes", () => {
    expect(() => parseLine('send me "hello')).toThrow("Unclosed quote");
  });
});

describe("parseProcessArgs", () => {
  test("extracts json output mode without passing it to commands", () => {
    expect(parseProcessArgs(["--json", "history", "me", "2"])).toEqual({
      args: ["history", "me", "2"],
      outputMode: "json",
    });
  });
});
