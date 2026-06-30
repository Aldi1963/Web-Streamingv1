import { describe, expect, it } from "vitest";
import { extractStreamUrl, selectEpisodePayload } from "./stream-utils";

describe("stream-utils", () => {
  it("selects the requested GoodShort episode", () => {
    const raw = { data: { downloadList: [{ url: "https://cdn.test/1.mp4" }, { url: "https://cdn.test/2.mp4" }] } };
    expect(selectEpisodePayload(raw, "goodshort", 2)).toEqual({ url: "https://cdn.test/2.mp4" });
  });

  it("extracts nested MP4 and HLS URLs", () => {
    expect(extractStreamUrl({ data: { videoUrl: "https://cdn.test/movie.mp4?token=x" } }))
      .toBe("https://cdn.test/movie.mp4?token=x");
    expect(extractStreamUrl({ data: [{ hls_url: "https://cdn.test/master.m3u8" }] }))
      .toBe("https://cdn.test/master.m3u8");
  });

  it("rejects unrelated and non-http values", () => {
    expect(extractStreamUrl({ url: "javascript:alert(1)" })).toBeNull();
    expect(extractStreamUrl({ url: "https://example.com/page" })).toBeNull();
  });
});
