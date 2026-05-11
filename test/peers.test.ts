import { describe, expect, test } from "bun:test";
import { displayName, peerIdString, resolvePeer } from "../src/peers";

describe("displayName", () => {
  test("prefers username, then title, then person name, then id", () => {
    expect(displayName({ username: "ada", title: "Room", id: 1 })).toBe("@ada");
    expect(displayName({ title: "Room", id: 1 })).toBe("Room");
    expect(displayName({ firstName: "Ada", lastName: "Lovelace", id: 1 })).toBe(
      "Ada Lovelace",
    );
    expect(displayName({ id: 1 })).toBe("1");
  });
});

describe("resolvePeer", () => {
  test("resolves exact dialog aliases before falling back to GramJS", async () => {
    const entity = { id: 42, title: "Some Group Title" };
    const client = {
      getDialogs: async () => [{ entity }],
      getEntity: async () => {
        throw new Error("should not fall back");
      },
    };

    await expect(resolvePeer(client as any, "some group title")).resolves.toBe(
      entity,
    );
  });

  test("reports ambiguous dialog aliases", async () => {
    const client = {
      getDialogs: async () => [
        { entity: { id: 1, title: "Ops" } },
        { entity: { id: 2, title: "ops" } },
      ],
      getEntity: async () => undefined,
    };

    await expect(resolvePeer(client as any, "ops")).rejects.toThrow(
      'Ambiguous peer "ops"',
    );
  });

  test("normalizes GramJS peer ids to strings", async () => {
    const client = { getPeerId: async () => 12345n };
    await expect(peerIdString(client as any, {})).resolves.toBe("12345");
  });
});
