import { describe, expect, it } from "vitest";
import { episodesWithFallback } from "@/lib/episodes";
import { extractStreamUrl, selectEpisodePayload } from "@/lib/stream-utils";
import { isProgressCompleted, normalizeProgressPosition } from "@/lib/watch-progress";

describe("watch progress", () => {
  it("marks 90% as complete and normalizes it to duration", () => {
    expect(isProgressCompleted(90, 100)).toBe(true);
    expect(normalizeProgressPosition(90, 100)).toBe(100);
  });

  it("clamps invalid positions", () => {
    expect(normalizeProgressPosition(-10, 100)).toBe(0);
    expect(normalizeProgressPosition(120, 100)).toBe(100);
  });
});

describe("episode fallback", () => {
  it("creates virtual episodes from provider metadata", () => {
    const episodes = episodesWithFallback([], { episode_count: 3 }, "content-1");
    expect(episodes.map((episode) => episode.episodeNumber)).toEqual([1, 2, 3]);
  });
});

describe("stream resolution", () => {
  it("selects the requested GoodShort episode", () => {
    const raw = { data: { downloadList: [{ url: "https://cdn.test/1.mp4" }, { url: "https://cdn.test/2.mp4" }] } };
    expect(extractStreamUrl(selectEpisodePayload(raw, "goodshort", 2))).toBe("https://cdn.test/2.mp4");
  });

  it("ignores unrelated URLs and finds nested HLS media", () => {
    expect(extractStreamUrl({ poster: "https://cdn.test/poster.jpg", data: { source: "https://cdn.test/video.m3u8?token=x" } }))
      .toBe("https://cdn.test/video.m3u8?token=x");
  });
});
