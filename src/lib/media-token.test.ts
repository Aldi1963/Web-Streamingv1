import { beforeAll, describe, expect, it } from "vitest";
import { signMediaUrl, verifyMediaUrl } from "./media-token";

describe("media token", () => {
  beforeAll(() => {
    process.env.AUTH_SECRET = "test-secret-that-is-longer-than-thirty-two-characters";
  });

  it("accepts an unmodified, unexpired media URL", () => {
    const source = "https://cdn.drakor.cc/episode/master.m3u8";
    const token = signMediaUrl(source);
    expect(verifyMediaUrl(source, token.expiresAt, token.signature)).toBe(true);
  });

  it("rejects tampering, expiration, and excessive lifetime", () => {
    const source = "https://cdn.drakor.cc/episode/master.m3u8";
    const token = signMediaUrl(source);
    expect(verifyMediaUrl(`${source}?changed=1`, token.expiresAt, token.signature)).toBe(false);
    expect(verifyMediaUrl(source, Math.floor(Date.now() / 1000) - 1, token.signature)).toBe(false);
    expect(verifyMediaUrl(source, Math.floor(Date.now() / 1000) + 601, token.signature)).toBe(false);
  });
});
