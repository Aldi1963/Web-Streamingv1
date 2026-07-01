import { describe, expect, it } from "vitest";
import { FREE_EPISODE_LIMIT, requiresSubscription } from "./playback-access-service";

describe("playback access policy", () => {
  it("keeps the first eight episodes free", () => {
    for (let episode = 1; episode <= FREE_EPISODE_LIMIT; episode++) {
      expect(requiresSubscription(episode)).toBe(false);
    }
  });

  it("requires an active package from episode nine", () => {
    expect(requiresSubscription(9)).toBe(true);
    expect(requiresSubscription(100)).toBe(true);
  });
});
