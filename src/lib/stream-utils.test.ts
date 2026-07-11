import { describe, expect, it } from "vitest";
import { collectStreamOptions, extractStreamUrl, isProxyableMediaUrl, proxyMediaUrl, selectEpisodePayload } from "./stream-utils";

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
    expect(extractStreamUrl({ data: { resourceLink: "https://cdn.test/movie.mp4?token=x" } }))
      .toBe("https://cdn.test/movie.mp4?token=x");
    expect(extractStreamUrl({
      "360p": "https://hls.drakor.cc/path/360.m3u8?token=x",
      "720p": "https://hls.drakor.cc/path/720.m3u8?token=x",
    })).toBe("https://hls.drakor.cc/path/720.m3u8?token=x");
  });

  it("rejects unrelated and non-http values", () => {
    expect(extractStreamUrl({ url: "javascript:alert(1)" })).toBeNull();
    expect(extractStreamUrl({ url: "https://example.com/page" })).toBeNull();
  });

  it("keeps API language metadata on video choices", () => {
    const options = collectStreamOptions({ data: [
      { language: "id", quality: "720", url: "https://cdn.test/id-720.m3u8" },
      { lang: "English", quality: "720p", url: "https://cdn.test/en-720.m3u8" },
    ] });
    expect(options).toEqual([
      { label: "720p", language: "Indonesia", url: "https://cdn.test/id-720.m3u8" },
      { label: "720p", language: "English", url: "https://cdn.test/en-720.m3u8" },
    ]);
  });

  it("proxies supported media hosts through same-origin routes", () => {
    expect(isProxyableMediaUrl("https://v-mps.crazymaplestudios.com/path/video.m3u8")).toBe(true);
    expect(proxyMediaUrl("https://v-mps.crazymaplestudios.com/path/video.m3u8")).toContain("/api/hls-proxy?url=");
    expect(proxyMediaUrl("https://v-mps.crazymaplestudios.com/path/video.mp4")).toContain("/api/video-proxy?url=");
    expect(proxyMediaUrl("https://bcdn.hakunaymatata.com/resource/video.mp4?sign=x")).toContain("/api/video-proxy?url=");
    expect(proxyMediaUrl("https://api.clipku.com/goodshort/proxy/m3u8?url=https%3A%2F%2Fcdn.test%2Fmaster.m3u8"))
      .toContain("/api/hls-proxy?url=");
  });
});
