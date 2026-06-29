import { describe, expect, it } from "vitest";
import { contentId, contentTitle, endpointParams, findContentObjects } from "@/lib/catalog-crawler";

describe("catalog response parser", () => {
  it("recognizes provider-specific identifiers and titles", () => {
    const response = {
      data: {
        sections: [
          { subjectId: "movie-1", subjectName: "Movie One" },
          { bookId: 42, bookName: "Drama Two" },
          { skit_id: "skit-3", title: "Drama Three" },
        ],
      },
    };
    const items = findContentObjects(response);
    expect(items.map(contentId)).toEqual(["movie-1", "42", "skit-3"]);
    expect(items.map(contentTitle)).toEqual(["Movie One", "Drama Two", "Drama Three"]);
  });

  it("does not treat episode objects without a content title as catalog items", () => {
    expect(findContentObjects({ episodes: [{ id: "ep-1", episode_no: 1 }] })).toEqual([]);
  });
});

describe("catalog pagination parameters", () => {
  it("maps generic page-size and Indonesian language parameters", () => {
    const endpoint = {
      id: "1",
      providerName: "DramaBox",
      providerSlug: "dramabox",
      providerType: "Short Drama",
      endpointName: "home",
      path: "/dramabox/home",
      queryParamsJson: ["page", "limit", "perPage", "count", "size", "lang"],
    };
    expect(endpointParams(endpoint, 3)).toEqual({
      page: 3,
      limit: 100,
      perPage: 100,
      count: 100,
      size: 100,
      lang: "in",
    });
  });
});
