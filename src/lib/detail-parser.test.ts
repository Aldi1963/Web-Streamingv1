import { describe, expect, it } from "vitest";
import { parseEpisodes } from "@/lib/detail-parser";

describe("detail episode parser", () => {
  it("normalizes common video list fields", () => {
    expect(parseEpisodes({ data: { video_list: [
      { episode: 1, episode_id: "e1", cover: "one.jpg" },
      { episode: 2, video_id: "e2", hls_url: "https://cdn.test/2.m3u8" },
    ] } })).toEqual([
      expect.objectContaining({ id: "e1", number: 1, thumbnail: "one.jpg" }),
      expect.objectContaining({ id: "e2", number: 2, hlsUrl: "https://cdn.test/2.m3u8" }),
    ]);
  });

  it("converts zero-based chapter indexes", () => {
    expect(parseEpisodes({ data: { chapterList: [{ chapterId: "0", chapterIndex: 0 }] } })[0])
      .toEqual(expect.objectContaining({ id: "0", number: 1 }));
  });
});
