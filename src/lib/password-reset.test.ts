import { describe, expect, it } from "vitest";
import { createResetToken, hashResetToken, RESET_TOKEN_TTL_MS } from "./password-reset";

describe("password reset tokens", () => {
  it("stores only a deterministic hash and expires after one hour", () => {
    const now = 1_700_000_000_000;
    const result = createResetToken(now);
    expect(result.token).toHaveLength(64);
    expect(result.tokenHash).toBe(hashResetToken(result.token));
    expect(result.tokenHash).not.toBe(result.token);
    expect(result.expiresAt.getTime()).toBe(now + RESET_TOKEN_TTL_MS);
  });
});
