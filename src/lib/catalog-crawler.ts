export type RemoteContent = Record<string, unknown>;
export type CatalogEndpoint = {
  id: string;
  providerName: string;
  providerSlug: string;
  providerType: string;
  endpointName: string;
  path: string;
  queryParamsJson: unknown;
};

const PAGE_SIZE = 100;

function text(item: RemoteContent, ...keys: string[]) {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" || typeof value === "bigint") return String(value);
  }
}

export function contentId(item: RemoteContent) {
  return text(
    item, "drama_id", "dramaId", "id", "book_id", "bookId", "movie_id",
    "movieId", "subjectId", "subject_id", "skit_id", "skitId", "series_id",
  );
}

export function contentTitle(item: RemoteContent) {
  return text(
    item, "drama_name", "dramaName", "title", "name", "movie_name",
    "movieName", "book_name", "bookName", "subjectName", "series_name",
  );
}

export function contentText(item: RemoteContent, ...keys: string[]) {
  return text(item, ...keys);
}

export function findContentObjects(value: unknown, found: RemoteContent[] = []): RemoteContent[] {
  if (Array.isArray(value)) {
    for (const item of value) findContentObjects(item, found);
  } else if (value && typeof value === "object") {
    const item = value as RemoteContent;
    if (contentId(item) && contentTitle(item)) found.push(item);
    else for (const nested of Object.values(item)) findContentObjects(nested, found);
  }
  return found;
}

export function endpointParams(endpoint: CatalogEndpoint, page: number) {
  const supported = Array.isArray(endpoint.queryParamsJson)
    ? endpoint.queryParamsJson.filter((value): value is string => typeof value === "string")
    : [];
  const params: Record<string, string | number> = {};
  if (supported.includes("page")) params.page = page;
  if (supported.includes("perPage")) params.perPage = PAGE_SIZE;
  if (supported.includes("limit")) params.limit = PAGE_SIZE;
  if (supported.includes("count")) params.count = PAGE_SIZE;
  if (supported.includes("size")) params.size = PAGE_SIZE;
  if (supported.includes("lang")) params.lang = endpoint.providerSlug === "dramabox" ? "in" : "id";
  return params;
}
