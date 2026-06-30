import { describe, expect, it } from "vitest";
import { subscriptionWindow } from "./payment-activation-service";

describe("subscriptionWindow", () => {
  const now = new Date("2026-06-30T00:00:00Z");
  it("starts a new subscription now", () => {
    const result = subscriptionWindow(now, null, 30);
    expect(result.startsAt).toEqual(now);
    expect(result.expiresAt).toEqual(new Date("2026-07-30T00:00:00Z"));
  });
  it("preserves remaining time when extending", () => {
    const current = new Date("2026-07-10T00:00:00Z");
    const result = subscriptionWindow(now, current, 30);
    expect(result.startsAt).toEqual(current);
    expect(result.expiresAt).toEqual(new Date("2026-08-09T00:00:00Z"));
  });
});
