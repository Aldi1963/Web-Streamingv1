import { describe, expect, it } from "vitest";
import { latestProgressByContent } from "./watch-progress";

describe("latestProgressByContent", () => {
  it("keeps only the latest watched episode for each content", () => {
    const rows = [
      { id: "old-a", contentId: "a", episodeId: "a-1", lastWatchedAt: new Date("2026-01-01") },
      { id: "b", contentId: "b", episodeId: "b-2", lastWatchedAt: new Date("2026-01-03") },
      { id: "new-a", contentId: "a", episodeId: "a-4", lastWatchedAt: new Date("2026-01-04") },
    ];

    expect(latestProgressByContent(rows).map(row => row.id)).toEqual(["new-a", "b"]);
  });
});
