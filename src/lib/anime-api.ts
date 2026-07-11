const ANIME_API_BASE = process.env.ANIME_API_BASE || "https://api.clipku.com";

export type AnimeItem = {
  id?: string | number;
  url?: string;
  judul?: string;
  cover?: string;
  lastch?: string;
  lastup?: string;
  genre?: string[];
  sinopsis?: string;
  studio?: string;
  score?: string;
  status?: string;
  rilis?: string;
  total_episode?: number;
  type?: string;
};

export type AnimeScheduleDay = {
  day?: string;
  date?: string;
  animeList?: Array<{
    anime_name?: string;
    id?: string | number;
    link?: string;
    cover?: string;
    updated?: number;
  }>;
};

export type AnimeDetail = {
  id?: string | number;
  series_id?: string;
  cover?: string;
  judul?: string;
  type?: string;
  status?: string;
  rating?: string;
  published?: string;
  author?: string;
  genre?: string[];
  sinopsis?: string;
  chapter?: Array<{
    id?: string | number;
    ch?: string;
    url?: string;
    date?: string;
    views?: number;
  }>;
};

export type AnimeListMap = Record<string, AnimeItem[]>;

export type AnimeStreamData = {
  episode_id?: string | number;
  reso?: string[];
  streams?: Record<string, Array<{
    link?: string;
    provide?: string | number;
    id?: string | number;
    reso?: string;
    size_kb?: number | null;
  }>>;
  resoSize?: Record<string, string | null>;
  resoSizeKb?: Record<string, number | null>;
};

type ApiList<T> = { data?: T[] };
type SearchPayload = { data?: Array<{ result?: AnimeItem[]; jumlah?: number; pagination?: unknown }> };

type StreamPayload = { data?: AnimeStreamData[] };

async function readJson<T>(path: string, revalidate = 180): Promise<T | null> {
  try {
    const res = await fetch(`${ANIME_API_BASE}${path}`, { next: { revalidate } });
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

export function cleanAnimeSlug(slug?: string) {
  return (slug || "").replace(/^\/+|\/+$/g, "");
}

export async function getAnimeHome(page = 1) {
  const payload = await readJson<ApiList<AnimeItem>>(`/anime/home?page=${page}`);
  return payload?.data ?? [];
}

export async function getAnimeOngoing() {
  const payload = await readJson<ApiList<AnimeItem>>("/anime/ongoing");
  return payload?.data ?? [];
}

export async function getAnimeSchedule() {
  const payload = await readJson<ApiList<AnimeScheduleDay>>("/anime/jadwal");
  return payload?.data ?? [];
}

export async function getAnimeList() {
  const payload = await readJson<AnimeListMap>("/anime/anime-list", 3600);
  return payload ?? {};
}

export async function searchAnime(query: string, page = 1) {
  if (!query.trim()) return [];
  const payload = await readJson<SearchPayload>(`/anime/search?query=${encodeURIComponent(query)}&page=${page}`);
  return payload?.data?.[0]?.result ?? [];
}

function withTrailingSlash(value: string) {
  const clean = cleanAnimeSlug(value);
  return clean.endsWith("/") ? clean : `${clean}/`;
}

export async function getAnimeDetail(series: string) {
  const clean = cleanAnimeSlug(series);
  const attempts = [clean, withTrailingSlash(clean)];
  for (const candidate of attempts) {
    const payload = await readJson<ApiList<AnimeDetail>>(`/anime/detail?series=${encodeURIComponent(candidate)}`);
    const detail = payload?.data?.[0];
    if (detail) return detail;
  }
  return null;
}

export async function getAnimeStream(slug: string, series?: string, episode?: string | number) {
  const slugAttempts = [cleanAnimeSlug(slug), withTrailingSlash(slug)];
  const seriesAttempts = series ? [cleanAnimeSlug(series), withTrailingSlash(series)] : [undefined];
  for (const streamSlug of slugAttempts) {
    for (const streamSeries of seriesAttempts) {
      const params = new URLSearchParams({ slug: streamSlug });
      if (streamSeries) params.set("series", streamSeries);
      if (episode) params.set("episode", String(episode));
      const payload = await readJson<StreamPayload>(`/anime/stream?${params}`, 60);
      const stream = payload?.data?.[0];
      if (stream) return stream;
    }
  }
  return null;
}
